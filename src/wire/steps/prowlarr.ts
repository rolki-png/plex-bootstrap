import { apiJson } from "../http.ts";
import type { StepResult, WireContext } from "../types.ts";

const STEP_NAME = "prowlarr";
const FLARESOLVERR_TAG = "flaresolverr";
const FLARESOLVERR_HOST = "http://flaresolverr:8191";
const FLARESOLVERR_TIMEOUT = 60;

type ArrField = { name: string; value: unknown };

type Application = {
  id?: number;
  name: string;
  syncLevel: string;
  implementation: string;
  configContract: string;
  fields: ArrField[];
  tags: number[];
};

type IndexerProxy = {
  id?: number;
  name: string;
  implementation: string;
  configContract: string;
  fields: ArrField[];
  tags: number[];
};

type Tag = { id: number; label: string };

type ArrAppType = "Sonarr" | "Radarr";

const SYNC_CATEGORIES: Record<ArrAppType, number[]> = {
  Sonarr: [5000],
  Radarr: [2000],
};

function fieldValue(fields: ArrField[], name: string): unknown {
  return fields.find((f) => f.name === name)?.value;
}

function withField(fields: ArrField[], name: string, value: unknown): ArrField[] {
  if (fields.some((f) => f.name === name)) {
    return fields.map((f) => (f.name === name ? { ...f, value } : f));
  }
  return [...fields, { name, value }];
}

function categoriesMatch(a: unknown, b: number[]): boolean {
  return Array.isArray(a) && a.length === b.length && a.every((v, i) => v === b[i]);
}

function applicationMatches(
  app: Application,
  prowlarrUrl: string,
  appUrl: string,
  appApiKey: string,
  appType: ArrAppType,
): boolean {
  return (
    app.implementation === appType &&
    fieldValue(app.fields, "prowlarrUrl") === prowlarrUrl &&
    fieldValue(app.fields, "baseUrl") === appUrl &&
    fieldValue(app.fields, "apiKey") === appApiKey &&
    categoriesMatch(fieldValue(app.fields, "syncCategories"), SYNC_CATEGORIES[appType])
  );
}

function buildApplication(
  appType: ArrAppType,
  prowlarrUrl: string,
  appUrl: string,
  appApiKey: string,
  existing?: Application,
): Application {
  const base: Application = existing ?? {
    name: appType,
    syncLevel: "fullSync",
    implementation: appType,
    configContract: `${appType}Settings`,
    fields: [],
    tags: [],
  };

  let fields = base.fields;
  fields = withField(fields, "prowlarrUrl", prowlarrUrl);
  fields = withField(fields, "baseUrl", appUrl);
  fields = withField(fields, "apiKey", appApiKey);
  fields = withField(fields, "syncCategories", SYNC_CATEGORIES[appType]);

  return { ...base, name: appType, syncLevel: "fullSync", fields };
}

function proxyMatches(proxy: IndexerProxy, tagId: number): boolean {
  return (
    proxy.implementation === "FlareSolverr" &&
    fieldValue(proxy.fields, "host") === FLARESOLVERR_HOST &&
    fieldValue(proxy.fields, "requestTimeout") === FLARESOLVERR_TIMEOUT &&
    proxy.tags.includes(tagId)
  );
}

function buildFlareSolverrProxy(tagId: number, existing?: IndexerProxy): IndexerProxy {
  const base: IndexerProxy = existing ?? {
    name: "FlareSolverr",
    implementation: "FlareSolverr",
    configContract: "FlareSolverrSettings",
    fields: [],
    tags: [],
  };

  let fields = base.fields;
  fields = withField(fields, "host", FLARESOLVERR_HOST);
  fields = withField(fields, "requestTimeout", FLARESOLVERR_TIMEOUT);

  const tags = base.tags.includes(tagId) ? base.tags : [...base.tags, tagId];

  return { ...base, name: "FlareSolverr", fields, tags };
}

async function ensureApplications(
  prowlarrUrl: string,
  apiKey: string,
  apps: Application[],
  targets: { appType: ArrAppType; appUrl: string; appApiKey: string }[],
  fetchFn: typeof fetch,
): Promise<void> {
  const headers = { "Content-Type": "application/json" };

  for (const { appType, appUrl, appApiKey } of targets) {
    const existing = apps.find((a) => a.implementation === appType);
    const desired = buildApplication(appType, prowlarrUrl, appUrl, appApiKey, existing);

    if (existing && applicationMatches(existing, prowlarrUrl, appUrl, appApiKey, appType)) {
      continue;
    }

    if (existing?.id !== undefined) {
      await apiJson(`${prowlarrUrl}/api/v1/applications/${existing.id}`, {
        method: "PUT",
        apiKey,
        fetchFn,
        headers,
        body: JSON.stringify(desired),
      });
      continue;
    }

    await apiJson(`${prowlarrUrl}/api/v1/applications`, {
      method: "POST",
      apiKey,
      fetchFn,
      headers,
      body: JSON.stringify(desired),
    });
  }
}

