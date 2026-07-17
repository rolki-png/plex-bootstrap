import type { StackConfig } from "../../types.ts";
import type { ServiceModule } from "../merge.ts";
import { mediaOnly } from "./networks.ts";

export function buildRecyclarr(_cfg: StackConfig): ServiceModule {
  return {
    name: "recyclarr",
    service: {
      image: "ghcr.io/recyclarr/recyclarr:latest",
      container_name: "recyclarr",
      user: "${PUID}:${PGID}",
      entrypoint: ["recyclarr"],
      command: ["sync"],
      environment: {
        TZ: "${TZ}",
      },
      volumes: ["${CONFIG_ROOT}/recyclarr:/config"],
      networks: mediaOnly(),
      restart: "no",
    },
  };
}
