import { describe, expect, it, vi } from "vitest";
import { defaultStackConfig } from "../src/types.ts";
import { wireProwlarr } from "../src/wire/steps/prowlarr.ts";
import type { WireContext } from "../src/wire/types.ts";

function makeCtx(fetchFn: typeof fetch, flaresolverr = false): WireContext {
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
      services: { ...base.services, flaresolverr },
    },
    state: {
      apiKeys: {
        prowlarr: "prowlarr-key",
        sonarr: "sonarr-key",
        radarr: "radarr-key",
      },
      completedSteps: [],
      failedSteps: [],
    },
    baseUrls: {
      prowlarr: "http://localhost:9696",
      sonarr: "http://localhost:8989",
      radarr: "http://localhost:7878",
    },
    internalUrls: {
      prowlarr: "http://prowlarr:9696",
      sonarr: "http://sonarr:8989",
      radarr: "http://radarr:7878",
    },
    fetchFn,
  };
}

describe("wireProwlarr", () => {
  it("adds Sonarr and Radarr applications", async () => {
    const mockFetch = vi.fn();

    mockFetch
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 1 }), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 2 }), { status: 201 }));

    const result = await wireProwlarr(makeCtx(mockFetch as unknown as typeof fetch));

    expect(result).toEqual({
      name: "prowlarr",
      ok: true,
      detail: "sonarr and radarr applications configured",
    });

    expect(mockFetch).toHaveBeenCalledTimes(3);

    const [appsListUrl, appsListInit] = mockFetch.mock.calls[0]!;
    expect(appsListUrl).toBe("http://localhost:9696/api/v1/applications");
    const appsListHeaders = appsListInit?.headers as Headers;
    expect(appsListHeaders.get("X-Api-Key")).toBe("prowlarr-key");

    const [sonarrUrl, sonarrInit] = mockFetch.mock.calls[1]!;
    expect(sonarrUrl).toBe("http://localhost:9696/api/v1/applications");
    expect(sonarrInit?.method).toBe("POST");
    const sonarrBody = JSON.parse(sonarrInit?.body as string);
    expect(sonarrBody.name).toBe("Sonarr");
    expect(sonarrBody.implementation).toBe("Sonarr");
    expect(sonarrBody.syncLevel).toBe("fullSync");
    expect(fieldValue(sonarrBody.fields, "prowlarrUrl")).toBe("http://prowlarr:9696");
    expect(fieldValue(sonarrBody.fields, "baseUrl")).toBe("http://sonarr:8989");
    expect(fieldValue(sonarrBody.fields, "apiKey")).toBe("sonarr-key");

    const [radarrUrl, radarrInit] = mockFetch.mock.calls[2]!;
    expect(radarrUrl).toBe("http://localhost:9696/api/v1/applications");
    expect(radarrInit?.method).toBe("POST");
    const radarrBody = JSON.parse(radarrInit?.body as string);
    expect(radarrBody.name).toBe("Radarr");
    expect(radarrBody.implementation).toBe("Radarr");
    expect(fieldValue(radarrBody.fields, "baseUrl")).toBe("http://radarr:7878");
    expect(fieldValue(radarrBody.fields, "apiKey")).toBe("radarr-key");
  });

  it("is idempotent when applications already exist", async () => {
    const mockFetch = vi.fn();

    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify([
          {
            id: 1,
            name: "Sonarr",
            syncLevel: "fullSync",
            implementation: "Sonarr",
            configContract: "SonarrSettings",
            fields: [
              { name: "prowlarrUrl", value: "http://prowlarr:9696" },
              { name: "baseUrl", value: "http://sonarr:8989" },
              { name: "apiKey", value: "sonarr-key" },
              { name: "syncCategories", value: [5000] },
            ],
            tags: [],
          },
          {
            id: 2,
            name: "Radarr",
            syncLevel: "fullSync",
            implementation: "Radarr",
            configContract: "RadarrSettings",
            fields: [
              { name: "prowlarrUrl", value: "http://prowlarr:9696" },
              { name: "baseUrl", value: "http://radarr:7878" },
              { name: "apiKey", value: "radarr-key" },
              { name: "syncCategories", value: [2000] },
            ],
            tags: [],
          },
        ]),
        { status: 200 },
      ),
    );

    const result = await wireProwlarr(makeCtx(mockFetch as unknown as typeof fetch));

    expect(result).toEqual({
      name: "prowlarr",
      ok: true,
      detail: "sonarr and radarr applications configured",
    });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("ensures FlareSolverr indexer proxy with tag when enabled", async () => {
    const mockFetch = vi.fn();

    mockFetch
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 1 }), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 2 }), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 1, label: "flaresolverr" }), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 1 }), { status: 201 }));

    const result = await wireProwlarr(makeCtx(mockFetch as unknown as typeof fetch, true));

    expect(result).toEqual({
      name: "prowlarr",
      ok: true,
      detail: "sonarr and radarr applications and flaresolverr proxy configured",
    });

    expect(mockFetch).toHaveBeenCalledTimes(7);

    const [tagCreateUrl, tagCreateInit] = mockFetch.mock.calls[4]!;
    expect(tagCreateUrl).toBe("http://localhost:9696/api/v1/tag");
    expect(tagCreateInit?.method).toBe("POST");
    expect(JSON.parse(tagCreateInit?.body as string)).toEqual({ label: "flaresolverr" });

    const [proxyCreateUrl, proxyCreateInit] = mockFetch.mock.calls[6]!;
    expect(proxyCreateUrl).toBe("http://localhost:9696/api/v1/indexerproxy");
    expect(proxyCreateInit?.method).toBe("POST");
    const proxyBody = JSON.parse(proxyCreateInit?.body as string);
    expect(proxyBody.name).toBe("FlareSolverr");
    expect(proxyBody.implementation).toBe("FlareSolverr");
    expect(proxyBody.tags).toEqual([1]);
    expect(fieldValue(proxyBody.fields, "host")).toBe("http://flaresolverr:8191");
    expect(fieldValue(proxyBody.fields, "requestTimeout")).toBe(60);
  });

  it("is idempotent when FlareSolverr proxy already exists", async () => {
    const mockFetch = vi.fn();

    mockFetch
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              id: 1,
              name: "Sonarr",
              syncLevel: "fullSync",
              implementation: "Sonarr",
              configContract: "SonarrSettings",
              fields: [
                { name: "prowlarrUrl", value: "http://prowlarr:9696" },
                { name: "baseUrl", value: "http://sonarr:8989" },
                { name: "apiKey", value: "sonarr-key" },
                { name: "syncCategories", value: [5000] },
              ],
              tags: [],
            },
            {
              id: 2,
              name: "Radarr",
              syncLevel: "fullSync",
              implementation: "Radarr",
              configContract: "RadarrSettings",
              fields: [
                { name: "prowlarrUrl", value: "http://prowlarr:9696" },
                { name: "baseUrl", value: "http://radarr:7878" },
                { name: "apiKey", value: "radarr-key" },
                { name: "syncCategories", value: [2000] },
              ],
              tags: [],
            },
          ]),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify([{ id: 1, label: "flaresolverr" }]), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              id: 1,
              name: "FlareSolverr",
              implementation: "FlareSolverr",
              configContract: "FlareSolverrSettings",
              tags: [1],
              fields: [
                { name: "host", value: "http://flaresolverr:8191" },
                { name: "requestTimeout", value: 60 },
              ],
            },
          ]),
          { status: 200 },
        ),
      );

    const result = await wireProwlarr(makeCtx(mockFetch as unknown as typeof fetch, true));

    expect(result).toEqual({
      name: "prowlarr",
      ok: true,
      detail: "sonarr and radarr applications and flaresolverr proxy configured",
    });
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });
});

function fieldValue(fields: { name: string; value: unknown }[], name: string): unknown {
  return fields.find((f) => f.name === name)?.value;
}
