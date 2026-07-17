import { ensureDownloadClient, ensureRootFolder } from "./arr-shared.ts";
import type { StepResult, WireContext } from "../types.ts";

const STEP_NAME = "radarr";
const ROOT_PATH = "/data/media/movies";
const CATEGORY = "movies";

export async function wireRadarr(ctx: WireContext): Promise<StepResult> {
  const baseUrl = ctx.baseUrls.radarr;
  if (!baseUrl) {
    return {
      name: STEP_NAME,
      ok: false,
      detail: "radarr base URL not configured",
      fallback: "Set baseUrls.radarr in wire context",
    };
  }

  const apiKey = ctx.state.apiKeys.radarr;
  if (!apiKey) {
    return {
      name: STEP_NAME,
      ok: false,
      detail: "radarr API key not configured",
      fallback: "Set state.apiKeys.radarr in wire context",
    };
  }

  const fetchFn = ctx.fetchFn ?? fetch;
  const password = ctx.state.apiKeys.qbittorrent;

  try {
    await ensureRootFolder(baseUrl, apiKey, ROOT_PATH, fetchFn);
    await ensureDownloadClient(
      baseUrl,
      apiKey,
      {
        categoryField: "MovieCategory",
        category: CATEGORY,
        vpn: ctx.config.services.vpn,
        password,
      },
      fetchFn,
    );

    return {
      name: STEP_NAME,
      ok: true,
      detail: "root folder and download client configured",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      name: STEP_NAME,
      ok: false,
      detail: message,
      fallback: `Add root folder ${ROOT_PATH} and qBittorrent download client with category ${CATEGORY} in Radarr Settings`,
    };
  }
}
