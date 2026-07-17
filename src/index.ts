#!/usr/bin/env node
import { Command } from "commander";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { doctorCommand } from "./cli/doctor.js";
import { runInit } from "./cli/init.js";
import { saveStackConfig, wireStatePath } from "./cli/config-store.js";
import { buildLocalBaseUrls } from "./cli/ports.js";
import { runWireCommand } from "./cli/wire.js";
import { createDockerCompose } from "./cli/up.js";
import { generateStack } from "./generate/index.js";
import { promptStackConfig } from "./prompts/initPrompts.js";
import { runDoctorForDataRoot } from "./cli/doctor.js";
import { loadState, saveState } from "./wire/state.js";
import { runWire } from "./wire/index.js";
import type { StackConfig } from "./types.js";

const program = new Command();

program
  .name("plex-bootstrap")
  .description("Bootstrap a Plex-first media stack with Docker Compose");

program
  .command("doctor")
  .description("Run preflight checks")
  .option("--data-root <path>", "data root to verify", "/data")
  .action(async (opts: { dataRoot: string }) => {
    const code = await doctorCommand(opts.dataRoot);
    process.exitCode = code;
  });

program
  .command("init")
  .description("Interactive setup: doctor, generate, up, wire")
  .option("--out-dir <path>", "compose output directory", "./plex-stack")
  .action(async (opts: { outDir: string }) => {
    const outDir = resolve(opts.outDir);
    const compose = createDockerCompose();
    let savedConfig: StackConfig | undefined;

    await runInit({
      prompt: promptStackConfig,
      doctor: runDoctorForDataRoot,
      generate: async (config, dir) => {
        await mkdir(dir, { recursive: true });
        await saveStackConfig(config, dir);
        savedConfig = config;
        return generateStack(config, dir);
      },
      compose,
      wire: async () => {
        const config = savedConfig!;
        const state = await loadState(wireStatePath(config));
        const ctx = {
          config,
          state,
          baseUrls: buildLocalBaseUrls(config),
        };
        const report = await runWire(ctx);
        await saveState(wireStatePath(config), ctx.state);
        return report;
      },
      outDir,
    });
  });

program
  .command("wire")
  .description("Wire service integrations")
  .option("--out-dir <path>", "stack output directory", "./plex-stack")
  .option("--retry", "retry failed steps only", false)
  .action(async (opts: { outDir: string; retry: boolean }) => {
    const code = await runWireCommand(resolve(opts.outDir), { retry: opts.retry });
    process.exitCode = code;
  });

program
  .command("up")
  .description("Start the stack with docker compose")
  .option("--out-dir <path>", "stack output directory", "./plex-stack")
  .action(async (opts: { outDir: string }) => {
    const compose = createDockerCompose();
    await compose.up(resolve(opts.outDir));
  });

program
  .command("down")
  .description("Stop the stack with docker compose")
  .option("--out-dir <path>", "stack output directory", "./plex-stack")
  .action(async (opts: { outDir: string }) => {
    const compose = createDockerCompose();
    await compose.down(resolve(opts.outDir));
  });

program
  .command("update")
  .description("Pull latest images and recreate containers")
  .option("--out-dir <path>", "stack output directory", "./plex-stack")
  .action(async (opts: { outDir: string }) => {
    const compose = createDockerCompose();
    const outDir = resolve(opts.outDir);
    await compose.pull(outDir);
    await compose.up(outDir);
  });

program.parseAsync(process.argv).catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(message);
  process.exitCode = 1;
});