async function ensureFlareSolverrTag(
  prowlarrUrl: string,
  apiKey: string,
  fetchFn: typeof fetch,
): Promise<number> {
  const tags = await apiJson<Tag[]>(`${prowlarrUrl}/api/v1/tag`, { apiKey, fetchFn });
  const existing = tags.find((t) => t.label.toLowerCase() === FLARESOLVERR_TAG);
  if (existing) {
    return existing.id;
  }

  const created = await apiJson<Tag>(`${prowlarrUrl}/api/v1/tag`, {
    method: "POST",
    apiKey,
    fetchFn,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ label: FLARESOLVERR_TAG }),
  });

  return created.id;
}

async function ensureFlareSolverrProxy(
  prowlarrUrl: string,
  apiKey: string,
  tagId: number,
  fetchFn: typeof fetch,
): Promise<void> {
  const proxies = await apiJson<IndexerProxy[]>(`${prowlarrUrl}/api/v1/indexerproxy`, {
    apiKey,
    fetchFn,
  });

  const existing = proxies.find((p) => p.implementation === "FlareSolverr");
  const desired = buildFlareSolverrProxy(tagId, existing);

  if (existing && proxyMatches(existing, tagId)) {
    return;
  }

  const headers = { "Content-Type": "application/json" };

  if (existing?.id !== undefined) {
    await apiJson(`${prowlarrUrl}/api/v1/indexerproxy/${existing.id}`, {
      method: "PUT",
      apiKey,
      fetchFn,
      headers,
      body: JSON.stringify(desired),
    });
    return;
  }

  await apiJson(`${prowlarrUrl}/api/v1/indexerproxy`, {
    method: "POST",
    apiKey,
    fetchFn,
    headers,
    body: JSON.stringify(desired),
  });
}

export async function wireProwlarr(ctx: WireContext): Promise<StepResult> {
  const prowlarrUrl = ctx.baseUrls.prowlarr;
  if (!prowlarrUrl) {
    return {
      name: STEP_NAME,
      ok: false,
      detail: "prowlarr base URL not configured",
      fallback: "Set baseUrls.prowlarr in wire context",
    };
  }

  const apiKey = ctx.state.apiKeys.prowlarr;
  if (!apiKey) {
    return {
      name: STEP_NAME,
      ok: false,
      detail: "prowlarr API key not configured",
      fallback: "Set state.apiKeys.prowlarr in wire context",
    };
  }

  const sonarrUrl = ctx.baseUrls.sonarr;
  const radarrUrl = ctx.baseUrls.radarr;
  const sonarrKey = ctx.state.apiKeys.sonarr;
  const radarrKey = ctx.state.apiKeys.radarr;

  if (!sonarrUrl || !sonarrKey) {
    return {
      name: STEP_NAME,
      ok: false,
      detail: "sonarr base URL or API key not configured",
      fallback: "Set baseUrls.sonarr and state.apiKeys.sonarr in wire context",
    };
  }

  if (!radarrUrl || !radarrKey) {
    return {
      name: STEP_NAME,
      ok: false,
      detail: "radarr base URL or API key not configured",
      fallback: "Set baseUrls.radarr and state.apiKeys.radarr in wire context",
    };
  }

  const fetchFn = ctx.fetchFn ?? fetch;
  const flaresolverr = ctx.config.services.flaresolverr;

  try {
    const apps = await apiJson<Application[]>(`${prowlarrUrl}/api/v1/applications`, {
      apiKey,
      fetchFn,
    });

    await ensureApplications(
      prowlarrUrl,
      apiKey,
      apps,
      [
        { appType: "Sonarr", appUrl: sonarrUrl, appApiKey: sonarrKey },
        { appType: "Radarr", appUrl: radarrUrl, appApiKey: radarrKey },
      ],
      fetchFn,
    );

    if (flaresolverr) {
      const tagId = await ensureFlareSolverrTag(prowlarrUrl, apiKey, fetchFn);
      await ensureFlareSolverrProxy(prowlarrUrl, apiKey, tagId, fetchFn);
    }

    return {
      name: STEP_NAME,
      ok: true,
      detail: flaresolverr
        ? "sonarr and radarr applications and flaresolverr proxy configured"
        : "sonarr and radarr applications configured",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      name: STEP_NAME,
      ok: false,
      detail: message,
      fallback: flaresolverr
        ? "Add Sonarr/Radarr apps and FlareSolverr indexer proxy in Prowlarr Settings"
        : "Add Sonarr and Radarr apps in Prowlarr Settings => Apps",
    };
  }
}
