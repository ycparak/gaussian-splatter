# Gaussian Splatter / Particle Generator

A browser-based Three.js particle viewer and prototype image-to-point-cloud generator powered by Apple's SHARP model, i.e. `Image -> Apple's ML SHARP -> Point Cloud -> Three JS GPGPU -> Particle System` based on [three-ml-sharp](https://github.com/cullenwebber/three-ml-sharp).

> ⚠️ **Epistemic Status:** Entirely agentically engineered with only minimal oversight, take that fwiw.

## What This Project Does

- Renders large point clouds in the browser with Three.js and `GPUComputationRenderer`.
- Uses a React/Vite UI for scene selection, image upload, and generation status.
- Supports Apple's SHARP CLI output (`.ply`) through a local Bun server.
- Converts SHARP-generated `.ply` files into a compact `.pgs.gz` format for faster web loading.
- Loads bundled sample assets from a remote object store (R2).
- Adds controls to manipulate the scene, particles, lighting, bloom, color, camera and renderer.

This is a prototype, not a production service. The browser viewer runs fully in the browser, but SHARP inference does not. SHARP is currently a Python CLI/model workflow, so generation must run on a local machine or backend server with SHARP installed.

## Tech Stack

- Bun
- Vite
- React
- Three.js
- Tailwind CSS v4
- Biome
- Apple's SHARP CLI for image-to-3DGS generation

## Requirements

For the browser viewer:

- Bun `1.2.x` or newer
- A modern browser with WebGL support

For image generation:

- Python `3.13`
- Apple SHARP installed as a Python package
- `sharp --help` working in the shell where the Bun server runs

## Install

```bash
bun install
```

## Run The Viewer Only

This starts the Vite frontend. Bundled scenes load from `VITE_BUNDLED_SCENES_BASE_URL`.

```bash
bun run dev
```

Open:

```text
http://localhost:5173/
```

Set your bundled scene base URL before starting the frontend:

```bash
export VITE_BUNDLED_SCENES_BASE_URL="https://<your-r2-domain>/"
```

Example: `https://pub-xxxxxxxx.r2.dev/` or your attached custom domain.

For production builds, set `VITE_BUNDLED_SCENES_BASE_URL` during `bun run build`
(for example via `.env.production`).

R2 CORS must allow your production origin (for example
`https://splat.yusufparak.com`) for `GET` and `HEAD`.

## Run With Image Generation

Start the local generation server:

```bash
bun run server
```

In a second terminal, start the frontend:

```bash
bun run dev
```

Open:

```text
http://localhost:5173/
```

The frontend proxies `/api` and `/generated` requests to the local server on port `8787`.

Generated files are written to `.generated/`, which is intentionally ignored by Git.

## Installing Apple SHARP On macOS

This project uses Apple's SHARP CLI, not the unrelated Node image package named `sharp`.

Clone and install SHARP:

```bash
git clone https://github.com/apple/ml-sharp.git
cd ml-sharp

conda create -n sharp python=3.13 -y
conda activate sharp

python -m pip install --upgrade pip
pip install -r requirements.txt
pip install -e .

sharp --help
```

Test prediction manually:

```bash
mkdir -p /tmp/sharp-output
sharp predict -i /path/to/image.jpg -o /tmp/sharp-output
```

The first run downloads Apple's checkpoint and caches it under:

```text
~/.cache/torch/hub/checkpoints/
```

If the app server cannot find `sharp`, pass the binary path explicitly:

```bash
conda activate sharp
cd /path/to/particle-generator
SHARP_BIN="$(which sharp)" bun run server
```

Then run the frontend in another terminal:

```bash
bun run dev
```

## Asset Optimization

SHARP produces 3D Gaussian Splatting `.ply` files. These can be large for the web, so this app converts them into `.pgs.gz`.

The packed format stores:

- normalized `uint16` positions
- RGB565 color
- scene bounds
- gzip compression

Pack an existing stripped SHARP-style PLY:

```bash
bun run pack:pgs -- input.ply output.pgs.gz
```

The bundled sample was reduced from about `28.3 MB` as `.ply` to about `7.5 MB` as `.pgs.gz`.

## Scripts

```bash
bun run dev        # Start Vite
bun run server     # Start local SHARP generation API
bun run start      # Start both dev server and API together
bun run build      # Production build
bun run preview    # Preview production build
bun run check      # Run Biome checks
bun run format     # Format files with Biome
bun run lint       # Run Biome lint
bunx tsc --noEmit  # Run strict TypeScript checks
bun run pack:pgs   # Convert PLY to compact .pgs.gz
```

## Project Structure

```text
src/App.tsx                  React shell
src/components/SceneSidebar.tsx
src/core/                    Three.js renderer, loop, post-processing
src/scenes/Scene.ts          Scene setup and active asset loading
src/utils/PlyLoader.ts       PLY / PGS loading and particle setup
src/shaders/                 Particle and GPGPU shaders
server/generator.ts          Local upload + SHARP generation API
scripts/pgs-format.ts        PLY to PGS packing logic
scripts/pack-pgs.ts          CLI wrapper for packing assets
shared/                      Shared types and pure helpers
public/                      Static assets (non-scene binaries)
```

## Important Notes

- Apple's SHARP model license should be reviewed before any commercial or public hosted use.
- Browser-only SHARP generation is not implemented here; the published SHARP workflow is Python/ML inference.
- `sharp render` and SHARP trajectory rendering require CUDA; this app only needs `sharp predict`.
- On Apple Silicon macOS, SHARP prediction may use MPS, but performance depends on the local Python/PyTorch setup.
- Do not commit `.generated/` outputs unless you intentionally want to publish generated assets.
