import type { StackConfig } from "../../types.ts";
import type { ServiceModule } from "../merge.ts";
import { linuxserverEnv, standardVolumes } from "./linuxserver.ts";
import { mediaAndDownload } from "./networks.ts";

export function buildRadarr(_cfg: StackConfig): ServiceModule {
  return {
    name: "radarr",
    service: {
      image: "lscr.io/linuxserver/radarr:latest",
      container_name: "radarr",
      environment: linuxserverEnv(),
      volumes: standardVolumes("radarr"),
      networks: mediaAndDownload(),
      restart: "unless-stopped",
    },
  };
}
