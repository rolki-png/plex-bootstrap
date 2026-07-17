import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defaultStackConfig } from "../src/types.ts";
import { wireExtras } from "../src/wire/steps/extras.ts";
import type { WireContext } from "../src/wire/types.ts";

function makeCtx(
  overrides: {
    services?: Partial<WireContext["config"]["services"]>;
    fetchFn?: typeof fetch;
    apiKeys?: Record<string, string>;
    baseUrls?: Record<string, string>;
    configRoot?: string;
  } = {},
): WireContext {
  const base = defaultStackConfig({
    dataRoot: "/data",
    configRoot: overrides.configRoot ?? "/config",
    puid: 1000,
    pgid: 1000,
    timezone: "UTC",
  });

  return {
    config: {
      ...base,
      services: {
        ...base.services,
        ...overrides.services,
      },
    },
    state: {
      apiKeys: {
        sonarr: "sonarr-key",
        radarr: "radarr-key",
        bazarr: "bazarr-key",
        tautulli: "tautulli-key",
        jackett: "jackett-key",
        plex: "plex-token",
        ...overrides.apiKeys,
      },
      completedSteps: [],
      failedSteps: [],
    },
    baseUrls: {
      sonarr: "http://sonarr:8989",
      radarr: "http://radarr:7878",
      plex: "http://plex:32400",
      bazarr: "http://bazarr:6767",
      tautulli: "http://tautulli:8181",
      jackett: "http://jackett:9117",
      ...overrides.baseUrls,
    },
    fetchFn: overrides.fetchFn,
  };
}

describe("wireExtras", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("runs only enabled optional services", async () => {
    const result = await wireExtras(
      makeCtx({
        services: { unpackerr: true, bazarr: false, tautulli: false, jackett: false },
      }),
    );

    expect(result).toHaveLength(1);
    expect(result[0]!.name).toBe("unpackerr");
  });

  it("writes unpackerr config with sonarr and radarr", async () => {
    const dir = await mkdtemp(join(tmpdir(), "pb-unpackerr-"));

    try {
      const result = await wireExtras(
        makeCtx({
          configRoot: dir,
          services: { unpackerr: true, bazarr: false, tautulli: false, jackett: false },
        }),
      );

      expect(result[0]).toEqual({
        name: "unpackerr",
        ok: true,
        detail: expect.stringContaining("unpackerr.conf"),
      });

      const conf = await readFile(join(dir, "unpackerr", "unpackerr.conf"), "utf8");
      expect(conf).toContain('url = "http://sonarr:8989"');
      expect(conf).toContain('api_key = "sonarr-key"');
      expect(conf).toContain('url = "http://radarr:7878"');
      expect(conf).toContain('api_key = "radarr-key"');
      expect(conf).toContain("[[sonarr]]");
      expect(conf).toContain("[[radarr]]");
    } finally {
      await rm(dir, { recursive: true });
    }
  });

  it("configures bazarr sonarr and radarr via form API", async () => {
    const mockFetch = vi.fn();

    mockFetch
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            sonarr: { ip: "", port: 8989, apikey: "" },
            radarr: { ip: "", port: 7878, apikey: "" },
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(new Response("", { status: 200 }))
      .mockResolvedValueOnce(new Response("", { status: 200 }));

    const result = await wireExtras(
      makeCtx({
        services: { unpackerr: false, bazarr: true, tautulli: false, jackett: false },
        fetchFn: mockFetch as unknown as typeof fetch,
      }),
    );

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      name: "bazarr",
      ok: true,
      detail: "sonarr and radarr configured",
    });
    expect(mockFetch).toHaveBeenCalledTimes(3);

    const [settingsUrl] = mockFetch.mock.calls[0]!;
    expect(settingsUrl).toContain("/api/system/settings");
    expect(settingsUrl).toContain("apikey=bazarr-key");

    const [, sonarrInit] = mockFetch.mock.calls[1]!;
    expect(sonarrInit?.method).toBe("POST");
    expect(sonarrInit?.headers).toMatchObject({
      "Content-Type": "application/x-www-form-urlencoded",
    });
    const sonarrBody = sonarrInit?.body as string;
    expect(sonarrBody).toContain("settings-sonarr-ip=sonarr");
    expect(sonarrBody).toContain("settings-sonarr-apikey=sonarr-key");
    expect(sonarrBody).toContain("settings-general-use_sonarr=true");
  });

  it("skips bazarr updates when sonarr and radarr already match", async () => {
    const mockFetch = vi.fn();

    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          sonarr: { ip: "sonarr", port: 8989, apikey: "sonarr-key" },
          radarr: { ip: "radarr", port: 7878, apikey: "radarr-key" },
        }),
        { status: 200 },
      ),
    );

    const result = await wireExtras(
      makeCtx({
        services: { unpackerr: false, bazarr: true, tautulli: false, jackett: false },
        fetchFn: mockFetch as unknown as typeof fetch,
      }),
    );

    expect(result[0]).toEqual({
      name: "bazarr",
      ok: true,
      detail: "sonarr and radarr already configured",
    });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("connects tautulli to plex when not yet configured", async () => {
    const mockFetch = vi.fn();

    mockFetch
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            pms_url: "",
            pms_ip: "",
            pms_port: 32400,
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ result: "success" }), { status: 200 }),
      );

    const result = await wireExtras(
      makeCtx({
        services: { unpackerr: false, bazarr: false, tautulli: true, jackett: false },
        fetchFn: mockFetch as unknown as typeof fetch,
      }),
    );

    expect(result[0]).toEqual({
      name: "tautulli",
      ok: true,
      detail: "plex server configured",
    });

    const [identityUrl] = mockFetch.mock.calls[0]!;
    expect(identityUrl).toContain("/api/v2");
    expect(identityUrl).toContain("cmd=get_server_identity");
    expect(identityUrl).toContain("apikey=tautulli-key");

    const [configUrl, configInit] = mockFetch.mock.calls[1]!;
    expect(configUrl).toBe("http://tautulli:8181/configUpdate");
    expect(configInit?.method).toBe("POST");
    const body = configInit?.body as string;
    expect(body).toContain("pms_ip=plex");
    expect(body).toContain("pms_port=32400");
    expect(body).toContain("pms_token=plex-token");
  });

  it("returns jackett torznab note without indexer sync", async () => {
    const result = await wireExtras(
      makeCtx({
        services: { unpackerr: false, bazarr: false, tautulli: false, jackett: true },
      }),
    );

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      name: "jackett",
      ok: true,
      detail: expect.stringContaining("torznab"),
      fallback: expect.stringContaining("http://jackett:9117/api/v2/indexers"),
    });
    expect(result[0]!.fallback).toContain("jackett-key");
  });
});
