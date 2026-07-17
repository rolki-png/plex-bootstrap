import { describe, expect, it, vi } from "vitest";
import { defaultStackConfig } from "../src/types.ts";
import { wireSeerr } from "../src/wire/steps/seerr.ts";
import type { WireContext } from "../src/wire/types.ts";

function makeCtx(fetchFn: typeof fetch, plexToken?: string): WireContext {
  const base = defaultStackConfig({
    dataRoot: "/data",
    configRoot: "/config",
    puid: 1000,
    pgid: 1000,
    timezone: "UTC",
  });

  return {
    config: {
      ...base,
      plexClaim: "claim-token",
    },
    state: {
      apiKeys: {
        seerr: "seerr-key",
        sonarr: "sonarr-key",
        radarr: "radarr-key",
        ...(plexToken ? { plex: plexToken } : {}),
      },
      completedSteps: [],
      failedSteps: [],
    },
    baseUrls: {
      seerr: "http://seerr:5055",
      plex: "http://plex:32400",
      sonarr: "http://sonarr:8989",
      radarr: "http://radarr:7878",
    },
    fetchFn,
  };
}

describe("wireSeerr", () => {
  it("connects Plex and creates Sonarr and Radarr instances", async () => {
    const mockFetch = vi.fn();

    mockFetch
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ name: "", machineId: "", ip: "", port: 32400, useSsl: false }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            profiles: [{ id: 1, name: "HD-1080p" }],
            rootFolders: [{ id: 1, path: "/data/media/tv" }],
            languageProfiles: [{ id: 1, name: "English" }],
            tags: [],
            urlBase: "",
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 0, name: "Sonarr", isDefault: true }), { status: 201 }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            profiles: [{ id: 1, name: "HD-1080p" }],
            rootFolders: [{ id: 1, path: "/data/media/movies" }],
            tags: [],
            urlBase: "",
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 0, name: "Radarr", isDefault: true }), { status: 201 }),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 1 }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            name: "Plex",
            machineId: "abc123",
            ip: "plex",
            port: 32400,
            useSsl: false,
          }),
          { status: 200 },
        ),
      );

    const result = await wireSeerr(makeCtx(mockFetch as unknown as typeof fetch, "plex-auth-token"));

    expect(result).toEqual({
      name: "seerr",
      ok: true,
      detail: "plex, sonarr, and radarr configured",
    });

    expect(mockFetch).toHaveBeenCalledTimes(9);

    const [sonarrListUrl, sonarrListInit] = mockFetch.mock.calls[0]!;
    expect(sonarrListUrl).toBe("http://seerr:5055/api/v1/settings/sonarr");
    const sonarrListHeaders = sonarrListInit?.headers as Headers;
    expect(sonarrListHeaders.get("X-Api-Key")).toBe("seerr-key");

    const [sonarrTestUrl, sonarrTestInit] = mockFetch.mock.calls[3]!;
    expect(sonarrTestUrl).toBe("http://seerr:5055/api/v1/settings/sonarr/test");
    expect(sonarrTestInit?.method).toBe("POST");
    const sonarrTestBody = JSON.parse(sonarrTestInit?.body as string);
    expect(sonarrTestBody.hostname).toBe("sonarr");
    expect(sonarrTestBody.port).toBe(8989);
    expect(sonarrTestBody.apiKey).toBe("sonarr-key");

    const [sonarrCreateUrl, sonarrCreateInit] = mockFetch.mock.calls[4]!;
    expect(sonarrCreateUrl).toBe("http://seerr:5055/api/v1/settings/sonarr");
    expect(sonarrCreateInit?.method).toBe("POST");
    const sonarrBody = JSON.parse(sonarrCreateInit?.body as string);
    expect(sonarrBody.name).toBe("Sonarr");
    expect(sonarrBody.hostname).toBe("sonarr");
    expect(sonarrBody.apiKey).toBe("sonarr-key");
    expect(sonarrBody.activeDirectory).toBe("/data/media/tv");
    expect(sonarrBody.isDefault).toBe(true);

    const [, radarrCreateInit] = mockFetch.mock.calls[6]!;

    const [authUrl, authInit] = mockFetch.mock.calls[7]!;
    expect(authUrl).toBe("http://seerr:5055/api/v1/auth/plex");
    expect(authInit?.method).toBe("POST");
    expect(JSON.parse(authInit?.body as string)).toEqual({ authToken: "plex-auth-token" });
    const radarrBody = JSON.parse(radarrCreateInit?.body as string);
    expect(radarrBody.name).toBe("Radarr");
    expect(radarrBody.hostname).toBe("radarr");
    expect(radarrBody.activeDirectory).toBe("/data/media/movies");

    const [plexUrl, plexInit] = mockFetch.mock.calls[8]!;
    expect(plexUrl).toBe("http://seerr:5055/api/v1/settings/plex");
    expect(plexInit?.method).toBe("POST");
    expect(JSON.parse(plexInit?.body as string)).toEqual({
      ip: "plex",
      port: 32400,
      useSsl: false,
    });
  });

  it("is idempotent when plex, sonarr, and radarr already exist", async () => {
    const mockFetch = vi.fn();

    mockFetch
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              id: 0,
              name: "Sonarr",
              hostname: "sonarr",
              port: 8989,
              apiKey: "sonarr-key",
              useSsl: false,
              baseUrl: "",
              activeProfileId: 1,
              activeProfileName: "HD-1080p",
              activeDirectory: "/data/media/tv",
              activeLanguageProfileId: 1,
              is4k: false,
              isDefault: true,
              enableSeasonFolders: false,
            },
          ]),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              id: 0,
              name: "Radarr",
              hostname: "radarr",
              port: 7878,
              apiKey: "radarr-key",
              useSsl: false,
              baseUrl: "",
              activeProfileId: 1,
              activeProfileName: "HD-1080p",
              activeDirectory: "/data/media/movies",
              minimumAvailability: "released",
              is4k: false,
              isDefault: true,
            },
          ]),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            name: "Plex",
            machineId: "abc123",
            ip: "plex",
            port: 32400,
            useSsl: false,
          }),
          { status: 200 },
        ),
      );

    const result = await wireSeerr(makeCtx(mockFetch as unknown as typeof fetch));

    expect(result).toEqual({
      name: "seerr",
      ok: true,
      detail: "plex, sonarr, and radarr configured",
    });
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it("returns fallback with Seerr UI URL on failure", async () => {
    const mockFetch = vi.fn();

    mockFetch
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ name: "", machineId: "", ip: "", port: 32400, useSsl: false }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response("error", { status: 500, statusText: "Internal Server Error" }),
      );

    const result = await wireSeerr(makeCtx(mockFetch as unknown as typeof fetch));

    expect(result.ok).toBe(false);
    expect(result.name).toBe("seerr");
    expect(result.fallback).toContain("http://localhost:5055");
    expect(result.fallback).toContain("Plex");
    expect(result.fallback).toContain("Sonarr");
    expect(result.fallback).toContain("Radarr");
  });
});
