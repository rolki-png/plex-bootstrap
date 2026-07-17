import type { StackConfig } from "../../types.js";
import type { ServiceModule } from "../merge.js";
import { linuxserverEnv, standardVolumes } from "./linuxserver.js";
import { mediaOnly } from "./networks.js";

export function buildTautulli(_cfg: StackConfig): ServiceModule {
  return {
    name: "tautulli",
    service: {
      image: "lscr.io/linuxserver/tautulli:latest",
      container_name: "tautulli",
      environment: linuxserverEnv(),
      volumes: standardVolumes("tautulli"),
      ports: ["8181:8181"],
      networks: mediaOnly(),
      restart: "unless-stopped",
    },
  };
}
