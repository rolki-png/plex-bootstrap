import { ensureDownloadClient, ensureRootFolder } from "./arr-shared.js";
import type { StepResult, WireContext } from "../types.js";

const STEP_NAME = "sonarr";
const ROOT_PATH = "/data/media/tv";
const CATEGORY = "tv";

export async function wireSonarr(ctx: WireContext): Promise<StepResult> {
  const baseUrl = ctx.baseUrls.sonarr;
  if (!baseUrl) {
    return {
      name: STEP_NAME,
      ok: false,
      detail: "sonarr base URL not configured",
      fallback: "Set baseUrls.sonarr in wire context",
    };
  }

  const apiKey = ctx.state.apiKeys.sonarr;
  if (!apiKey) {
    return {
      name: STEP_NAME,
      ok: false,
      detail: "sonarr API key not configured",
      fallback: "Set state.apiKeys.sonarr in wire context",
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
        categoryField: "TvCategory",
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
      fallback: `Add root folder ${ROOT_PATH} and qBittorrent download client with category ${CATEGORY} in Sonarr Settings`,
    };
  }
}
