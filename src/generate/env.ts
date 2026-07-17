import type { StackConfig } from "../types.js";

export function renderEnv(config: StackConfig): string {
  return [
    `PUID=${config.puid}`,
    `PGID=${config.pgid}`,
    `TZ=${config.timezone}`,
    `DATA_ROOT=${config.dataRoot}`,
    `CONFIG_ROOT=${config.configRoot}`,
    `PLEX_CLAIM=${config.plexClaim ?? ""}`,
    `WEBUI_PASSWORD=${config.qbittorrentPassword}`,
  ].join("\n") + "\n";
}
