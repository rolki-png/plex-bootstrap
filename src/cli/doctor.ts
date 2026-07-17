import { access, constants } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { runDoctor, type DoctorReport } from "../doctor/index.js";

const execFileAsync = promisify(execFile);

async function which(cmd: string): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync("which", [cmd]);
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

async function exec(cmd: string): Promise<{ code: number; stdout: string; stderr: string }> {
  try {
    const { stdout, stderr } = await execFileAsync("sh", ["-c", cmd], {
      encoding: "utf8",
    });
    return { code: 0, stdout, stderr };
  } catch (err) {
    const e = err as { code?: number; stdout?: string; stderr?: string };
    return {
      code: e.code ?? 1,
      stdout: e.stdout ?? "",
      stderr: e.stderr ?? String(err),
    };
  }
}

async function canWrite(path: string): Promise<boolean> {
  try {
    await access(path, constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

export function createDoctorDeps(dataRoot: string) {
  return { which, exec, canWrite, dataRoot };
}

export async function runDoctorForDataRoot(dataRoot: string): Promise<DoctorReport> {
  return runDoctor(createDoctorDeps(dataRoot));
}

export function printDoctorReport(report: DoctorReport): void {
  for (const check of report.checks) {
    const status = check.ok ? "ok" : "FAIL";
    console.log(`[${status}] ${check.name}: ${check.detail}`);
  }
}

export async function doctorCommand(dataRoot: string): Promise<number> {
  const report = await runDoctorForDataRoot(dataRoot);
  printDoctorReport(report);
  return report.ok ? 0 : 1;
}
