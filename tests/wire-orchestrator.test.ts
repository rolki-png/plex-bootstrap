import { beforeEach, describe, expect, it, vi } from "vitest";
import { defaultStackConfig } from "../src/types.ts";
import type { WireContext } from "../src/wire/types.ts";

vi.mock("../src/wire/steps/qbittorrent.ts", () => ({ wireQbittorrent: vi.fn() }));
vi.mock("../src/wire/steps/sonarr.ts", () => ({ wireSonarr: vi.fn() }));
vi.mock("../src/wire/steps/radarr.ts", () => ({ wireRadarr: vi.fn() }));
vi.mock("../src/wire/steps/prowlarr.ts", () => ({ wireProwlarr: vi.fn() }));
vi.mock("../src/wire/steps/seerr.ts", () => ({ wireSeerr: vi.fn() }));
vi.mock("../src/wire/steps/extras.ts", () => ({ wireExtras: vi.fn() }));

import { runWire } from "../src/wire/index.ts";
import { wireQbittorrent } from "../src/wire/steps/qbittorrent.ts";
import { wireSonarr } from "../src/wire/steps/sonarr.ts";
import { wireRadarr } from "../src/wire/steps/radarr.ts";
import { wireProwlarr } from "../src/wire/steps/prowlarr.ts";
import { wireSeerr } from "../src/wire/steps/seerr.ts";
import { wireExtras } from "../src/wire/steps/extras.ts";

function makeCtx(overrides: Partial<WireContext> = {}): WireContext {
  return {
    config: defaultStackConfig({
      dataRoot: "/data",
      configRoot: "/config",
      puid: 1000,
      pgid: 1000,
      timezone: "UTC",
    }),
    state: { apiKeys: {}, completedSteps: [], failedSteps: [] },
    baseUrls: {},
    ...overrides,
  };
}

function ok(name: string) {
  return { name, ok: true, detail: `${name} ok` };
}

describe("runWire", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(wireQbittorrent).mockResolvedValue(ok("qbittorrent"));
    vi.mocked(wireSonarr).mockResolvedValue(ok("sonarr"));
    vi.mocked(wireRadarr).mockResolvedValue(ok("radarr"));
    vi.mocked(wireProwlarr).mockResolvedValue(ok("prowlarr"));
    vi.mocked(wireSeerr).mockResolvedValue(ok("seerr"));
    vi.mocked(wireExtras).mockResolvedValue([]);
  });

  it("continues after a non-core step failure and records failedSteps", async () => {
    vi.mocked(wireProwlarr).mockResolvedValue({
      name: "prowlarr",
      ok: false,
      detail: "prowlarr indexer sync failed",
    });

    const ctx = makeCtx();
    const report = await runWire(ctx);

    expect(report.ok).toBe(false);
    expect(report.coreOk).toBe(true);
    expect(ctx.state.failedSteps).toEqual(["prowlarr"]);
    expect(ctx.state.completedSteps).toEqual(
      expect.arrayContaining(["qbittorrent", "sonarr", "radarr", "seerr"]),
    );
    expect(wireSeerr).toHaveBeenCalled();
    expect(wireExtras).toHaveBeenCalled();
  });

  it("retryFailedOnly re-runs only failed steps", async () => {
    const ctx = makeCtx({
      state: {
        apiKeys: {},
        completedSteps: ["qbittorrent", "sonarr", "radarr", "seerr"],
        failedSteps: ["prowlarr"],
      },
    });

    vi.mocked(wireProwlarr).mockResolvedValue(ok("prowlarr"));

    const report = await runWire(ctx, { retryFailedOnly: true });

    expect(wireQbittorrent).not.toHaveBeenCalled();
    expect(wireSonarr).not.toHaveBeenCalled();
    expect(wireRadarr).not.toHaveBeenCalled();
    expect(wireProwlarr).toHaveBeenCalledOnce();
    expect(wireSeerr).not.toHaveBeenCalled();
    expect(wireExtras).not.toHaveBeenCalled();
    expect(ctx.state.failedSteps).toEqual([]);
    expect(ctx.state.completedSteps).toContain("prowlarr");
    expect(report.ok).toBe(true);
    expect(report.coreOk).toBe(true);
    expect(report.steps).toHaveLength(1);
    expect(report.steps[0]!.name).toBe("prowlarr");
  });

  it("sets coreOk false when sonarr download client step fails", async () => {
    vi.mocked(wireSonarr).mockResolvedValue({
      name: "sonarr",
      ok: false,
      detail: "download client failed",
    });

    const ctx = makeCtx();
    const report = await runWire(ctx);

    expect(report.coreOk).toBe(false);
    expect(report.ok).toBe(false);
    expect(ctx.state.failedSteps).toContain("sonarr");
    expect(wireRadarr).toHaveBeenCalled();
    expect(wireProwlarr).toHaveBeenCalled();
    expect(wireSeerr).toHaveBeenCalled();
  });
});
