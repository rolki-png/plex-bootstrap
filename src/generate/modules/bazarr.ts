import type { StackConfig } from "../../types.ts";
import type { ServiceModule } from "../merge.ts";
import { linuxserverEnv, standardVolumes } from "./linuxserver.ts";
import { mediaOnly } from "./networks.ts";

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
