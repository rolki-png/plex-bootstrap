export const NETWORK_MEDIA = "media";
export const NETWORK_DOWNLOAD = "download";

export function mediaOnly(): string[] {
  return [NETWORK_MEDIA];
}

export function mediaAndDownload(): string[] {
  return [NETWORK_MEDIA, NETWORK_DOWNLOAD];
}

export function downloadOnly(): string[] {
  return [NETWORK_DOWNLOAD];
}
