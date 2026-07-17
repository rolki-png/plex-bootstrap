import type { StackConfig } from "../../types.ts";
import type { ServiceModule } from "../merge.ts";
import { mediaAndDownload } from "./networks.ts";

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
