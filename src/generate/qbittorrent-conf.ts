import { pbkdf2Sync, randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { StackConfig } from "../types.js";

const ITERATIONS = 100000;
const SALT_BYTES = 16;
const KEY_BYTES = 64;

export function hashQbittorrentPassword(password: string, salt: Buffer = randomBytes(SALT_BYTES)): string {
  const key = pbkdf2Sync(password, salt, ITERATIONS, KEY_BYTES, "sha512");
  return `@ByteArray(${salt.toString("base64")}:${key.toString("base64")})`;
}

export function renderQbittorrentConf(password: string): string {
  return [
    "[Preferences]",
    "WebUI\\Username=admin",
    `WebUI\\Password_PBKDF2="${hashQbittorrentPassword(password)}"`,
    "",
  ].join("\n");
}

/**
 * Seeds the qBittorrent WebUI credentials before first start. The linuxserver
 * image ignores WEBUI_PASSWORD, so without this it uses a random temporary
 * password. An existing file is never overwritten, so later changes are kept.
 */
export async function seedQbittorrentConf(config: StackConfig): Promise<string | null> {
  if (!config.services.qbittorrent) return null;

  const dir = join(config.configRoot, "qbittorrent", "qBittorrent");
  const path = join(dir, "qBittorrent.conf");
  await mkdir(dir, { recursive: true });

  try {
    await writeFile(path, renderQbittorrentConf(config.qbittorrentPassword), { encoding: "utf8", flag: "wx" });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "EEXIST") return null;
    throw err;
  }
  return path;
}
