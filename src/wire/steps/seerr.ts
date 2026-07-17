import { apiJson } from "../http.ts";
import type { StepResult, WireContext } from "../types.ts";

const STEP_NAME = "seerr";
const SONARR_ROOT = "/data/media/tv";
const RADARR_ROOT = "/data/media/movies";
const FALLBACK =
  "Open http://localhost:5055 and configure Settings: Plex server (hostname plex, port 32400), Sonarr (hostname, port, API key, root folder /data/media/tv), Radarr (hostname, port, API key, root folder /data/media/movies)";

type ParsedUrl = {
  hostname: string;
  port: number;
  useSsl: boolean;
  baseUrl: string;
};

type PlexSettings = {
  name?: string;
  machineId?: string;
  ip?: string;
  port?: number;
  useSsl?: boolean;
};

type SonarrSettings = {
  id?: number;
  name: string;
  hostname: string;
  port: number;
  apiKey: string;
  useSsl: boolean;
  baseUrl: string;
  activeProfileId: number;
  activeProfileName: string;
  activeDirectory: string;
  activeLanguageProfileId?: number;
  is4k: boolean;
  isDefault: boolean;
  enableSeasonFolders?: boolean;
};

type RadarrSettings = {
  id?: number;
  name: string;
  hostname: string;
  port: number;
  apiKey: string;
  useSsl: boolean;
  baseUrl: string;
  activeProfileId: number;
  activeProfileName: string;
  activeDirectory: string;
  minimumAvailability: string;
  is4k: boolean;
  isDefault: boolean;
};

type ServiceProfile = { id: number; name: string };

type RootFolder = { id: number; path: string };

type SonarrTestResult = {
  profiles: ServiceProfile[];
  rootFolders: RootFolder[];
  languageProfiles?: ServiceProfile[];
  urlBase?: string;
};

type RadarrTestResult = {
  profiles: ServiceProfile[];
  rootFolders: RootFolder[];
  urlBase?: string;
};

function parseBaseUrl(url: string): ParsedUrl {
  const parsed = new URL(url);
  const defaultPort = parsed.protocol === "https:" ? 443 : 80;
  let basePath = parsed.pathname;
  if (basePath.endsWith("/")) {
    basePath = basePath.slice(0, -1);
  }
  if (basePath === "/") {
    basePath = "";
  }

  return {
    hostname: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : defaultPort,
    useSsl: parsed.protocol === "https:",
    baseUrl: basePath,
  };
}

function pickProfile(profiles: ServiceProfile[]): ServiceProfile {
  const preferred = profiles.find((p) => /1080|720|hd/i.test(p.name));
  return preferred ?? profiles[0]!;
}

function pickRootFolder(folders: RootFolder[], preferredPath: string): RootFolder {
  const preferred = folders.find((f) => f.path === preferredPath);
  return preferred ?? folders[0]!;
}

function sonarrMatches(
  existing: SonarrSettings,
  hostname: string,
  port: number,
  apiKey: string,
  activeDirectory: string,
): boolean {
  return (
    existing.hostname === hostname &&
    existing.port === port &&
    existing.apiKey === apiKey &&
    existing.activeDirectory === activeDirectory &&
    !existing.is4k
  );
}

function radarrMatches(
  existing: RadarrSettings,
  hostname: string,
  port: number,
  apiKey: string,
  activeDirectory: string,
): boolean {
  return (
    existing.hostname === hostname &&
    existing.port === port &&
    existing.apiKey === apiKey &&
    existing.activeDirectory === activeDirectory &&
    !existing.is4k
  );
}

function plexConfigured(plex: PlexSettings, hostname: string, port: number): boolean {
  return Boolean(plex.machineId) && plex.ip === hostname && plex.port === port;
}

async function ensurePlexAuth(
  seerrUrl: string,
  plexToken: string,
  fetchFn: typeof fetch,
): Promise<void> {
  const response = await fetchFn(`${seerrUrl}/api/v1/auth/plex`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ authToken: plexToken }),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
}

async function ensurePlex(
  seerrUrl: string,
  seerrApiKey: string,
  plexUrl: string,
  plex: PlexSettings,
  plexToken: string | undefined,
  fetchFn: typeof fetch,
): Promise<void> {
  const { hostname, port } = parseBaseUrl(plexUrl);

  if (plexConfigured(plex, hostname, port)) {
    return;
  }

  if (plexToken) {
    await ensurePlexAuth(seerrUrl, plexToken, fetchFn);
  }

  await apiJson(`${seerrUrl}/api/v1/settings/plex`, {
    method: "POST",
    apiKey: seerrApiKey,
    fetchFn,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ip: hostname, port, useSsl: false }),
  });
}

async function ensureSonarr(
  seerrUrl: string,
  seerrApiKey: string,
  sonarrUrl: string,
  sonarrApiKey: string,
  existing: SonarrSettings[],
  fetchFn: typeof fetch,
): Promise<void> {
  const parsed = parseBaseUrl(sonarrUrl);
  const match = existing.find((s) => sonarrMatches(s, parsed.hostname, parsed.port, sonarrApiKey, SONARR_ROOT));

  if (match) {
    return;
  }

  const test = await apiJson<SonarrTestResult>(`${seerrUrl}/api/v1/settings/sonarr/test`, {
    method: "POST",
    apiKey: seerrApiKey,
    fetchFn,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      hostname: parsed.hostname,
      port: parsed.port,
      apiKey: sonarrApiKey,
      useSsl: parsed.useSsl,
      baseUrl: parsed.baseUrl,
    }),
  });

  const profile = pickProfile(test.profiles);
  const root = pickRootFolder(test.rootFolders, SONARR_ROOT);
  const languageProfileId = test.languageProfiles?.[0]?.id ?? 1;

  const desired: SonarrSettings = {
    name: "Sonarr",
    hostname: parsed.hostname,
    port: parsed.port,
    apiKey: sonarrApiKey,
    useSsl: parsed.useSsl,
    baseUrl: test.urlBase ?? parsed.baseUrl,
    activeProfileId: profile.id,
    activeProfileName: profile.name,
    activeDirectory: root.path,
    activeLanguageProfileId: languageProfileId,
    is4k: false,
    isDefault: true,
    enableSeasonFolders: false,
  };

  const current = existing.find((s) => s.name === "Sonarr" && !s.is4k);

  if (current?.id !== undefined) {
    await apiJson(`${seerrUrl}/api/v1/settings/sonarr/${current.id}`, {
      method: "PUT",
      apiKey: seerrApiKey,
      fetchFn,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...desired, id: current.id }),
    });
    return;
  }

  await apiJson(`${seerrUrl}/api/v1/settings/sonarr`, {
    method: "POST",
    apiKey: seerrApiKey,
    fetchFn,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(desired),
  });
}

