import type { DoctorReport } from "../doctor/index.js";
import type { GenerateResult } from "../generate/index.js";
import type { StackConfig } from "../types.js";
import type { WireReport } from "../wire/index.js";
import type { DockerCompose } from "./up.js";

export type InitDeps = {
  prompt: () => Promise<StackConfig>;
  doctor: (dataRoot: string) => Promise<DoctorReport>;
  generate: (config: StackConfig, outDir: string) => Promise<GenerateResult>;
  compose: DockerCompose;
  /** Wait for started containers to respond before wiring. */
  healthWait: (config: StackConfig) => Promise<void>;
  /** Read API keys from app configs into wire state before wiring. */
  bootstrapKeys: (config: StackConfig) => Promise<void>;
  wire: () => Promise<WireReport>;
  outDir: string;
};

export async function runInit(deps: InitDeps): Promise<number> {
  const config = await deps.prompt();
  const doctorReport = await deps.doctor(config.dataRoot);
  if (!doctorReport.ok) {
    const failed = doctorReport.checks
      .filter((check) => !check.ok)
      .map((check) => check.name)
      .join(", ");
    throw new Error(`Doctor checks failed: ${failed}`);
  }

  await deps.generate(config, deps.outDir);
  await deps.compose.up(deps.outDir);
  await deps.healthWait(config);
  await deps.bootstrapKeys(config);
  const report = await deps.wire();

  for (const step of report.steps) {
    const status = step.ok ? "ok" : "FAIL";
    console.log(`[${status}] ${step.name}: ${step.detail}`);
    if (step.fallback) {
      console.log(`  fallback: ${step.fallback}`);
    }
  }

  return report.coreOk ? 0 : 1;
}
