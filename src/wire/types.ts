import type { StackConfig } from "../types.ts";
import type { WireState } from "./state.ts";

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
