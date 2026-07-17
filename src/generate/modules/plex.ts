import type { StackConfig } from "../../types.ts";
import type { ServiceModule } from "../merge.ts";
import { linuxserverEnv, standardVolumes } from "./linuxserver.ts";
import { mediaOnly } from "./networks.ts";

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
