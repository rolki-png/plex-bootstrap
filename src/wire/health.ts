export type WaitForHealthyOptions = {
  fetchFn?: typeof fetch;
  /** Total time budget before giving up. Defaults to 120s. */
  timeoutMs?: number;
  /** Delay between polling rounds. Defaults to 2s. */
  intervalMs?: number;
  /** Injectable clock for tests. Defaults to Date.now. */
  now?: () => number;
  /** Injectable delay for tests. Defaults to setTimeout. */
  sleep?: (ms: number) => Promise<void>;
};

export type WaitForHealthyResult = {
  ready: string[];
};

const DEFAULT_TIMEOUT_MS = 120_000;
const DEFAULT_INTERVAL_MS = 2_000;

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * A service is considered up as soon as its HTTP endpoint answers at all, even
 * with a 4xx/5xx (e.g. an arr app returning 401 without an API key still proves
 * the port is listening). Only connection-level failures count as "not ready".
 */
async function isResponding(fetchFn: typeof fetch, url: string): Promise<boolean> {
  try {
    await fetchFn(url, { method: "GET" });
    return true;
  } catch {
    return false;
  }
}

/**
 * Polls each service URL (host-reachable base URLs) until all respond or the
 * timeout elapses. Throws a clear error naming the services that never came up.
 */
export async function waitForHealthy(
  baseUrls: Record<string, string>,
  options: WaitForHealthyOptions = {},
): Promise<WaitForHealthyResult> {
  const fetchFn = options.fetchFn ?? fetch;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const intervalMs = options.intervalMs ?? DEFAULT_INTERVAL_MS;
  const now = options.now ?? Date.now;
  const sleep = options.sleep ?? defaultSleep;

  const services = Object.entries(baseUrls);
  if (services.length === 0) {
    return { ready: [] };
  }

  const ready = new Set<string>();
  const deadline = now() + timeoutMs;

  for (;;) {
    await Promise.all(
      services.map(async ([name, url]) => {
        if (ready.has(name)) {
          return;
        }
        if (await isResponding(fetchFn, url)) {
          ready.add(name);
        }
      }),
    );

    if (ready.size === services.length) {
      return { ready: [...ready] };
    }

    if (now() >= deadline) {
      const pending = services.map(([name]) => name).filter((name) => !ready.has(name));
      throw new Error(
        `Timed out after ${timeoutMs}ms waiting for services to respond: ${pending.join(", ")}`,
      );
    }

    await sleep(intervalMs);
  }
}
