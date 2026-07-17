import type { StackConfig } from "../../types.js";
import type { ServiceModule } from "../merge.js";
import { linuxserverEnv, standardVolumes } from "./linuxserver.js";
import { mediaOnly } from "./networks.js";

export function buildPlex(_cfg: StackConfig): ServiceModule {
  return {
    name: "plex",
    service: {
      image: "lscr.io/linuxserver/plex:latest",
      container_name: "plex",
      environment: linuxserverEnv({
        VERSION: "docker",
        PLEX_CLAIM: "${PLEX_CLAIM}",
      }),
      volumes: standardVolumes("plex"),
      ports: ["32400:32400"],
      networks: mediaOnly(),
      restart: "unless-stopped",
    },
  };
}
