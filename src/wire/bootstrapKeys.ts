import { readFile as fsReadFile } from "node:fs/promises";
import { join } from "node:path";
import type { StackConfig } from "../types.js";
import type { WireState } from "./state.js";

export type BootstrapKeysDeps = {
  /** Injectable file reader (utf8). Defaults to fs readFile. */
  readFile?: (path: string) => Promise<string>;
};

export type BootstrapKeysResult = {
  found: string[];
  missing: string[];
};

const ARR_APPS = ["sonarr", "radarr", "prowlarr"] as const;

const PLEX_PREFS_RELATIVE =
  "plex/Library/Application Support/Plex Media Server/Preferences.xml";

function isEnoent(err: unknown): boolean {
  return (err as NodeJS.ErrnoException | undefined)?.code === "ENOENT";
}

function parseApiKeyFromXml(xml: string): string | null {
  const match = xml.match(/<ApiKey>\s*([^<\s]+)\s*<\/ApiKey>/i);
  return match?.[1] ?? null;
}

function parsePlexToken(xml: string): string | null {
  const match = xml.match(/PlexOnlineToken="([^"]+)"/);
  return match?.[1] ?? null;
}

function parseSeerrApiKey(json: string): string | null {
  try {
    const parsed = JSON.parse(json) as { main?: { apiKey?: unknown } };
    const key = parsed.main?.apiKey;
    return typeof key === "string" && key.length > 0 ? key : null;
  } catch {
    return null;
  }
}

async function readOrNull(
  read: (path: string) => Promise<string>,
  path: string,
): Promise<string | null> {
  try {
    return await read(path);
  } catch (err) {
    if (isEnoent(err)) {
      return null;
    }
    throw err;
  }
}

/**
 * Reads each app's persisted API keys/tokens from its on-disk config and writes
 * them into WireState.apiKeys before wiring runs. Missing files are tolerated so
 * a partial first boot still records what it can. Returns which keys were found
 * versus still missing.
 */
export async function bootstrapApiKeys(
  config: StackConfig,
  state: WireState,
  deps: BootstrapKeysDeps = {},
): Promise<BootstrapKeysResult> {
  const read = deps.readFile ?? ((path: string) => fsReadFile(path, "utf8"));
  const found: string[] = [];
  const missing: string[] = [];

  const record = (name: string, key: string | null): void => {
    if (key) {
      state.apiKeys[name] = key;
      found.push(name);
    } else {
      missing.push(name);
    }
  };

  for (const app of ARR_APPS) {
    if (!config.services[app]) {
      continue;
    }
    const xml = await readOrNull(read, join(config.configRoot, app, "config.xml"));
    record(app, xml ? parseApiKeyFromXml(xml) : null);
  }

  if (config.services.seerr) {
    const json = await readOrNull(read, join(config.configRoot, "seerr", "settings.json"));
    record("seerr", json ? parseSeerrApiKey(json) : null);
  }

  if (config.services.plex) {
    if (state.apiKeys.plex) {
      found.push("plex");
    } else {
      const prefs = await readOrNull(read, join(config.configRoot, PLEX_PREFS_RELATIVE));
      record("plex", prefs ? parsePlexToken(prefs) : null);
    }
  }

  if (config.services.qbittorrent && !state.apiKeys.qbittorrent) {
    state.apiKeys.qbittorrent = config.qbittorrentPassword;
    found.push("qbittorrent");
  }

  return { found, missing };
}
