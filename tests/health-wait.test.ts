import { describe, expect, it, vi } from "vitest";
import { waitForHealthy } from "../src/wire/health.ts";

describe("waitForHealthy", () => {
  it("resolves once every service responds, even with non-2xx status", async () => {
    const responded: Record<string, number> = { sonarr: 0, radarr: 0 };
    const fetchFn = vi.fn(async (url: string) => {
      if (url.includes("sonarr")) {
        responded.sonarr += 1;
        if (responded.sonarr < 2) throw new Error("ECONNREFUSED");
        return new Response("unauthorized", { status: 401 });
      }
      responded.radarr += 1;
      return new Response("ok", { status: 200 });
    });

    const result = await waitForHealthy(
      { sonarr: "http://sonarr.test:8989", radarr: "http://radarr.test:7878" },
      {
        fetchFn: fetchFn as unknown as typeof fetch,
        sleep: async () => {},
        timeoutMs: 10_000,
        intervalMs: 10,
      },
    );

    expect(result.ready).toEqual(expect.arrayContaining(["sonarr", "radarr"]));
    expect(responded.sonarr).toBeGreaterThanOrEqual(2);
  });

  it("throws a clear error listing services that never responded before timeout", async () => {
    let now = 0;
    const fetchFn = vi.fn(async (url: string) => {
      if (url.includes("radarr")) return new Response("ok", { status: 200 });
      throw new Error("ECONNREFUSED");
    });

    await expect(
      waitForHealthy(
        { sonarr: "http://sonarr.test:8989", radarr: "http://radarr.test:7878" },
        {
          fetchFn: fetchFn as unknown as typeof fetch,
          sleep: async () => {
            now += 50;
          },
          now: () => now,
          timeoutMs: 120,
          intervalMs: 50,
        },
      ),
    ).rejects.toThrow(/sonarr/);
  });

  it("resolves immediately for an empty url set", async () => {
    const result = await waitForHealthy(
      {},
      { fetchFn: vi.fn() as unknown as typeof fetch, sleep: async () => {} },
    );
    expect(result.ready).toEqual([]);
  });
});
