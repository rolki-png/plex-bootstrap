export type ServiceModule = {
  name: string;
  service: Record<string, unknown>;
};

export function mergeCompose(modules: ServiceModule[]): Record<string, unknown> {
  const services: Record<string, unknown> = {};
  for (const m of modules) services[m.name] = m.service;
  return {
    networks: {
      media: { name: "pb_media" },
      download: { name: "pb_download" },
    },
    services,
  };
}
