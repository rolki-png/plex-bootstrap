import { checkbox, confirm, input, password } from "@inquirer/prompts";
import {
  DEFAULT_QBITTORRENT_PASSWORD,
  defaultStackConfig,
  type StackConfig,
  type VpnConfig,
} from "../types.js";

export type PromptFns = {
  input: typeof input;
  checkbox: typeof checkbox;
  confirm: typeof confirm;
  password: typeof password;
};

type ExtraFlag = "jackett" | "flaresolverr" | "unpackerr" | "bazarr" | "tautulli" | "recyclarr";

const EXTRA_CHOICES: { name: string; value: ExtraFlag }[] = [
  { name: "Jackett (extra indexer manager)", value: "jackett" },
  { name: "FlareSolverr (Cloudflare solver for Prowlarr/Jackett)", value: "flaresolverr" },
  { name: "Unpackerr (auto-extract archives)", value: "unpackerr" },
  { name: "Bazarr (subtitles)", value: "bazarr" },
  { name: "Tautulli (Plex stats)", value: "tautulli" },
  { name: "Recyclarr (TRaSH guides sync)", value: "recyclarr" },
];

export async function promptStackConfig(prompts: Partial<PromptFns> = {}): Promise<StackConfig> {
  const askInput = prompts.input ?? input;
  const askCheckbox = prompts.checkbox ?? checkbox;
  const askConfirm = prompts.confirm ?? confirm;
  const askPassword = prompts.password ?? password;

  const dataRoot = await askInput({ message: "Data root", default: "/data" });
  const configRoot = await askInput({
    message: "Config root",
    default: `${dataRoot}/configs`,
  });
  const puid = Number(await askInput({ message: "PUID", default: "1000" }));
  const pgid = Number(await askInput({ message: "PGID", default: "1000" }));
  const timezone = await askInput({ message: "Timezone", default: "UTC" });
  const plexClaim = await askInput({
    message: "Plex claim token (optional)",
    default: "",
  });
  const qbittorrentPassword = await askInput({
    message: "qBittorrent WebUI password",
    default: DEFAULT_QBITTORRENT_PASSWORD,
  });

  const extras = await askCheckbox<ExtraFlag>({
    message: "Optional extras",
    choices: EXTRA_CHOICES,
  });

  const config = defaultStackConfig({ dataRoot, configRoot, puid, pgid, timezone });
  config.qbittorrentPassword = qbittorrentPassword || DEFAULT_QBITTORRENT_PASSWORD;

  for (const extra of extras) {
    config.services[extra] = true;
  }

  if (plexClaim) {
    config.plexClaim = plexClaim;
  }

  const enableVpn = await askConfirm({
    message: "Route qBittorrent through a VPN?",
    default: false,
  });

  if (enableVpn) {
    const provider = await askInput({ message: "VPN provider", default: "" });
    const username = await askInput({ message: "VPN username", default: "" });
    const vpnPassword = await askPassword({ message: "VPN password", mask: true });

    const vpn: VpnConfig = { provider, username, password: vpnPassword };
    config.services.vpn = true;
    config.vpn = vpn;
  }

  return config;
}
