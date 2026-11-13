import { describe, expect, it } from "vitest";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import { defaultStackConfig } from "../src/types.ts";
import { generateStack } from "../src/generate/index.ts";

async function gen(services: Partial<ReturnType<typeof defaultStackConfig>["services"]>, vpn?: object) {
  const outDir = await mkdtemp(join(tmpdir(), "pb-snap-"));
  const dataRoot = await mkdtemp(join(tmpdir(), "pb-data-"));
  const cfg = defaultStackConfig({
    dataRoot,
    configRoot: join(dataRoot, "configs"),
    puid: 1000,
    pgid: 1000,
    timezone: "UTC",
  });
  Object.assign(cfg.services, services);
  if (vpn) cfg.vpn = vpn as never;
  const result = await generateStack(cfg, outDir);
  const doc = parseYaml(await readFile(result.composePath, "utf8")) as {
    services: Record<string, { network_mode?: string; networks?: string[]; volumes?: string[]; user?: string }>;
  };
  return { doc, result };
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

  it("mounts /data into unpackerr and runs it as the stack user", async () => {
    const { doc } = await gen({ unpackerr: true });
    const svc = doc.services.unpackerr;
    expect(svc.volumes).toContain("${DATA_ROOT}:/data");
    expect(svc.volumes).toContain("${CONFIG_ROOT}/unpackerr:/config");
    expect(svc.user).toBe("${PUID}:${PGID}");
  });

  it("wraps qbittorrent with gluetun when vpn enabled", async () => {
    const { doc } = await gen(
      { vpn: true },
      { provider: "protonvpn", username: "u", password: "p" },
    );
    expect(doc.services).toHaveProperty("gluetun");
    expect(doc.services.qbittorrent.network_mode).toBe("service:gluetun");
  });
});
