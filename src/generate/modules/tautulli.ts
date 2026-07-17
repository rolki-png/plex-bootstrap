import type { StackConfig } from "../../types.ts";
import type { ServiceModule } from "../merge.ts";
import { linuxserverEnv, standardVolumes } from "./linuxserver.ts";
import { mediaOnly } from "./networks.ts";

export function buildTautulli(_cfg: StackConfig): ServiceModule {
  return {
    name: "tautulli",
    service: {
      image: "lscr.io/linuxserver/tautulli:latest",
      container_name: "tautulli",
      environment: linuxserverEnv(),
      volumes: standardVolumes("tautulli"),
      networks: mediaOnly(),
      restart: "unless-stopped",
    },
  };
}
