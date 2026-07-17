import type { StackConfig } from "../../types.ts";
import type { ServiceModule } from "../merge.ts";
import { mediaOnly } from "./networks.ts";

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
