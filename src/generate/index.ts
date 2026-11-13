import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { stringify } from "yaml";
import type { StackConfig } from "../types.js";
import { renderEnv } from "./env.js";
import { ensureFolderSkeleton } from "./folders.js";
import { seedQbittorrentConf } from "./qbittorrent-conf.js";
import { mergeCompose, type ServiceModule } from "./merge.js";
import { buildBazarr } from "./modules/bazarr.js";
import { buildFlaresolverr } from "./modules/flaresolverr.js";
import { buildGluetun } from "./modules/gluetun.js";
import { buildJackett } from "./modules/jackett.js";
import { buildPlex } from "./modules/plex.js";
import { buildProwlarr } from "./modules/prowlarr.js";
import { buildQbittorrent } from "./modules/qbittorrent.js";
import { buildRadarr } from "./modules/radarr.js";
import { buildRecyclarr } from "./modules/recyclarr.js";
import { buildSeerr } from "./modules/seerr.js";
import { buildSonarr } from "./modules/sonarr.js";
import { buildTautulli } from "./modules/tautulli.js";
import { buildUnpackerr } from "./modules/unpackerr.js";

export type GenerateResult = {
  composePath: string;
  envPath: string;
  services: string[];
};

type Builder = {
  flag: keyof StackConfig["services"];
  build: (cfg: StackConfig) => ServiceModule;
};

const CORE_BUILDERS: Builder[] = [
  { flag: "plex", build: buildPlex },
  { flag: "seerr", build: buildSeerr },
  { flag: "sonarr", build: buildSonarr },
  { flag: "radarr", build: buildRadarr },
  { flag: "prowlarr", build: buildProwlarr },
  { flag: "qbittorrent", build: buildQbittorrent },
];

const EXTRA_BUILDERS: Builder[] = [
  { flag: "jackett", build: buildJackett },
  { flag: "flaresolverr", build: buildFlaresolverr },
  { flag: "unpackerr", build: buildUnpackerr },
  { flag: "bazarr", build: buildBazarr },
  { flag: "tautulli", build: buildTautulli },
  { flag: "recyclarr", build: buildRecyclarr },
];

function collectModules(config: StackConfig): ServiceModule[] {
  const modules: ServiceModule[] = [];

  for (const { flag, build } of CORE_BUILDERS) {
    if (!config.services[flag]) continue;
    if (flag === "qbittorrent" && config.services.vpn) {
      modules.push(buildGluetun(config));
    }
    modules.push(build(config));
  }

  for (const { flag, build } of EXTRA_BUILDERS) {
    if (config.services[flag]) modules.push(build(config));
  }

  return modules;
}

export async function generateStack(config: StackConfig, outDir: string): Promise<GenerateResult> {
  await ensureFolderSkeleton(config);
  await seedQbittorrentConf(config);
  const modules = collectModules(config);

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
