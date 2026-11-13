import { loadStackConfig } from "./config-store.js";
import { generateStack, type GenerateResult } from "../generate/index.js";

export async function runGenerate(outDir: string): Promise<GenerateResult> {
  const config = await loadStackConfig(outDir);
  return generateStack(config, outDir);
}
