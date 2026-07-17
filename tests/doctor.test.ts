import { describe, expect, it } from "vitest";
import { runDoctor } from "../src/doctor/index.ts";

describe("runDoctor", () => {
  it("reports ok when docker, compose, and writable data root are available", async () => {
    const report = await runDoctor({
      which: async (cmd) => (cmd === "docker" ? "/usr/bin/docker" : null),
      exec: async (cmd) => {
        if (cmd.includes("compose version")) return { code: 0, stdout: "Docker Compose version v2.30.0", stderr: "" };
        if (cmd.includes("docker info")) return { code: 0, stdout: "Server:", stderr: "" };
        return { code: 1, stdout: "", stderr: "unknown" };
      },
      canWrite: async () => true,
      dataRoot: "/data",
    });
    expect(report.ok).toBe(true);
    expect(report.checks.map((c) => c.name)).toEqual(
      expect.arrayContaining(["docker", "compose", "docker-daemon", "data-root-writable"]),
    );
  });

  it("accepts Docker Compose 5.x version output", async () => {
    const report = await runDoctor({
      which: async (cmd) => (cmd === "docker" ? "/usr/bin/docker" : null),
      exec: async (cmd) => {
        if (cmd.includes("compose version")) {
          return { code: 0, stdout: "Docker Compose version 5.3.1", stderr: "" };
        }
        if (cmd.includes("docker info")) return { code: 0, stdout: "Server:", stderr: "" };
        return { code: 1, stdout: "", stderr: "unknown" };
      },
      canWrite: async () => true,
      dataRoot: "/data",
    });
    expect(report.checks.find((c) => c.name === "compose")?.ok).toBe(true);
    expect(report.ok).toBe(true);
  });

  it("fails when docker binary is missing", async () => {
    const report = await runDoctor({
      which: async () => null,
      exec: async () => ({ code: 1, stdout: "", stderr: "" }),
      canWrite: async () => true,
      dataRoot: "/data",
    });
    expect(report.ok).toBe(false);
    expect(report.checks.find((c) => c.name === "docker")?.ok).toBe(false);
  });
});
