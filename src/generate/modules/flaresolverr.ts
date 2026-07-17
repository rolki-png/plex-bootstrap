import type { StackConfig } from "../../types.js";
import type { ServiceModule } from "../merge.js";
import { mediaOnly } from "./networks.js";

export function buildFlaresolverr(_cfg: StackConfig): ServiceModule {
  return {
    name: "flaresolverr",
    service: {
      image: "ghcr.io/flaresolverr/flaresolverr:latest",
      container_name: "flaresolverr",
      environment: {
        TZ: "${TZ}",
      },
      networks: mediaOnly(),
      restart: "unless-stopped",
    },
  };
}
