import type { StackConfig } from "../../types.js";
import type { ServiceModule } from "../merge.js";
import { mediaOnly } from "./networks.js";

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
