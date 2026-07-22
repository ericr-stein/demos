# demos

3D population-data visualizer with audio sonification.

- **React Three Fiber** — instanced 3D column field (lon → x, lat → z, population → height/color), one draw call for the whole dataset
- **Tone.js** — hover sonification: population is mapped to pitch (log-scaled, bigger = lower). Audio needs a click on "enable audio" first (browser autoplay policy)
- **zustand** — shared hover/selection state between scene and audio

## Data

The app ships with a bundled sample dataset (`src/data/sample.json`). To use
real data, drop a file at `public/data/population.json` with the same shape:

```json
[
  { "id": 0, "region": "Zurich", "name": "…", "lat": 47.37, "lon": 8.54, "population": 421878 }
]
```

It is picked up automatically at page load (`src/data/load.ts`); no rebuild
needed if the file is placed in the deployed container's web root.

## Development

```bash
pnpm install
pnpm dev        # http://localhost:5173
pnpm build      # typecheck + production build to dist/
```

## Deployment

Docker multi-stage build (pnpm build → nginx). Deployed on the devbox as
`demos.nonsh.site` behind Caddy/Authelia. Every push to `main` triggers
`.github/workflows/deploy.yml` on a self-hosted runner, which runs
`deploy.sh` (fetch + reset to `origin/main`, rebuild image, restart
container). CI (typecheck + build) runs on GitHub-hosted runners for
pushes and PRs.

## Local run (any machine with Docker)

```bash
make local-up      # self-contained stack: web + api + own Postgres → http://localhost:8080
make local-import  # load the KTZH population dataset (or URL=... TABLE=... for any OGD CSV)
make local-clean   # stop and delete the local database
make help          # all targets
```
