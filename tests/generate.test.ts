import { describe, expect, it } from "vitest";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import { defaultStackConfig } from "../src/types.ts";
import { generateStack } from "../src/generate/index.ts";

describe("generateStack core", () => {
  it("writes compose with plex seerr sonarr radarr prowlarr qbittorrent and shared /data mounts", async () => {
    const outDir = await mkdtemp(join(tmpdir(), "pb-gen-"));
    const dataRoot = await mkdtemp(join(tmpdir(), "pb-data-"));
    const cfg = defaultStackConfig({
      dataRoot,
      configRoot: join(dataRoot, "configs"),
      puid: 1000,
      pgid: 1000,
      timezone: "Europe/Budapest",
    });
    const result = await generateStack(cfg, outDir);
    const raw = await readFile(result.composePath, "utf8");
    const doc = parseYaml(raw) as { services: Record<string, unknown>; networks: Record<string, unknown> };

    expect(Object.keys(doc.services).sort()).toEqual(
      ["plex", "prowlarr", "qbittorrent", "radarr", "seerr", "sonarr"].sort(),
    );
    expect(doc.networks).toHaveProperty("media");
    expect(doc.networks).toHaveProperty("download");
    expect(result.services).toEqual(expect.arrayContaining(["plex", "sonarr"]));

    const env = await readFile(result.envPath, "utf8");
    expect(env).toContain("PUID=1000");
    expect(env).toContain("TZ=Europe/Budapest");
    expect(env).toContain(`DATA_ROOT=${dataRoot}`);
  });

  it("creates hardlink-safe folder skeleton under dataRoot", async () => {
    const outDir = await mkdtemp(join(tmpdir(), "pb-gen-"));
    const dataRoot = await mkdtemp(join(tmpdir(), "pb-data-"));
    const cfg = defaultStackConfig({
      dataRoot,
      configRoot: join(dataRoot, "configs"),
      puid: 1000,
      pgid: 1000,
      timezone: "UTC",
    });
    await generateStack(cfg, outDir);
    const { access } = await import("node:fs/promises");
    for (const p of [
      join(dataRoot, "media/movies"),
      join(dataRoot, "media/tv"),
      join(dataRoot, "torrents/movies"),
      join(dataRoot, "torrents/tv"),
      join(dataRoot, "configs/sonarr"),
    ]) {
      await access(p);
    }
  });
});
