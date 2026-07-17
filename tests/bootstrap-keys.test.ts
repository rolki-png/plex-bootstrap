import { describe, expect, it } from "vitest";
import { defaultStackConfig } from "../src/types.ts";
import { bootstrapApiKeys } from "../src/wire/bootstrapKeys.ts";
import type { WireState } from "../src/wire/state.ts";

function makeConfig() {
  return defaultStackConfig({
    dataRoot: "/data",
    configRoot: "/config",
    puid: 1000,
    pgid: 1000,
    timezone: "UTC",
  });
}

function emptyState(): WireState {
  return { apiKeys: {}, completedSteps: [], failedSteps: [] };
}

const ARR_XML = (key: string) =>
  `<?xml version="1.0" encoding="utf-8"?>\n<Config>\n  <ApiKey>${key}</ApiKey>\n  <Port>8989</Port>\n</Config>\n`;

const PLEX_PREFS = (token: string) =>
  `<?xml version="1.0" encoding="utf-8"?>\n<Preferences MachineIdentifier="abc" PlexOnlineToken="${token}" />\n`;

const SEERR_SETTINGS = (key: string) => JSON.stringify({ main: { apiKey: key } });

describe("bootstrapApiKeys", () => {
  it("reads sonarr, radarr, prowlarr API keys from config.xml", async () => {
    const state = emptyState();
    const files: Record<string, string> = {
      "/config/sonarr/config.xml": ARR_XML("SONARR_KEY"),
      "/config/radarr/config.xml": ARR_XML("RADARR_KEY"),
      "/config/prowlarr/config.xml": ARR_XML("PROWLARR_KEY"),
    };

    const result = await bootstrapApiKeys(makeConfig(), state, {
      readFile: async (path) => {
        const content = files[path];
        if (content === undefined) {
          throw Object.assign(new Error("not found"), { code: "ENOENT" });
        }
        return content;
      },
    });

    expect(state.apiKeys.sonarr).toBe("SONARR_KEY");
    expect(state.apiKeys.radarr).toBe("RADARR_KEY");
    expect(state.apiKeys.prowlarr).toBe("PROWLARR_KEY");
    expect(result.found).toEqual(expect.arrayContaining(["sonarr", "radarr", "prowlarr"]));
  });

  it("reads seerr API key from settings.json when present", async () => {
    const state = emptyState();
    const files: Record<string, string> = {
      "/config/seerr/settings.json": SEERR_SETTINGS("SEERR_KEY"),
    };

    await bootstrapApiKeys(makeConfig(), state, {
      readFile: async (path) => {
        const content = files[path];
        if (content === undefined) {
          throw Object.assign(new Error("not found"), { code: "ENOENT" });
        }
        return content;
      },
    });

    expect(state.apiKeys.seerr).toBe("SEERR_KEY");
  });

  it("reads plex token from Preferences.xml when state has none", async () => {
    const state = emptyState();
    const files: Record<string, string> = {
      "/config/plex/Library/Application Support/Plex Media Server/Preferences.xml":
        PLEX_PREFS("PLEX_TOKEN"),
    };

    await bootstrapApiKeys(makeConfig(), state, {
      readFile: async (path) => {
        const content = files[path];
        if (content === undefined) {
          throw Object.assign(new Error("not found"), { code: "ENOENT" });
        }
        return content;
      },
    });

    expect(state.apiKeys.plex).toBe("PLEX_TOKEN");
  });

  it("keeps existing plex token from state instead of reading it", async () => {
    const state = emptyState();
    state.apiKeys.plex = "EXISTING_TOKEN";

    await bootstrapApiKeys(makeConfig(), state, {
      readFile: async () => PLEX_PREFS("SHOULD_NOT_BE_USED"),
    });

    expect(state.apiKeys.plex).toBe("EXISTING_TOKEN");
  });

  it("stores the configured qbittorrent WebUI password in state", async () => {
    const state = emptyState();
    const config = makeConfig();
    config.qbittorrentPassword = "s3cret";

    await bootstrapApiKeys(config, state, {
      readFile: async () => {
        throw Object.assign(new Error("not found"), { code: "ENOENT" });
      },
    });

    expect(state.apiKeys.qbittorrent).toBe("s3cret");
  });

  it("records missing keys without throwing when files are absent", async () => {
    const state = emptyState();

    const result = await bootstrapApiKeys(makeConfig(), state, {
      readFile: async () => {
        throw Object.assign(new Error("not found"), { code: "ENOENT" });
      },
    });

    expect(state.apiKeys.sonarr).toBeUndefined();
    expect(result.missing).toEqual(expect.arrayContaining(["sonarr", "radarr", "prowlarr", "seerr"]));
  });

  it("only reads keys for enabled services", async () => {
    const state = emptyState();
    const config = makeConfig();
    config.services.prowlarr = false;
    config.services.seerr = false;

    const requested: string[] = [];
    await bootstrapApiKeys(config, state, {
      readFile: async (path) => {
        requested.push(path);
        throw Object.assign(new Error("not found"), { code: "ENOENT" });
      },
    });

    expect(requested.some((p) => p.includes("/prowlarr/"))).toBe(false);
    expect(requested.some((p) => p.includes("/seerr/"))).toBe(false);
    expect(requested.some((p) => p.includes("/sonarr/"))).toBe(true);
  });
});
