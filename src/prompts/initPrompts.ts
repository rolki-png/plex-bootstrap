import { input } from "@inquirer/prompts";
import { defaultStackConfig, type StackConfig } from "../types.js";

export async function promptStackConfig(): Promise<StackConfig> {
  const dataRoot = await input({ message: "Data root", default: "/data" });
  const configRoot = await input({
    message: "Config root",
    default: `${dataRoot}/configs`,
  });
  const puid = Number(await input({ message: "PUID", default: "1000" }));
  const pgid = Number(await input({ message: "PGID", default: "1000" }));
  const timezone = await input({ message: "Timezone", default: "UTC" });
  const plexClaim = await input({
    message: "Plex claim token (optional)",
    default: "",
  });

  const base = defaultStackConfig({
    dataRoot,
    configRoot,
    puid,
    pgid,
    timezone,
  });

  return plexClaim ? { ...base, plexClaim } : base;
}
