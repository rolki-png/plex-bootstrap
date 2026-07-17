# Manual wiring fallback guide

When `init` or `wire` prints `[FAIL]` for a step, use the matching table below. Values mirror what auto-wire sets via each service API.

Internal URLs use Docker service hostnames (`sonarr`, `radarr`, `plex`, …). Host ports are for browser access only.

---

## qBittorrent

**Fallback:** `Create categories movies and tv with save paths /data/torrents/movies and /data/torrents/tv in qBittorrent WebUI`

Web UI: `http://localhost:8080` (default login `admin` / `adminadmin` — change after first login)

| UI location | Field | Value |
|-------------|-------|-------|
| Settings → Downloads → Category | Name | `movies` |
| Settings → Downloads → Category | Save path | `/data/torrents/movies` |
| Settings → Downloads → Category | Name | `tv` |
| Settings → Downloads → Category | Save path | `/data/torrents/tv` |

---

## Sonarr

**Fallback:** `Add root folder /data/media/tv and qBittorrent download client with category tv in Sonarr Settings`

| UI location | Field | Value |
|-------------|-------|-------|
| Settings → Media Management → Root Folders | Path | `/data/media/tv` |
| Settings → Download Clients → Add → qBittorrent | Name | `qBittorrent` |
| Settings → Download Clients → Add → qBittorrent | Host | `qbittorrent` (or `gluetun` when VPN enabled) |
| Settings → Download Clients → Add → qBittorrent | Port | `8080` |
| Settings → Download Clients → Add → qBittorrent | Username | `admin` |
| Settings → Download Clients → Add → qBittorrent | Password | qBittorrent WebUI password |
| Settings → Download Clients → Add → qBittorrent | Category | `tv` |

API key: Settings → General → Security → API Key (needed by Prowlarr and Seerr).

---

## Radarr

**Fallback:** `Add root folder /data/media/movies and qBittorrent download client with category movies in Radarr Settings`

| UI location | Field | Value |
|-------------|-------|-------|
| Settings → Media Management → Root Folders | Path | `/data/media/movies` |
| Settings → Download Clients → Add → qBittorrent | Name | `qBittorrent` |
| Settings → Download Clients → Add → qBittorrent | Host | `qbittorrent` (or `gluetun` when VPN enabled) |
| Settings → Download Clients → Add → qBittorrent | Port | `8080` |
| Settings → Download Clients → Add → qBittorrent | Username | `admin` |
| Settings → Download Clients → Add → qBittorrent | Password | qBittorrent WebUI password |
| Settings → Download Clients → Add → qBittorrent | Category | `movies` |

API key: Settings → General → Security → API Key.

---

## Prowlarr

**Fallback (no FlareSolverr):** `Add Sonarr and Radarr apps in Prowlarr Settings => Apps`

**Fallback (with FlareSolverr):** `Add Sonarr/Radarr apps and FlareSolverr indexer proxy in Prowlarr Settings`

### Sonarr application

| UI / API field | Value |
|----------------|-------|
| Name | `Sonarr` |
| Sync Level | `Full Sync` |
| Prowlarr Server | `http://prowlarr:9696` |
| Sonarr Server | `http://sonarr:8989` |
| API Key | Sonarr API key |
| Sync Categories | `5000` (TV) |

### Radarr application

| UI / API field | Value |
|----------------|-------|
| Name | `Radarr` |
| Sync Level | `Full Sync` |
| Prowlarr Server | `http://prowlarr:9696` |
| Radarr Server | `http://radarr:7878` |
| API Key | Radarr API key |
| Sync Categories | `2000` (Movies) |

### FlareSolverr indexer proxy (optional)

| UI / API field | Value |
|----------------|-------|
| Name | `FlareSolverr` |
| Host | `http://flaresolverr:8191` |
| Request Timeout | `60` |
| Tags | `flaresolverr` |

---

## Seerr (Overseerr / Jellyseerr)

**Fallback:** `Open http://localhost:5055 and configure Settings: Plex server (hostname plex, port 32400), Sonarr (hostname, port, API key, root folder /data/media/tv), Radarr (hostname, port, API key, root folder /data/media/movies)`

Web UI: `http://localhost:5055`

### Plex Media Server

| UI location | Field | Value |
|-------------|-------|-------|
| Settings → Plex | Hostname / IP | `plex` |
| Settings → Plex | Port | `32400` |
| Settings → Plex | Use SSL | off |

