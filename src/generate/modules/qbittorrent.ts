import type { StackConfig } from "../../types.ts";
import type { ServiceModule } from "../merge.ts";
import { linuxserverEnv, standardVolumes } from "./linuxserver.ts";
import { downloadOnly } from "./networks.ts";

export function buildQbittorrent(_cfg: StackConfig): ServiceModule {
  return {
    name: "qbittorrent",
    service: {
      image: "lscr.io/linuxserver/qbittorrent:latest",
      container_name: "qbittorrent",
      environment: linuxserverEnv({
        WEBUI_PORT: "8080",
      }),
      volumes: standardVolumes("qbittorrent"),
      ports: ["8080:8080"],
      networks: downloadOnly(),
      restart: "unless-stopped",
    },
  };
}
