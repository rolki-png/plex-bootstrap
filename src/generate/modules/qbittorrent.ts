import type { StackConfig } from "../../types.ts";
import type { ServiceModule } from "../merge.ts";
import { linuxserverEnv, standardVolumes } from "./linuxserver.ts";
import { downloadOnly } from "./networks.ts";

export function buildQbittorrent(cfg: StackConfig): ServiceModule {
  const base = {
    image: "lscr.io/linuxserver/qbittorrent:latest",
    container_name: "qbittorrent",
    environment: linuxserverEnv({
      WEBUI_PORT: "8080",
    }),
    volumes: standardVolumes("qbittorrent"),
    restart: "unless-stopped",
  };

  if (cfg.services.vpn) {
    return {
      name: "qbittorrent",
      service: {
        ...base,
        network_mode: "service:gluetun",
        depends_on: ["gluetun"],
      },
    };
  }

  return {
    name: "qbittorrent",
    service: {
      ...base,
      ports: ["8080:8080"],
      networks: downloadOnly(),
    },
  };
}
