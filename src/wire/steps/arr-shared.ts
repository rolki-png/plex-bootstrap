import { apiJson } from "../http.ts";

const CLIENT_NAME = "qBittorrent";
const DEFAULT_USER = "admin";
const DEFAULT_PASSWORD = "adminadmin";

export type ArrField = { name: string; value: unknown };

export type RootFolder = { id: number; path: string };

export type DownloadClient = {
  id?: number;
  name: string;
  implementation: string;
  configContract: string;
  enable: boolean;
  protocol: string;
  priority: number;
  removeCompletedDownloads: boolean;
  removeFailedDownloads: boolean;
  fields: ArrField[];
  tags: number[];
};

export function qbittorrentHost(vpn: boolean): string {
  return vpn ? "gluetun" : "qbittorrent";
}

function fieldValue(fields: ArrField[], name: string): unknown {
  return fields.find((f) => f.name === name)?.value;
}

function withField(fields: ArrField[], name: string, value: unknown): ArrField[] {
  if (fields.some((f) => f.name === name)) {
    return fields.map((f) => (f.name === name ? { ...f, value } : f));
  }
  return [...fields, { name, value }];
}

function clientMatches(
  client: DownloadClient,
  host: string,
  categoryField: string,
  category: string,
  password: string,
): boolean {
  return (
    fieldValue(client.fields, "Host") === host &&
    fieldValue(client.fields, "Port") === 8080 &&
    fieldValue(client.fields, "Username") === DEFAULT_USER &&
    fieldValue(client.fields, "Password") === password &&
    fieldValue(client.fields, categoryField) === category
  );
}

function buildQBittorrentClient(
  host: string,
  categoryField: string,
  category: string,
  password: string,
  existing?: DownloadClient,
): DownloadClient {
  const base: DownloadClient = existing ?? {
    enable: true,
    protocol: "torrent",
    priority: 1,
    removeCompletedDownloads: true,
    removeFailedDownloads: true,
    name: CLIENT_NAME,
    implementation: "QBittorrent",
    configContract: "QBittorrentSettings",
    fields: [],
    tags: [],
  };

  let fields = base.fields;
  fields = withField(fields, "Host", host);
  fields = withField(fields, "Port", 8080);
  fields = withField(fields, "UseSsl", false);
  fields = withField(fields, "Username", DEFAULT_USER);
  fields = withField(fields, "Password", password);
  fields = withField(fields, categoryField, category);

  return { ...base, fields };
}

export async function ensureRootFolder(
  baseUrl: string,
  apiKey: string,
  path: string,
  fetchFn: typeof fetch,
): Promise<void> {
  const folders = await apiJson<RootFolder[]>(`${baseUrl}/api/v3/rootfolder`, {
    apiKey,
    fetchFn,
  });

  if (folders.some((f) => f.path === path)) {
    return;
  }

  await apiJson(`${baseUrl}/api/v3/rootfolder`, {
    method: "POST",
    apiKey,
    fetchFn,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path }),
  });
}

export async function ensureDownloadClient(
  baseUrl: string,
  apiKey: string,
  options: {
    categoryField: "TvCategory" | "MovieCategory";
    category: string;
    vpn: boolean;
    password?: string;
  },
  fetchFn: typeof fetch,
): Promise<void> {
  const host = qbittorrentHost(options.vpn);
  const password = options.password ?? DEFAULT_PASSWORD;

  const clients = await apiJson<DownloadClient[]>(`${baseUrl}/api/v3/downloadclient`, {
    apiKey,
    fetchFn,
  });

  const existing = clients.find((c) => c.name === CLIENT_NAME);
  const desired = buildQBittorrentClient(
    host,
    options.categoryField,
    options.category,
    password,
    existing,
  );

  if (existing && clientMatches(existing, host, options.categoryField, options.category, password)) {
    return;
  }

  const headers = { "Content-Type": "application/json" };

  if (existing?.id !== undefined) {
    await apiJson(`${baseUrl}/api/v3/downloadclient/${existing.id}`, {
      method: "PUT",
      apiKey,
      fetchFn,
      headers,
      body: JSON.stringify(desired),
    });
    return;
  }

  await apiJson(`${baseUrl}/api/v3/downloadclient`, {
    method: "POST",
    apiKey,
    fetchFn,
    headers,
    body: JSON.stringify(desired),
  });
}
