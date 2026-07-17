import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { stringify } from "yaml";
import type { StackConfig } from "../types.ts";
import { renderEnv } from "./env.ts";
import { mergeCompose, type ServiceModule } from "./merge.ts";
import { buildPlex } from "./modules/plex.ts";
import { buildProwlarr } from "./modules/prowlarr.ts";
import { buildQbittorrent } from "./modules/qbittorrent.ts";
import { buildRadarr } from "./modules/radarr.ts";
import { buildSeerr } from "./modules/seerr.ts";
import { buildSonarr } from "./modules/sonarr.ts";

export type GenerateResult = {
  composePath: string;
  envPath: string;
  services: string[];
};

const CORE_BUILDERS: Array<{
  flag: keyof StackConfig["services"];
  build: (cfg: StackConfig) => ServiceModule;
}> = [
  { flag: "plex", build: buildPlex },
  { flag: "seerr", build: buildSeerr },
  { flag: "sonarr", build: buildSonarr },
  { flag: "radarr", build: buildRadarr },
  { flag: "prowlarr", build: buildProwlarr },
  { flag: "qbittorrent", build: buildQbittorrent },
];

export async function generateStack(config: StackConfig, outDir: string): Promise<GenerateResult> {
  const modules = CORE_BUILDERS.filter(({ flag }) => config.services[flag]).map(({ build }) =>
    build(config),
  );

  const doc = mergeCompose(modules);
  const composePath = join(outDir, "docker-compose.yml");
  const envPath = join(outDir, ".env");

  await writeFile(composePath, stringify(doc), "utf8");
  await writeFile(envPath, renderEnv(config), "utf8");

  return {
    composePath,
    envPath,
    services: modules.map((m) => m.name),
  };
}
