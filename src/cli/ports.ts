import type { StackConfig } from "../types.js";

const LOCAL_PORTS: Record<string, number> = {
  plex: 32400,
  seerr: 5055,
  sonarr: 8989,
  radarr: 7878,
  prowlarr: 9696,
  qbittorrent: 8080,
  bazarr: 6767,
  tautulli: 8181,
  jackett: 9117,
};

function urlsForEnabledServices(
  config: StackConfig,
  format: (service: string, port: number) => string,
): Record<string, string> {
  const urls: Record<string, string> = {};

  for (const [service, port] of Object.entries(LOCAL_PORTS)) {
    const flag = config.services[service as keyof StackConfig["services"]];
    if (flag) {
      urls[service] = format(service, port);
    }
  }

  return urls;
}

/** Host-reachable URLs for CLI API calls. */
export function buildLocalBaseUrls(config: StackConfig): Record<string, string> {
  return urlsForEnabledServices(config, (_service, port) => `http://localhost:${port}`);
}

/** Docker DNS URLs for config persisted inside containers. */
export function buildInternalUrls(config: StackConfig): Record<string, string> {
  return urlsForEnabledServices(config, (service, port) => `http://${service}:${port}`);
}
