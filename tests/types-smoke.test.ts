import { describe, expect, it } from "vitest";
import { defaultStackConfig, isCoreComplete } from "../src/types.ts";

describe("StackConfig", () => {
  it("defaultStackConfig enables all core services and no extras", () => {
    const cfg = defaultStackConfig({
      dataRoot: "/data",
      configRoot: "/data/configs",
      puid: 1000,
      pgid: 1000,
      timezone: "UTC",
    });
    expect(cfg.services.plex).toBe(true);
    expect(cfg.services.seerr).toBe(true);
    expect(cfg.services.sonarr).toBe(true);
    expect(cfg.services.radarr).toBe(true);
    expect(cfg.services.prowlarr).toBe(true);
    expect(cfg.services.qbittorrent).toBe(true);
    expect(cfg.services.jackett).toBe(false);
    expect(cfg.services.vpn).toBe(false);
    expect(isCoreComplete(cfg)).toBe(true);
  });
});
