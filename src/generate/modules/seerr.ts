import type { StackConfig } from "../../types.ts";
import type { ServiceModule } from "../merge.ts";
import { mediaOnly } from "./networks.ts";

export function buildSeerr(_cfg: StackConfig): ServiceModule {
  return {
    name: "seerr",
    service: {
      image: "ghcr.io/seerr-team/seerr:latest",
      container_name: "seerr",
      environment: {
        TZ: "${TZ}",
      },
      volumes: ["${CONFIG_ROOT}/seerr:/app/config"],
      ports: ["5055:5055"],
      networks: mediaOnly(),
      restart: "unless-stopped",
    },
  };
}
