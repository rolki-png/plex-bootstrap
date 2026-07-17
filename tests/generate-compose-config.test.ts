import { describe, expect, it } from "vitest";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { defaultStackConfig } from "../src/types.ts";
import { generateStack } from "../src/generate/index.ts";

function dockerAvailable(): boolean {
  const r = spawnSync("docker", ["info"], { stdio: "ignore" });
  return r.status === 0;
}

async function assertComposeConfig(
  services: Partial<ReturnType<typeof defaultStackConfig>["services"]>,
  vpn?: { provider: string; username: string; password: string },
): Promise<void> {
  const outDir = await mkdtemp(join(tmpdir(), "pb-dc-"));
  const dataRoot = await mkdtemp(join(tmpdir(), "pb-data-"));
  const cfg = defaultStackConfig({
    dataRoot,
    configRoot: join(dataRoot, "configs"),
    puid: 1000,
    pgid: 1000,
    timezone: "UTC",
  });
  Object.assign(cfg.services, services);
  if (vpn) cfg.vpn = vpn;

  const result = await generateStack(cfg, outDir);
  const r = spawnSync(
    "docker",
    ["compose", "-f", result.composePath, "--env-file", result.envPath, "config"],
    { encoding: "utf8" },
  );
  expect(r.status, r.stderr).toBe(0);
}

describe("generateStack docker compose config", () => {
  it.skipIf(!dockerAvailable())("core stack passes docker compose config", async () => {
    await assertComposeConfig({});
  });

  it.skipIf(!dockerAvailable())("core + VPN stack passes docker compose config", async () => {
    await assertComposeConfig(
      { vpn: true },
      { provider: "protonvpn", username: "test-user", password: "test-pass" },
    );
  });

  it.skipIf(!dockerAvailable())("core + all extras stack passes docker compose config", async () => {
    await assertComposeConfig({
      jackett: true,
      flaresolverr: true,
      unpackerr: true,
      bazarr: true,
      tautulli: true,
      recyclarr: true,
    });
  });
});
