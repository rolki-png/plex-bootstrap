import type { StackConfig } from "../../types.js";
import type { ServiceModule } from "../merge.js";
import { linuxserverEnv, standardVolumes } from "./linuxserver.js";
import { mediaAndDownload } from "./networks.js";

export function buildSonarr(_cfg: StackConfig): ServiceModule {
  return {
    name: "sonarr",
    service: {
      image: "lscr.io/linuxserver/sonarr:latest",
      container_name: "sonarr",
      environment: linuxserverEnv(),
      volumes: standardVolumes("sonarr"),
      ports: ["8989:8989"],
      networks: mediaAndDownload(),
      restart: "unless-stopped",
    },
  };
}
