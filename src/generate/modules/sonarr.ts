import type { StackConfig } from "../../types.ts";
import type { ServiceModule } from "../merge.ts";
import { linuxserverEnv, standardVolumes } from "./linuxserver.ts";
import { mediaAndDownload } from "./networks.ts";

export function buildSonarr(_cfg: StackConfig): ServiceModule {
  return {
    name: "sonarr",
    service: {
      image: "lscr.io/linuxserver/sonarr:latest",
      container_name: "sonarr",
      environment: linuxserverEnv(),
      volumes: standardVolumes("sonarr"),
      networks: mediaAndDownload(),
      restart: "unless-stopped",
    },
  };
}
