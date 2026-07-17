import type { StepResult, WireContext } from "../types.js";

const STEP_NAME = "qbittorrent";
const DEFAULT_USER = "admin";
const DEFAULT_PASSWORD = "adminadmin";

const CATEGORIES = [
  { name: "movies", savePath: "/data/torrents/movies" },
  { name: "tv", savePath: "/data/torrents/tv" },
] as const;

type QbitCategory = {
  name: string;
  savePath: string;
};

type QbitCategories = Record<string, QbitCategory>;

function authHeaders(cookie: string, baseUrl: string): Record<string, string> {
  return {
    Cookie: cookie,
    Referer: baseUrl,
  };
}

async function ensureCategory(
  fetchFn: typeof fetch,
  baseUrl: string,
  cookie: string,
  name: string,
  savePath: string,
  existing: QbitCategories,
): Promise<void> {
  const current = existing[name];
  if (current?.savePath === savePath) {
    return;
  }

  const endpoint = current ? "editCategory" : "createCategory";
  const categoryResponse = await fetchFn(`${baseUrl}/api/v2/torrents/${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      ...authHeaders(cookie, baseUrl),
    },
    body: `category=${encodeURIComponent(name)}&savePath=${encodeURIComponent(savePath)}`,
  });

  if (!categoryResponse.ok) {
    throw new Error(`${endpoint} ${name} failed: HTTP ${categoryResponse.status}`);
  }
}

function extractSid(response: Response): string | null {
  const cookies =
    typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie()
      : [response.headers.get("set-cookie")].filter((c): c is string => c !== null);

  for (const cookie of cookies) {
    const match = cookie.match(/(?:^|;\s*)SID=([^;]+)/);
    if (match?.[1]) {
      return match[1];
    }
  }

  return null;
}

export async function wireQbittorrent(ctx: WireContext): Promise<StepResult> {
  const baseUrl = ctx.baseUrls.qbittorrent;
  if (!baseUrl) {
    return {
      name: STEP_NAME,
      ok: false,
      detail: "qbittorrent base URL not configured",
      fallback: "Set baseUrls.qbittorrent in wire context",
    };
  }

  const fetchFn = ctx.fetchFn ?? fetch;
  const password = ctx.state.apiKeys.qbittorrent ?? DEFAULT_PASSWORD;

  try {
    const loginResponse = await fetchFn(`${baseUrl}/api/v2/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Referer: baseUrl,
      },
      body: `username=${DEFAULT_USER}&password=${encodeURIComponent(password)}`,
    });

    if (!loginResponse.ok) {
      throw new Error(`login failed: HTTP ${loginResponse.status}`);
    }

    const sid = extractSid(loginResponse);
    if (!sid) {
      throw new Error("login succeeded but no SID cookie returned");
    }

    const cookie = `SID=${sid}`;

    const categoriesResponse = await fetchFn(`${baseUrl}/api/v2/torrents/categories`, {
      headers: authHeaders(cookie, baseUrl),
    });

    if (!categoriesResponse.ok) {
      throw new Error(`list categories failed: HTTP ${categoriesResponse.status}`);
    }

    const existing = (await categoriesResponse.json()) as QbitCategories;

    for (const { name, savePath } of CATEGORIES) {
      await ensureCategory(fetchFn, baseUrl, cookie, name, savePath, existing);
    }

    return {
      name: STEP_NAME,
      ok: true,
      detail: "categories movies and tv configured",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      name: STEP_NAME,
      ok: false,
      detail: message,
      fallback:
        "Create categories movies and tv with save paths /data/torrents/movies and /data/torrents/tv in qBittorrent WebUI",
    };
  }
}
