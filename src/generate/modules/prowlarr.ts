import type { StackConfig } from "../../types.js";
import type { ServiceModule } from "../merge.js";
import { linuxserverEnv, standardVolumes } from "./linuxserver.js";
import { mediaOnly } from "./networks.js";

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
