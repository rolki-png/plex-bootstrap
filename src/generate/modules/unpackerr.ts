import type { StackConfig } from "../../types.js";
import type { ServiceModule } from "../merge.js";
import { standardVolumes } from "./linuxserver.js";
import { mediaAndDownload } from "./networks.js";

export function buildUnpackerr(_cfg: StackConfig): ServiceModule {
  return {
    name: "unpackerr",
    service: {
      image: "ghcr.io/unpackerr/unpackerr:latest",
      container_name: "unpackerr",
      environment: {
        TZ: "${TZ}",
      },
      user: "${PUID}:${PGID}",
      volumes: standardVolumes("unpackerr"),
      networks: mediaAndDownload(),
      restart: "unless-stopped",
    },
  };
}
