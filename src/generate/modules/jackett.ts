import type { StackConfig } from "../../types.js";
import type { ServiceModule } from "../merge.js";
import { linuxserverEnv, standardVolumes } from "./linuxserver.js";
import { mediaOnly } from "./networks.js";

export function buildJackett(_cfg: StackConfig): ServiceModule {
  return {
    name: "jackett",
    service: {
      image: "lscr.io/linuxserver/jackett:latest",
      container_name: "jackett",
      environment: linuxserverEnv(),
      volumes: standardVolumes("jackett"),
      networks: mediaOnly(),
      restart: "unless-stopped",
    },
  };
}
