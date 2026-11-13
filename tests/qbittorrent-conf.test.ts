import { pbkdf2Sync } from "node:crypto";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { seedQbittorrentConf } from "../src/generate/qbittorrent-conf.ts";
import { defaultStackConfig } from "../src/types.ts";

async function makeCfg() {
  const cfg = defaultStackConfig({
    dataRoot: await mkdtemp(join(tmpdir(), "pb-data-")),
    configRoot: await mkdtemp(join(tmpdir(), "pb-conf-")),
    puid: 1000,
    pgid: 1000,
    timezone: "UTC",
  });
  cfg.qbittorrentPassword = "correct horse";
  return cfg;
}

describe("seedQbittorrentConf", () => {
  it("writes a hash that verifies against the configured password", async () => {
    const cfg = await makeCfg();
    const path = await seedQbittorrentConf(cfg);
    expect(path).toBe(join(cfg.configRoot, "qbittorrent", "qBittorrent", "qBittorrent.conf"));

    const conf = await readFile(path!, "utf8");
    expect(conf).toContain("WebUI\\Username=admin");
    const match = conf.match(/WebUI\\Password_PBKDF2="@ByteArray\(([^:]+):([^)]+)\)"/);
    expect(match).not.toBeNull();
    const salt = Buffer.from(match![1]!, "base64");
    expect(salt).toHaveLength(16);
    const key = pbkdf2Sync("correct horse", salt, 100000, 64, "sha512");
    expect(key.toString("base64")).toBe(match![2]);
    expect(pbkdf2Sync("wrong", salt, 100000, 64, "sha512").toString("base64")).not.toBe(match![2]);
  });

  it("does not overwrite an existing file", async () => {
    const cfg = await makeCfg();
    const path = (await seedQbittorrentConf(cfg))!;
    await writeFile(path, "user edited", "utf8");
    expect(await seedQbittorrentConf(cfg)).toBeNull();
    expect(await readFile(path, "utf8")).toBe("user edited");
  });
});
