import { describe, expect, it, vi } from "vitest";
import { defaultStackConfig } from "../src/types.ts";
import { wireQbittorrent } from "../src/wire/steps/qbittorrent.ts";
import type { WireContext } from "../src/wire/types.ts";

function makeCtx(fetchFn: typeof fetch): WireContext {
  return {
    config: defaultStackConfig({
      dataRoot: "/data",
      configRoot: "/config",
      puid: 1000,
      pgid: 1000,
      timezone: "UTC",
    }),
    state: { apiKeys: {}, completedSteps: [], failedSteps: [] },
    baseUrls: { qbittorrent: "http://qbittorrent:8080" },
    fetchFn,
  };
}

describe("wireQbittorrent", () => {
  it("logs in and ensures movies and tv categories with save paths", async () => {
    const mockFetch = vi.fn();

    mockFetch
      .mockResolvedValueOnce(
        new Response("Ok.", {
          status: 200,
          headers: { "Set-Cookie": "SID=test-sid; path=/" },
        }),
      )
      .mockResolvedValueOnce(new Response("{}", { status: 200 }))
      .mockResolvedValueOnce(new Response("Ok.", { status: 200 }))
      .mockResolvedValueOnce(new Response("Ok.", { status: 200 }));

    const result = await wireQbittorrent(makeCtx(mockFetch as unknown as typeof fetch));

    expect(result).toEqual({
      name: "qbittorrent",
      ok: true,
      detail: "categories movies and tv configured",
    });

    expect(mockFetch).toHaveBeenCalledTimes(4);

    const [loginUrl, loginInit] = mockFetch.mock.calls[0]!;
    expect(loginUrl).toBe("http://qbittorrent:8080/api/v2/auth/login");
    expect(loginInit?.method).toBe("POST");
    expect(loginInit?.body).toBe("username=admin&password=adminadmin");
    expect(loginInit?.headers).toMatchObject({
      "Content-Type": "application/x-www-form-urlencoded",
      Referer: "http://qbittorrent:8080",
    });

    const [categoriesUrl, categoriesInit] = mockFetch.mock.calls[1]!;
    expect(categoriesUrl).toBe("http://qbittorrent:8080/api/v2/torrents/categories");
    expect(categoriesInit?.method).toBeUndefined();
    expect(categoriesInit?.headers).toMatchObject({
      Cookie: "SID=test-sid",
      Referer: "http://qbittorrent:8080",
    });

    const [moviesUrl, moviesInit] = mockFetch.mock.calls[2]!;
    expect(moviesUrl).toBe("http://qbittorrent:8080/api/v2/torrents/createCategory");
    expect(moviesInit?.method).toBe("POST");
    expect(moviesInit?.body).toBe("category=movies&savePath=%2Fdata%2Ftorrents%2Fmovies");
    expect(moviesInit?.headers).toMatchObject({
      Cookie: "SID=test-sid",
      Referer: "http://qbittorrent:8080",
    });

    const [tvUrl, tvInit] = mockFetch.mock.calls[3]!;
    expect(tvUrl).toBe("http://qbittorrent:8080/api/v2/torrents/createCategory");
    expect(tvInit?.method).toBe("POST");
    expect(tvInit?.body).toBe("category=tv&savePath=%2Fdata%2Ftorrents%2Ftv");
    expect(tvInit?.headers).toMatchObject({
      Cookie: "SID=test-sid",
    });
  });

  it("edits existing categories when save paths are wrong", async () => {
    const mockFetch = vi.fn();

    mockFetch
      .mockResolvedValueOnce(
        new Response("Ok.", {
          status: 200,
          headers: { "Set-Cookie": "SID=test-sid; path=/" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            movies: { name: "movies", savePath: "/wrong/movies" },
            tv: { name: "tv", savePath: "/wrong/tv" },
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(new Response("Ok.", { status: 200 }))
      .mockResolvedValueOnce(new Response("Ok.", { status: 200 }));

    const result = await wireQbittorrent(makeCtx(mockFetch as unknown as typeof fetch));

    expect(result).toEqual({
      name: "qbittorrent",
      ok: true,
      detail: "categories movies and tv configured",
    });

    expect(mockFetch).toHaveBeenCalledTimes(4);

    const [moviesUrl, moviesInit] = mockFetch.mock.calls[2]!;
    expect(moviesUrl).toBe("http://qbittorrent:8080/api/v2/torrents/editCategory");
    expect(moviesInit?.method).toBe("POST");
    expect(moviesInit?.body).toBe("category=movies&savePath=%2Fdata%2Ftorrents%2Fmovies");

    const [tvUrl, tvInit] = mockFetch.mock.calls[3]!;
    expect(tvUrl).toBe("http://qbittorrent:8080/api/v2/torrents/editCategory");
    expect(tvInit?.method).toBe("POST");
    expect(tvInit?.body).toBe("category=tv&savePath=%2Fdata%2Ftorrents%2Ftv");
  });
});
