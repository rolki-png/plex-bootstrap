import type { StackConfig } from "../../types.js";
import type { ServiceModule } from "../merge.js";
import { linuxserverEnv, standardVolumes } from "./linuxserver.js";
import { downloadOnly } from "./networks.js";

export function buildQbittorrent(cfg: StackConfig): ServiceModule {
  const base = {
    image: "lscr.io/linuxserver/qbittorrent:latest",
    container_name: "qbittorrent",
    environment: linuxserverEnv({
      WEBUI_PORT: "8080",
      WEBUI_PASSWORD: "${WEBUI_PASSWORD}",
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
