import { buildInternalUrls, buildLocalBaseUrls } from "./ports.js";
import { loadStackConfig, wireStatePath } from "./config-store.js";
import { loadState, saveState } from "../wire/state.js";
import { runWire } from "../wire/index.js";
import { bootstrapApiKeys } from "../wire/bootstrapKeys.js";
import type { WireContext } from "../wire/types.js";

export async function runWireCommand(
  outDir: string,
  opts?: { retry?: boolean },
): Promise<number> {
  const config = await loadStackConfig(outDir);
  const state = await loadState(wireStatePath(config));

  const keys = await bootstrapApiKeys(config, state);
  if (keys.missing.length > 0) {
    console.log(`API keys not found yet: ${keys.missing.join(", ")}`);
  }

  const ctx: WireContext = {
    config,
    state,
    baseUrls: buildLocalBaseUrls(config),
    internalUrls: buildInternalUrls(config),
  };

  const report = await runWire(ctx, { retryFailedOnly: opts?.retry ?? false });
  await saveState(wireStatePath(config), ctx.state);

  for (const step of report.steps) {
    const status = step.ok ? "ok" : "FAIL";
    console.log(`[${status}] ${step.name}: ${step.detail}`);
    if (step.fallback) {
      console.log(`  fallback: ${step.fallback}`);
    }
  }

  return report.coreOk ? 0 : 1;
}
