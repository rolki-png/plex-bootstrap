import { describe, expect, it } from "vitest";
import { defaultStackConfig } from "../src/types.ts";
import { runInit } from "../src/cli/init.ts";

describe("runInit", () => {
  it("init runs doctor generate up wire in order when doctor ok", async () => {
    const calls: string[] = [];
    await runInit({
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
