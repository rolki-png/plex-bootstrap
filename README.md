# plex-bootstrap

Bootstrap a Plex-first media stack with Docker Compose. Generates a compose project, creates a hardlink-safe `/data` layout, starts containers, and auto-wires service integrations via each app's API.

## Prerequisites

- **Linux** host (doctor and compose wrappers assume a Unix environment)
- **Docker** installed and the daemon running (`docker info` succeeds)
- **Docker Compose v2+** (`docker compose version`)

Optional but recommended:

- A [Plex claim token](https://www.plex.tv/claim/) for first-time Plex server setup
- Enough disk space under your chosen data root (default `/data`)

## Install and build

```bash
git clone <this-repo>
cd plex-bootstrap
npm install
npm run build
```

The CLI entrypoint is `dist/index.js` (also exposed as the `plex-bootstrap` bin after install).

## First run: `init`

Interactive setup runs four phases in order:

1. **Prompt** — data root, config root, PUID/PGID, timezone, optional Plex claim token
2. **Doctor** — verifies Docker, Compose, daemon, and a writable data root (aborts if any check fails)
3. **Generate + up** — writes `./plex-stack/docker-compose.yml` and `.env`, creates folder skeleton, starts containers
4. **Wire** — configures integrations via each service API; prints `[ok]` / `[FAIL]` per step with fallback hints

```bash
npx plex-bootstrap init
# or
npm run start -- init
# or
node dist/index.js init

# custom output directory (default: ./plex-stack)
npm run start -- init --out-dir /path/to/plex-stack
```

`init` exits **0** when exit-gating core wiring succeeds, **1** when any of those steps fail. Prowlarr and extras failures are reported but do not fail `init`.

### Other commands

| Command | Purpose |
|---------|---------|
| `doctor --data-root /data` | Preflight checks only |
| `wire [--out-dir ./plex-stack] [--retry]` | Re-run wiring; `--retry` skips steps that already succeeded |
| `generate [--out-dir ./plex-stack]` | Regenerate compose files from an edited `stack-config.json` |
| `up` / `down` | Start or stop the stack |
| `update` | Pull images and recreate containers |

## Core vs optional extras

**Core** (enabled by default — required for a working request → download → library flow):

| Service | Role | Host port |
|---------|------|-----------|
| Plex | Media server | 32400 |
| Seerr | Requests / discovery | 5055 |
| Sonarr | TV acquisition | 8989 |
| Radarr | Movie acquisition | 7878 |
| Prowlarr | Indexer manager | 9696 |
| qBittorrent | Download client | 8080 |

**Optional extras** (off by default; enable in `stack-config.json`, run `plex-bootstrap generate`, then `plex-bootstrap up`, or extend compose manually):

| Service | Role |
|---------|------|
| Jackett | Alternate indexer (manual Torznab in Sonarr/Radarr) |
| FlareSolverr | Cloudflare bypass for Prowlarr indexers |
| Unpackerr | Auto-extract archives from download folders |
| Bazarr | Subtitles |
| Tautulli | Plex stats and history |
| Recyclarr | Sync TRaSH Guides quality profiles to Sonarr/Radarr |

**Wire order** (all steps run in sequence): qBittorrent → Sonarr → Radarr → Prowlarr → Seerr → extras.

**Exit-gating core steps** (must all succeed for `init` / `wire` to exit 0): qBittorrent, Sonarr, Radarr, Seerr. Prowlarr runs in the wire sequence but a Prowlarr failure does not fail init — fix it manually or retry later. Extras run after Seerr and are similarly non-blocking.

## VPN (Gluetun)

When `services.vpn` is enabled in stack config, compose adds **gluetun** and runs qBittorrent with `network_mode: service:gluetun`. The qBittorrent WebUI is published on gluetun (`8080:8080`). Sonarr and Radarr connect to the download client at host **`gluetun`** (port `8080`) instead of `qbittorrent`.

Set VPN credentials in stack config (`vpn.provider`, `vpn.username`, `vpn.password`; OpenVPN-specific overrides via `openvpnUser` / `openvpnPassword`). Gluetun env vars are rendered into compose at generate time.

## Hardlink-safe `/data` layout

All containers mount the same **`DATA_ROOT`** (default `/data`) so Sonarr/Radarr can hardlink or move completed downloads into library folders without copying.

```
/data/
├── media/
│   ├── movies/          ← Radarr root folder, Plex movie library
│   └── tv/              ← Sonarr root folder, Plex TV library
├── torrents/
│   ├── movies/          ← qBittorrent category `movies`
│   └── tv/              ← qBittorrent category `tv`
└── configs/
    └── <app>/           ← per-service persistent config
```

Torrents land under `torrents/*`; imports go to `media/*` on the same filesystem — required for instant imports via hardlinks. See [TRaSH Guides](https://trash-guides.info/) for folder structure, quality profiles, and naming conventions.

## Manual wiring

If auto-wire fails, each failed step prints a `fallback:` line. Step-by-step UI field tables matching those strings:

**[docs/wiring-fallback.md](docs/wiring-fallback.md)**

Retry wiring after fixing issues:

```bash
node dist/index.js wire --retry
```

## Quality profiles (Recyclarr)

When Recyclarr is enabled, the generated service runs `recyclarr sync` on demand (`restart: "no"`). Configure `configs/recyclarr/recyclarr.yml` using [TRaSH Guides](https://trash-guides.info/) templates, then:

```bash
docker compose -f ./plex-stack/docker-compose.yml --env-file ./plex-stack/.env run --rm recyclarr sync
```

Schedule that command with cron or a systemd timer.

## Development

```bash
npm ci
npm run build
npm test
```

Three tests in `tests/generate-compose-config.test.ts` run `docker compose config`, so they need Docker installed and the daemon running. They skip when it is missing. The `CI` workflow runs the build and tests on pushes to `master` and on pull requests, with Docker available.
