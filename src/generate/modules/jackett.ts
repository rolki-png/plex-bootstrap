import type { StackConfig } from "../../types.ts";
import type { ServiceModule } from "../merge.ts";
import { linuxserverEnv, standardVolumes } from "./linuxserver.ts";
import { mediaOnly } from "./networks.ts";

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
