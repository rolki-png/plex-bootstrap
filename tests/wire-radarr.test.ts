import { describe, expect, it, vi } from "vitest";
import { defaultStackConfig } from "../src/types.ts";
import { wireRadarr } from "../src/wire/steps/radarr.ts";
import type { WireContext } from "../src/wire/types.ts";

function makeCtx(fetchFn: typeof fetch, vpn = false): WireContext {
  return {
    config: {
      ...defaultStackConfig({
        dataRoot: "/data",
        configRoot: "/config",
        puid: 1000,
        pgid: 1000,
        timezone: "UTC",
      }),
      services: {
        ...defaultStackConfig({
          dataRoot: "/data",
          configRoot: "/config",
          puid: 1000,
          pgid: 1000,
          timezone: "UTC",
        }).services,
        vpn,
      },
    },
    state: { apiKeys: { radarr: "radarr-key" }, completedSteps: [], failedSteps: [] },
    baseUrls: { radarr: "http://radarr:7878" },
    fetchFn,
  };
}

describe("wireRadarr", () => {
  it("creates root folder and qBittorrent download client", async () => {
    const mockFetch = vi.fn();

    mockFetch
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 1 }), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 1 }), { status: 201 }));

    const result = await wireRadarr(makeCtx(mockFetch as unknown as typeof fetch));

    expect(result).toEqual({
      name: "radarr",
      ok: true,
      detail: "root folder and download client configured",
    });

    expect(mockFetch).toHaveBeenCalledTimes(4);

    const [rootCreateUrl, rootCreateInit] = mockFetch.mock.calls[1]!;
    expect(rootCreateUrl).toBe("http://radarr:7878/api/v3/rootfolder");
    expect(rootCreateInit?.method).toBe("POST");
    expect(JSON.parse(rootCreateInit?.body as string)).toEqual({ path: "/data/media/movies" });

    const [, clientCreateInit] = mockFetch.mock.calls[3]!;
    const clientBody = JSON.parse(clientCreateInit?.body as string);
    expect(clientBody.name).toBe("qBittorrent");
    expect(fieldValue(clientBody.fields, "Host")).toBe("qbittorrent");
    expect(fieldValue(clientBody.fields, "MovieCategory")).toBe("movies");
  });

  it("is idempotent when root folder and download client already exist", async () => {
    const mockFetch = vi.fn();

    mockFetch
      .mockResolvedValueOnce(
        new Response(JSON.stringify([{ id: 1, path: "/data/media/movies" }]), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              id: 1,
              name: "qBittorrent",
              implementation: "QBittorrent",
              configContract: "QBittorrentSettings",
              enable: true,
              protocol: "torrent",
              priority: 1,
              removeCompletedDownloads: true,
              removeFailedDownloads: true,
              fields: [
                { name: "Host", value: "qbittorrent" },
                { name: "Port", value: 8080 },
                { name: "Username", value: "admin" },
                { name: "Password", value: "adminadmin" },
                { name: "MovieCategory", value: "movies" },
              ],
              tags: [],
            },
          ]),
          { status: 200 },
        ),
      );

    const result = await wireRadarr(makeCtx(mockFetch as unknown as typeof fetch));

    expect(result).toEqual({
      name: "radarr",
      ok: true,
      detail: "root folder and download client configured",
    });
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});

function fieldValue(fields: { name: string; value: unknown }[], name: string): unknown {
  return fields.find((f) => f.name === name)?.value;
}
