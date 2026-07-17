import { wireQbittorrent } from "./steps/qbittorrent.js";
import { wireSonarr } from "./steps/sonarr.js";
import { wireRadarr } from "./steps/radarr.js";
import { wireProwlarr } from "./steps/prowlarr.js";
import { wireSeerr } from "./steps/seerr.js";
import { wireExtras } from "./steps/extras.js";
import type { StepResult, WireContext } from "./types.js";

export type WireReport = {
  ok: boolean;
  coreOk: boolean;
  steps: StepResult[];
};

const CORE_STEPS = ["qbittorrent", "sonarr", "radarr", "seerr"] as const;
const EXTRA_STEPS = ["unpackerr", "bazarr", "tautulli", "jackett"] as const;

type StepRunner = {
  name: string;
  run: (ctx: WireContext) => Promise<StepResult | StepResult[]>;
};

const STEP_RUNNERS: StepRunner[] = [
  { name: "qbittorrent", run: wireQbittorrent },
  { name: "sonarr", run: wireSonarr },
  { name: "radarr", run: wireRadarr },
  { name: "prowlarr", run: wireProwlarr },
  { name: "seerr", run: wireSeerr },
  { name: "extras", run: wireExtras },
];

function shouldRunStep(
  stepName: string,
  ctx: WireContext,
  retryFailedOnly: boolean,
): boolean {
  if (!retryFailedOnly) {
    return true;
  }

  if (stepName === "extras") {
    return EXTRA_STEPS.some((name) => ctx.state.failedSteps.includes(name));
  }

  return ctx.state.failedSteps.includes(stepName);
}

function applyStepResult(ctx: WireContext, result: StepResult): void {
  if (result.ok) {
    if (!ctx.state.completedSteps.includes(result.name)) {
      ctx.state.completedSteps.push(result.name);
    }
    ctx.state.failedSteps = ctx.state.failedSteps.filter((name) => name !== result.name);
    return;
  }

  if (!ctx.state.failedSteps.includes(result.name)) {
    ctx.state.failedSteps.push(result.name);
  }
  ctx.state.completedSteps = ctx.state.completedSteps.filter((name) => name !== result.name);
}

function computeCoreOk(ctx: WireContext): boolean {
  return !CORE_STEPS.some((name) => ctx.state.failedSteps.includes(name));
}

async function runStep(
  stepName: string,
  run: () => Promise<StepResult | StepResult[]>,
): Promise<StepResult[]> {
  try {
    const result = await run();
    return Array.isArray(result) ? result : [result];
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return [{ name: stepName, ok: false, detail: message }];
  }
}

export async function runWire(
  ctx: WireContext,
  opts?: { retryFailedOnly?: boolean },
): Promise<WireReport> {
  const retryFailedOnly = opts?.retryFailedOnly ?? false;
  const steps: StepResult[] = [];

  for (const { name, run } of STEP_RUNNERS) {
    if (!shouldRunStep(name, ctx, retryFailedOnly)) {
      continue;
    }

    const results = await runStep(name, () => run(ctx));

    for (const result of results) {
      if (retryFailedOnly && name === "extras" && !ctx.state.failedSteps.includes(result.name)) {
        continue;
      }

      applyStepResult(ctx, result);
      steps.push(result);
    }
  }

  return {
    ok: steps.length > 0 && steps.every((step) => step.ok),
    coreOk: computeCoreOk(ctx),
    steps,
  };
}
