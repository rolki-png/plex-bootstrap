import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import type { StackConfig } from "../types.js";

const CONFIG_FILE = "stack-config.json";

export function stackConfigPath(outDir: string): string {
  return join(outDir, CONFIG_FILE);
}

export function wireStatePath(config: StackConfig): string {
  return join(config.configRoot, "wire-state.json");
}

export async function saveStackConfig(config: StackConfig, outDir: string): Promise<void> {
  await mkdir(outDir, { recursive: true });
  await writeFile(stackConfigPath(outDir), `${JSON.stringify(config, null, 2)}\n`, "utf8");
}

export async function loadStackConfig(outDir: string): Promise<StackConfig> {
  const raw = await readFile(stackConfigPath(outDir), "utf8");
  return JSON.parse(raw) as StackConfig;
}
