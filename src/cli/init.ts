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
  wire: () => Promise<WireReport>;
  outDir: string;
};

export async function runInit(deps: InitDeps): Promise<WireReport> {
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
  return deps.wire();
}
