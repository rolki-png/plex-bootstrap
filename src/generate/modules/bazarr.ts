import type { StackConfig } from "../../types.js";
import type { ServiceModule } from "../merge.js";
import { linuxserverEnv, standardVolumes } from "./linuxserver.js";
import { mediaOnly } from "./networks.js";

export function buildBazarr(_cfg: StackConfig): ServiceModule {
  return {
    name: "bazarr",
    service: {
      image: "lscr.io/linuxserver/bazarr:latest",
      container_name: "bazarr",
      environment: linuxserverEnv(),
      volumes: standardVolumes("bazarr"),
      networks: mediaOnly(),
      restart: "unless-stopped",
    },
  };
}
