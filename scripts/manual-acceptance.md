# Manual acceptance checklist (v0.1.0)

Run on a **Linux** host with Docker and Compose v2+. Check each item before tagging a release.

## Prerequisites

- [ ] `npm install` completes without errors
- [ ] `npm run build` produces `dist/index.js`
- [ ] `docker info` succeeds (daemon running)
- [ ] `docker compose version` reports v2.x

## Doctor preflight

- [ ] `node dist/index.js doctor --data-root /tmp/pb-accept-data` exits **0** when Docker and a writable data root are available
- [ ] Doctor reports failed checks and exits non-zero when Docker is missing or data root is not writable

## Generate + compose validation

- [ ] `npm test -- tests/generate-compose-config.test.ts` passes (core, core+VPN, core+all extras fixtures validate via `docker compose config`)
- [ ] Generated `docker-compose.yml` and `.env` land under the chosen output directory (default `./plex-stack`)

## Hardlink-safe layout

After `init` or manual `generateStack` run, under `DATA_ROOT`:

- [ ] `media/movies` and `media/tv` exist
- [ ] `torrents/movies` and `torrents/tv` exist
- [ ] `configs/<app>/` directories exist for each enabled service

## Core stack (default services)

- [ ] `docker compose -f ./plex-stack/docker-compose.yml --env-file ./plex-stack/.env up -d` starts without error
- [ ] Core UIs respond: Plex (32400), Seerr (5055), Sonarr (8989), Radarr (7878), Prowlarr (9696), qBittorrent (8080)
- [ ] All core containers share the same `DATA_ROOT` mount path inside the stack

## Auto-wire (`init` / `wire`)

- [ ] `node dist/index.js init` (or `wire` after stack is up) prints `[ok]` for exit-gating core steps: qBittorrent, Sonarr, Radarr, Seerr
- [ ] Prowlarr and extras steps run in sequence; failures print `fallback:` hints from [docs/wiring-fallback.md](../docs/wiring-fallback.md)
- [ ] `init` / `wire` exits **0** only when all exit-gating core steps succeed; exits **1** when any core step fails
- [ ] `node dist/index.js wire --retry` skips steps already marked successful in wire state

## Optional extras (edit `stack-config.json`, run `plex-bootstrap generate`, then `plex-bootstrap up`)

- [ ] Enabling Jackett, FlareSolverr, Unpackerr, Bazarr, Tautulli, Recyclarr adds only the opted-in services to compose
- [ ] `docker compose config` still succeeds with all extras enabled

## VPN (Gluetun)

- [ ] With `services.vpn` enabled and VPN credentials set, compose includes `gluetun`
- [ ] qBittorrent uses `network_mode: service:gluetun`; WebUI is reachable on gluetun port 8080
- [ ] Sonarr/Radarr wire to download client host `gluetun` (not `qbittorrent`) when VPN is on

## CLI wrappers

- [ ] `node dist/index.js up` / `down` start and stop the stack
- [ ] `node dist/index.js update` pulls images and recreates containers

## Documentation

- [ ] [README.md](../README.md) first-run flow matches observed `init` behavior
- [ ] Manual wiring tables in [docs/wiring-fallback.md](../docs/wiring-fallback.md) match auto-wire fallback strings

## Success criteria (release gate)

- [ ] Full test suite green: `npm test`
- [ ] No Jellyfin, Traefik, or bundled web UI in generated compose
- [ ] Request → download → library path works end-to-end (Seerr request, qBit download, Sonarr/Radarr import to `media/*`)
- [ ] Tag `v0.1.0` only after the above checks pass on a real host
