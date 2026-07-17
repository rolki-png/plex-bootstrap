import type { StackConfig } from "../../types.js";
import type { ServiceModule } from "../merge.js";
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
      volumes: ["${CONFIG_ROOT}/unpackerr:/config"],
      networks: mediaAndDownload(),
      restart: "unless-stopped",
    },
  };
}
