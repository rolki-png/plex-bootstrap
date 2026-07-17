export type ApiJsonInit = RequestInit & { apiKey?: string; fetchFn?: typeof fetch };

export async function apiJson<T>(url: string, init: ApiJsonInit = {}): Promise<T> {
  const { apiKey, headers, fetchFn, ...rest } = init;
  const mergedHeaders = new Headers(headers);
  if (apiKey) {
    mergedHeaders.set("X-Api-Key", apiKey);
  }

  const response = await (fetchFn ?? fetch)(url, { ...rest, headers: mergedHeaders });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}
