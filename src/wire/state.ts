import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export type WireState = {
  apiKeys: Record<string, string>;
  completedSteps: string[];
  failedSteps: string[];
};

function emptyState(): WireState {
  return { apiKeys: {}, completedSteps: [], failedSteps: [] };
}

export async function loadState(path: string): Promise<WireState> {
  try {
    const raw = await readFile(path, "utf8");
    return JSON.parse(raw) as WireState;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return emptyState();
    }
    throw err;
  }
}

export async function saveState(path: string, state: WireState): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}
