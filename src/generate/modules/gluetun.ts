import type { StackConfig } from "../../types.js";
import type { ServiceModule } from "../merge.js";
import { downloadOnly } from "./networks.js";

export function buildGluetun(cfg: StackConfig): ServiceModule {
  const vpn = cfg.vpn ?? { provider: "", username: "", password: "" };
  return {
    name: "gluetun",
    service: {
      image: "qmcgaw/gluetun:latest",
      container_name: "gluetun",
      cap_add: ["NET_ADMIN"],
      devices: ["/dev/net/tun:/dev/net/tun"],
      environment: {
        VPN_SERVICE_PROVIDER: vpn.provider,
        OPENVPN_USER: vpn.openvpnUser ?? vpn.username,
        OPENVPN_PASSWORD: vpn.openvpnPassword ?? vpn.password,
        TZ: "${TZ}",
      },
      ports: ["8080:8080"],
      networks: downloadOnly(),
      restart: "unless-stopped",
    },
  };
}
