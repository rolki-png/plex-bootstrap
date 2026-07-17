import { describe, expect, it } from "vitest";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { parse as parseYaml } from "yaml";
import { defaultStackConfig } from "../src/types.ts";
import { generateStack } from "../src/generate/index.ts";

async function gen(services: Partial<ReturnType<typeof defaultStackConfig>["services"]>, vpn?: object) {
  const outDir = await mkdtemp(join(tmpdir(), "pb-snap-"));
  const cfg = defaultStackConfig({
    dataRoot: "/data",
    configRoot: "/data/configs",
    puid: 1000,
    pgid: 1000,
    timezone: "UTC",
  });
  Object.assign(cfg.services, services);
  if (vpn) cfg.vpn = vpn as never;
  const result = await generateStack(cfg, outDir);
  const doc = parseYaml(await readFile(result.composePath, "utf8")) as {
    services: Record<string, { network_mode?: string; networks?: string[] }>;
  };
  return { doc, result };
}

function dockerAvailable(): boolean {
  const r = spawnSync("docker", ["info"], { stdio: "ignore" });
  return r.status === 0;
}

describe("generateStack extras", () => {
  it("includes jackett flaresolverr unpackerr bazarr tautulli recyclarr when enabled", async () => {
    const { doc } = await gen({
      jackett: true,
      flaresolverr: true,
      unpackerr: true,
      bazarr: true,
      tautulli: true,
      recyclarr: true,
    });
    for (const name of ["jackett", "flaresolverr", "unpackerr", "bazarr", "tautulli", "recyclarr"]) {
      expect(doc.services).toHaveProperty(name);
    }
  });

  it("wraps qbittorrent with gluetun when vpn enabled", async () => {
    const { doc } = await gen(
      { vpn: true },
      { provider: "protonvpn", username: "u", password: "p" },
    );
    expect(doc.services).toHaveProperty("gluetun");
    expect(doc.services.qbittorrent.network_mode).toBe("service:gluetun");
  });

  it("generated core compose passes docker compose config", async () => {
    if (!dockerAvailable()) return;

    const outDir = await mkdtemp(join(tmpdir(), "pb-dc-"));
    const cfg = defaultStackConfig({
      dataRoot: "/data",
      configRoot: "/data/configs",
      puid: 1000,
      pgid: 1000,
      timezone: "UTC",
    });
    const result = await generateStack(cfg, outDir);
    const r = spawnSync(
      "docker",
      ["compose", "-f", result.composePath, "--env-file", result.envPath, "config"],
      { encoding: "utf8" },
    );
    expect(r.status, r.stderr).toBe(0);
  });
});
