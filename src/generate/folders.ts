import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import type { ServiceFlags, StackConfig } from "../types.ts";

const MEDIA_PATHS = ["media/movies", "media/tv", "torrents/movies", "torrents/tv"] as const;

const CONFIG_APPS: (keyof ServiceFlags)[] = [
  "plex",
  "seerr",
  "sonarr",
  "radarr",
  "prowlarr",
  "qbittorrent",
  "jackett",
  "unpackerr",
  "bazarr",
  "tautulli",
  "recyclarr",
];

export async function ensureFolderSkeleton(config: StackConfig): Promise<string[]> {
  const created: string[] = [];

  for (const rel of MEDIA_PATHS) {
    const dir = join(config.dataRoot, rel);
    await mkdir(dir, { recursive: true });
    created.push(dir);
  }

  for (const app of CONFIG_APPS) {
    if (!config.services[app]) continue;
    const dir = join(config.configRoot, app);
    await mkdir(dir, { recursive: true });
    created.push(dir);
  }

  return created;
}
