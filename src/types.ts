export type ServiceFlags = {
  plex: boolean;
  seerr: boolean;
  sonarr: boolean;
  radarr: boolean;
  prowlarr: boolean;
  qbittorrent: boolean;
  jackett: boolean;
  flaresolverr: boolean;
  unpackerr: boolean;
  bazarr: boolean;
  tautulli: boolean;
  recyclarr: boolean;
  vpn: boolean;
};

export type VpnConfig = {
  provider: string;
  username: string;
  password: string;
  openvpnUser?: string;
  openvpnPassword?: string;
};

export type StackConfig = {
  dataRoot: string;
  configRoot: string;
  puid: number;
  pgid: number;
  timezone: string;
  plexClaim?: string;
  services: ServiceFlags;
  vpn?: VpnConfig;
};

export function defaultStackConfig(
  base: Pick<StackConfig, "dataRoot" | "configRoot" | "puid" | "pgid" | "timezone">,
): StackConfig {
  return {
    ...base,
    services: {
      plex: true,
      seerr: true,
      sonarr: true,
      radarr: true,
      prowlarr: true,
      qbittorrent: true,
      jackett: false,
      flaresolverr: false,
      unpackerr: false,
      bazarr: false,
      tautulli: false,
      recyclarr: false,
      vpn: false,
    },
  };
}

export function isCoreComplete(cfg: StackConfig): boolean {
  const s = cfg.services;
  return s.plex && s.seerr && s.sonarr && s.radarr && s.prowlarr && s.qbittorrent;
}
