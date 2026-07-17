import type { StackConfig } from "../types.js";
import type { WireState } from "./state.js";

export type StepResult = {
  name: string;
  ok: boolean;
  detail: string;
  fallback?: string;
};

export type WireContext = {
  config: StackConfig;
  state: WireState;
  /** Host-reachable URLs for CLI API calls (localhost). */
  baseUrls: Record<string, string>;
  /** Docker DNS URLs persisted into other containers' config. */
  internalUrls: Record<string, string>;
  fetchFn?: typeof fetch;
};