async function ensureRadarr(
  seerrUrl: string,
  seerrApiKey: string,
  radarrUrl: string,
  radarrApiKey: string,
  existing: RadarrSettings[],
  fetchFn: typeof fetch,
): Promise<void> {
  const parsed = parseBaseUrl(radarrUrl);
  const match = existing.find((r) => radarrMatches(r, parsed.hostname, parsed.port, radarrApiKey, RADARR_ROOT));

  if (match) {
    return;
  }

  const test = await apiJson<RadarrTestResult>(`${seerrUrl}/api/v1/settings/radarr/test`, {
    method: "POST",
    apiKey: seerrApiKey,
    fetchFn,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      hostname: parsed.hostname,
      port: parsed.port,
      apiKey: radarrApiKey,
      useSsl: parsed.useSsl,
      baseUrl: parsed.baseUrl,
    }),
  });

  const profile = pickProfile(test.profiles);
  const root = pickRootFolder(test.rootFolders, RADARR_ROOT);

  const desired: RadarrSettings = {
    name: "Radarr",
    hostname: parsed.hostname,
    port: parsed.port,
    apiKey: radarrApiKey,
    useSsl: parsed.useSsl,
    baseUrl: test.urlBase ?? parsed.baseUrl,
    activeProfileId: profile.id,
    activeProfileName: profile.name,
    activeDirectory: root.path,
    minimumAvailability: "released",
    is4k: false,
    isDefault: true,
  };

  const current = existing.find((r) => r.name === "Radarr" && !r.is4k);

  if (current?.id !== undefined) {
    await apiJson(`${seerrUrl}/api/v1/settings/radarr/${current.id}`, {
      method: "PUT",
      apiKey: seerrApiKey,
      fetchFn,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...desired, id: current.id }),
    });
    return;
  }

  await apiJson(`${seerrUrl}/api/v1/settings/radarr`, {
    method: "POST",
    apiKey: seerrApiKey,
    fetchFn,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(desired),
  });
}

export async function wireSeerr(ctx: WireContext): Promise<StepResult> {
  const seerrUrl = ctx.baseUrls.seerr;
  if (!seerrUrl) {
    return {
      name: STEP_NAME,
      ok: false,
      detail: "seerr base URL not configured",
      fallback: FALLBACK,
    };
  }

  const seerrApiKey = ctx.state.apiKeys.seerr;
  if (!seerrApiKey) {
    return {
      name: STEP_NAME,
      ok: false,
      detail: "seerr API key not configured",
      fallback: FALLBACK,
    };
  }

  const sonarrUrl = ctx.baseUrls.sonarr;
  const radarrUrl = ctx.baseUrls.radarr;
  const plexUrl = ctx.baseUrls.plex;
  const sonarrKey = ctx.state.apiKeys.sonarr;
  const radarrKey = ctx.state.apiKeys.radarr;

  if (!sonarrUrl || !sonarrKey) {
    return {
      name: STEP_NAME,
      ok: false,
      detail: "sonarr base URL or API key not configured",
      fallback: FALLBACK,
    };
  }

  if (!radarrUrl || !radarrKey) {
    return {
      name: STEP_NAME,
      ok: false,
      detail: "radarr base URL or API key not configured",
      fallback: FALLBACK,
    };
  }

  if (!plexUrl) {
    return {
      name: STEP_NAME,
      ok: false,
      detail: "plex base URL not configured",
      fallback: FALLBACK,
    };
  }

  const fetchFn = ctx.fetchFn ?? fetch;
  const plexToken = ctx.state.apiKeys.plex;

  try {
    const [sonarr, radarr, plex] = await Promise.all([
      apiJson<SonarrSettings[]>(`${seerrUrl}/api/v1/settings/sonarr`, { apiKey: seerrApiKey, fetchFn }),
      apiJson<RadarrSettings[]>(`${seerrUrl}/api/v1/settings/radarr`, { apiKey: seerrApiKey, fetchFn }),
      apiJson<PlexSettings>(`${seerrUrl}/api/v1/settings/plex`, { apiKey: seerrApiKey, fetchFn }),
    ]);

    await ensureSonarr(seerrUrl, seerrApiKey, sonarrUrl, sonarrKey, sonarr, fetchFn);
    await ensureRadarr(seerrUrl, seerrApiKey, radarrUrl, radarrKey, radarr, fetchFn);
    await ensurePlex(seerrUrl, seerrApiKey, plexUrl, plex, plexToken, fetchFn);

    return {
      name: STEP_NAME,
      ok: true,
      detail: "plex, sonarr, and radarr configured",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      name: STEP_NAME,
      ok: false,
      detail: message,
      fallback: FALLBACK,
    };
  }
}
