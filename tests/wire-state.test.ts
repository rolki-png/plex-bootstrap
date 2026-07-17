import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiJson } from "../src/wire/http.ts";
import { loadState, saveState, type WireState } from "../src/wire/state.ts";

describe("apiJson", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("injects X-Api-Key header when apiKey is provided", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));

    await apiJson("http://localhost:8989/api/v3/system/status", {
      apiKey: "secret-key",
    });

    expect(mockFetch).toHaveBeenCalledOnce();
    const [, init] = mockFetch.mock.calls[0]!;
    const headers = init!.headers as Headers;
    expect(headers.get("X-Api-Key")).toBe("secret-key");
  });

  it("returns parsed JSON response", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ version: "4.0.0" }), { status: 200 }),
    );

    const result = await apiJson<{ version: string }>("http://example.com/api");
    expect(result).toEqual({ version: "4.0.0" });
  });
});

describe("loadState / saveState", () => {
  it("round-trips WireState to disk", async () => {
    const dir = await mkdtemp(join(tmpdir(), "pb-wire-"));
    const statePath = join(dir, "state.json");
    const state: WireState = {
      apiKeys: { sonarr: "sk-1", radarr: "rk-1" },
      completedSteps: ["plex", "sonarr"],
      failedSteps: ["bazarr"],
    };

    try {
      await saveState(statePath, state);
      const loaded = await loadState(statePath);
      expect(loaded).toEqual(state);

      const raw = await readFile(statePath, "utf8");
      expect(JSON.parse(raw)).toEqual(state);
    } finally {
      await rm(dir, { recursive: true });
    }
  });
});
