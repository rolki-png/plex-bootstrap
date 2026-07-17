import { describe, expect, it, vi } from "vitest";
import { defaultStackConfig } from "../src/types.ts";
import { runInit } from "../src/cli/init.ts";

describe("runInit", () => {
  it("init runs doctor generate up wire in order when doctor ok", async () => {
    const calls: string[] = [];
    const code = await runInit({
      prompt: async () =>
        defaultStackConfig({
          dataRoot: "/tmp/pb-data",
          configRoot: "/tmp/pb-data/configs",
          puid: 1000,
          pgid: 1000,
          timezone: "UTC",
        }),
      doctor: async () => ({ ok: true, checks: [] }),
      generate: async () => {
        calls.push("generate");
        return { composePath: "/tmp/pb-out/docker-compose.yml", envPath: "/tmp/pb-out/.env", services: [] };
      },
      compose: {
        up: async () => {
          calls.push("up");
        },
        down: async () => {},
        pull: async () => {},
      },
      wire: async () => {
        calls.push("wire");
        return { ok: true, coreOk: true, steps: [] };
      },
      outDir: "/tmp/pb-out",
    });
    expect(calls).toEqual(["generate", "up", "wire"]);
    expect(code).toBe(0);
  });

  it("prints wire step results and returns 1 when coreOk is false", async () => {
    const logs: string[] = [];
    const logSpy = vi.spyOn(console, "log").mockImplementation((...args: unknown[]) => {
      logs.push(args.map(String).join(" "));
    });

    const code = await runInit({
      prompt: async () =>
        defaultStackConfig({
          dataRoot: "/tmp/pb-data",
          configRoot: "/tmp/pb-data/configs",
          puid: 1000,
          pgid: 1000,
          timezone: "UTC",
        }),
      doctor: async () => ({ ok: true, checks: [] }),
      generate: async () => ({
        composePath: "/tmp/pb-out/docker-compose.yml",
        envPath: "/tmp/pb-out/.env",
        services: [],
      }),
      compose: { up: async () => {}, down: async () => {}, pull: async () => {} },
      wire: async () => ({
        ok: false,
        coreOk: false,
        steps: [{ name: "sonarr", ok: false, detail: "download client failed", fallback: "manual" }],
      }),
      outDir: "/tmp/pb-out",
    });

    logSpy.mockRestore();
    expect(code).toBe(1);
    expect(logs.some((line) => line.includes("[FAIL] sonarr"))).toBe(true);
    expect(logs.some((line) => line.includes("fallback: manual"))).toBe(true);
  });

  it("init aborts before generate when doctor fails", async () => {
    await expect(
      runInit({
        prompt: async () =>
          defaultStackConfig({
            dataRoot: "/data",
            configRoot: "/data/configs",
            puid: 1000,
            pgid: 1000,
            timezone: "UTC",
          }),
        doctor: async () => ({
          ok: false,
          checks: [{ name: "docker", ok: false, detail: "missing" }],
        }),
        generate: async () => {
          throw new Error("should not run");
        },
        compose: { up: async () => {}, down: async () => {}, pull: async () => {} },
        wire: async () => ({ ok: true, coreOk: true, steps: [] }),
        outDir: "/tmp/pb-out",
      }),
    ).rejects.toThrow(/doctor/i);
  });
});
