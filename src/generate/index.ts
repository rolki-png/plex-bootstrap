import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { stringify } from "yaml";
import type { StackConfig } from "../types.ts";
import { renderEnv } from "./env.ts";
import { ensureFolderSkeleton } from "./folders.ts";
import { mergeCompose, type ServiceModule } from "./merge.ts";
import { buildBazarr } from "./modules/bazarr.ts";
import { buildFlaresolverr } from "./modules/flaresolverr.ts";
import { buildGluetun } from "./modules/gluetun.ts";
import { buildJackett } from "./modules/jackett.ts";
import { buildPlex } from "./modules/plex.ts";
import { buildProwlarr } from "./modules/prowlarr.ts";
import { buildQbittorrent } from "./modules/qbittorrent.ts";
import { buildRadarr } from "./modules/radarr.ts";
import { buildRecyclarr } from "./modules/recyclarr.ts";
import { buildSeerr } from "./modules/seerr.ts";
import { buildSonarr } from "./modules/sonarr.ts";
import { buildTautulli } from "./modules/tautulli.ts";
import { buildUnpackerr } from "./modules/unpackerr.ts";

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
