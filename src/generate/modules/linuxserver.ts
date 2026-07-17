export function linuxserverEnv(extra?: Record<string, string>): Record<string, string> {
  return {
    PUID: "${PUID}",
    PGID: "${PGID}",
    TZ: "${TZ}",
    ...extra,
  };
}

export function standardVolumes(app: string): string[] {
  return [`\${CONFIG_ROOT}/${app}:/config`, "${DATA_ROOT}:/data"];
}
