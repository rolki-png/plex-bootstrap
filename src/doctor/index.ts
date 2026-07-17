import type { DoctorCheck, DoctorDeps } from "./checks.js";

export type DoctorReport = { ok: boolean; checks: DoctorCheck[] };

function isComposeVersionOk(stdout: string): boolean {
  if (/version/i.test(stdout)) {
    return true;
  }
  if (/v2\./i.test(stdout)) {
    return true;
  }
  const major = stdout.match(/\bv(\d+)\./i)?.[1];
  return major !== undefined && Number(major) >= 2;
}

export async function runDoctor(deps: DoctorDeps): Promise<DoctorReport> {
  const checks: DoctorCheck[] = [];

  const dockerPath = await deps.which("docker");
  checks.push({
    name: "docker",
    ok: Boolean(dockerPath),
    detail: dockerPath ? `found at ${dockerPath}` : "docker not found on PATH",
  });

  const compose = await deps.exec("docker compose version");
  checks.push({
    name: "compose",
    ok: compose.code === 0 && isComposeVersionOk(compose.stdout),
    detail: compose.stdout.trim() || compose.stderr.trim() || "compose v2+ required",
  });

  const info = await deps.exec("docker info");
  checks.push({
    name: "docker-daemon",
    ok: info.code === 0,
    detail: info.code === 0 ? "daemon reachable" : info.stderr || "cannot reach docker daemon",
  });

  const writable = await deps.canWrite(deps.dataRoot);
  checks.push({
    name: "data-root-writable",
    ok: writable,
    detail: writable ? `${deps.dataRoot} writable` : `${deps.dataRoot} not writable`,
  });

  return { ok: checks.every((c) => c.ok), checks };
}
