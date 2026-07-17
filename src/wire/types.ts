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
  baseUrls: Record<string, string>;
  fetchFn?: typeof fetch;
};
