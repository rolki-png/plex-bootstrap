import type { StackConfig } from "../../types.js";
import type { ServiceModule } from "../merge.js";
import { linuxserverEnv, standardVolumes } from "./linuxserver.js";
import { mediaAndDownload } from "./networks.js";

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
