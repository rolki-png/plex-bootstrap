import { describe, expect, it, vi } from "vitest";
import { defaultStackConfig } from "../src/types.ts";
import { wireSonarr } from "../src/wire/steps/sonarr.ts";
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
    state: { apiKeys: { sonarr: "sonarr-key" }, completedSteps: [], failedSteps: [] },
    baseUrls: { sonarr: "http://localhost:8989" },
    internalUrls: {},
    fetchFn,
  };
}

describe("wireSonarr", () => {
  it("creates root folder and qBittorrent download client", async () => {
    const mockFetch = vi.fn();

    mockFetch
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 1 }), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 1 }), { status: 201 }));

    const result = await wireSonarr(makeCtx(mockFetch as unknown as typeof fetch));

    expect(result).toEqual({
      name: "sonarr",
      ok: true,
      detail: "root folder and download client configured",
    });

    expect(mockFetch).toHaveBeenCalledTimes(4);

    const [rootListUrl, rootListInit] = mockFetch.mock.calls[0]!;
    expect(rootListUrl).toBe("http://localhost:8989/api/v3/rootfolder");
    const rootListHeaders = rootListInit?.headers as Headers;
    expect(rootListHeaders.get("X-Api-Key")).toBe("sonarr-key");

    const [rootCreateUrl, rootCreateInit] = mockFetch.mock.calls[1]!;
    expect(rootCreateUrl).toBe("http://localhost:8989/api/v3/rootfolder");
    expect(rootCreateInit?.method).toBe("POST");
    expect(JSON.parse(rootCreateInit?.body as string)).toEqual({ path: "/data/media/tv" });

    const [clientListUrl] = mockFetch.mock.calls[2]!;
    expect(clientListUrl).toBe("http://localhost:8989/api/v3/downloadclient");

    const [clientCreateUrl, clientCreateInit] = mockFetch.mock.calls[3]!;
    expect(clientCreateUrl).toBe("http://localhost:8989/api/v3/downloadclient");
    expect(clientCreateInit?.method).toBe("POST");
    const clientBody = JSON.parse(clientCreateInit?.body as string);
    expect(clientBody.name).toBe("qBittorrent");
    expect(clientBody.implementation).toBe("QBittorrent");
    expect(fieldValue(clientBody.fields, "Host")).toBe("qbittorrent");
    expect(fieldValue(clientBody.fields, "Port")).toBe(8080);
    expect(fieldValue(clientBody.fields, "TvCategory")).toBe("tv");
  });

  it("is idempotent when root folder and download client already exist", async () => {
    const mockFetch = vi.fn();

    mockFetch
      .mockResolvedValueOnce(
        new Response(JSON.stringify([{ id: 1, path: "/data/media/tv" }]), { status: 200 }),
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
                { name: "TvCategory", value: "tv" },
              ],
              tags: [],
            },
          ]),
          { status: 200 },
        ),
      );

    const result = await wireSonarr(makeCtx(mockFetch as unknown as typeof fetch));

    expect(result).toEqual({
      name: "sonarr",
      ok: true,
      detail: "root folder and download client configured",
    });
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("uses gluetun host when vpn is enabled", async () => {
    const mockFetch = vi.fn();

    mockFetch
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 1 }), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 1 }), { status: 201 }));

    await wireSonarr(makeCtx(mockFetch as unknown as typeof fetch, true));

    const [, clientCreateInit] = mockFetch.mock.calls[3]!;
    const clientBody = JSON.parse(clientCreateInit?.body as string);
    expect(fieldValue(clientBody.fields, "Host")).toBe("gluetun");
  });
});

function fieldValue(fields: { name: string; value: unknown }[], name: string): unknown {
  return fields.find((f) => f.name === name)?.value;
}