Complete Plex sign-in if prompted (auto-wire uses a stored Plex token when available).

### Sonarr

| UI location | Field | Value |
|-------------|-------|-------|
| Settings → Services → Sonarr | Default Server | on |
| Settings → Services → Sonarr | Hostname | `sonarr` |
| Settings → Services → Sonarr | Port | `8989` |
| Settings → Services → Sonarr | API Key | Sonarr API key |
| Settings → Services → Sonarr | Root Folder | `/data/media/tv` |

### Radarr

| UI location | Field | Value |
|-------------|-------|-------|
| Settings → Services → Radarr | Default Server | on |
| Settings → Services → Radarr | Hostname | `radarr` |
| Settings → Services → Radarr | Port | `7878` |
| Settings → Services → Radarr | API Key | Radarr API key |
| Settings → Services → Radarr | Root Folder | `/data/media/movies` |

---

## Unpackerr (optional extra)

**Fallback:** `Write <CONFIG_ROOT>/unpackerr/unpackerr.conf with [[sonarr]] and [[radarr]] sections`

Example (`/data/configs/unpackerr/unpackerr.conf` when `CONFIG_ROOT=/data/configs`):

```ini
[[sonarr]]
url = "http://sonarr:8989"
api_key = "<SONARR_API_KEY>"
paths = ['/data/torrents/tv', '/data/torrents/movies']
protocols = "torrent,TorrentDownloadProtocol"

[[radarr]]
url = "http://radarr:7878"
api_key = "<RADARR_API_KEY>"
paths = ['/data/torrents/tv', '/data/torrents/movies']
protocols = "torrent,TorrentDownloadProtocol"
```

**Write failure fallback:** `Write <path> manually with Sonarr/Radarr url and api_key`

---

## Bazarr (optional extra)

**Fallback:** `Open Bazarr Settings and add Sonarr/Radarr hostname, port, and API keys`

Web UI: `http://localhost:6767`

### Sonarr

| UI location | Field | Value |
|-------------|-------|-------|
| Settings → General → Use Sonarr | Enabled | on |
| Settings → Sonarr | Address | `sonarr` |
| Settings → Sonarr | Port | `8989` |
| Settings → Sonarr | API Key | Sonarr API key |
| Settings → Sonarr | SSL | off |

### Radarr

| UI location | Field | Value |
|-------------|-------|-------|
| Settings → General → Use Radarr | Enabled | on |
| Settings → Radarr | Address | `radarr` |
| Settings → Radarr | Port | `7878` |
| Settings → Radarr | API Key | Radarr API key |
| Settings → Radarr | SSL | off |

---

## Tautulli (optional extra)

**Fallback:** `Open Tautulli and connect Plex at Settings → Plex Media Server`

**Fallback (with Plex URL):** `Open Tautulli and connect Plex at http://plex:32400`

Web UI: `http://localhost:8181`

| UI location | Field | Value |
|-------------|-------|-------|
| Settings → Plex Media Server | Plex IP / Hostname | `plex` |
| Settings → Plex Media Server | Plex Port | `32400` |
| Settings → Plex Media Server | Use SSL | off |
| Settings → Plex Media Server | Plex Token | optional; use if prompted |

---

## Jackett (optional extra)

**Fallback:** `http://jackett:9117/api/v2/indexers/{indexer}/results/torznab/api?apikey=<API_KEY>`

Jackett is not auto-synced to Sonarr/Radarr. Add each indexer manually:

| Target app | UI location | Field | Value |
|------------|-------------|-------|-------|
| Sonarr | Settings → Indexers → Add → Torznab | URL | Torznab URL from fallback (per indexer) |
| Sonarr | Settings → Indexers → Add → Torznab | API Key | Jackett API key |
| Radarr | Settings → Indexers → Add → Torznab | URL | Torznab URL from fallback (per indexer) |
| Radarr | Settings → Indexers → Add → Torznab | API Key | Jackett API key |

Replace `{indexer}` with the Jackett indexer ID and `<API_KEY>` with the key from Jackett → System → API Key.

---

## Retry after manual fixes

```bash
node dist/index.js wire --retry
```

Only failed steps are re-run. Core steps (`qbittorrent`, `sonarr`, `radarr`, `seerr`) must all succeed for `wire` / `init` to exit 0.
