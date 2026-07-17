import type { StackConfig } from "../../types.ts";
import type { ServiceModule } from "../merge.ts";
import { linuxserverEnv, standardVolumes } from "./linuxserver.ts";
import { mediaOnly } from "./networks.ts";

export function buildProwlarr(_cfg: StackConfig): ServiceModule {
  return {
    name: "prowlarr",
    service: {
      image: "lscr.io/linuxserver/prowlarr:latest",
      container_name: "prowlarr",
      environment: linuxserverEnv(),
      volumes: standardVolumes("prowlarr"),
      networks: mediaOnly(),
      restart: "unless-stopped",
    },
  };
}
