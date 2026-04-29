# AGENTS.md

This file gives coding agents the project context and commands needed to work safely in this repository. It follows the AGENTS.md convention: keep instructions practical, project-specific, and focused on what an agent needs while editing code.

## Project Overview

- This is a private Vite application managed with Bun. Use Bun for dependency installation and script execution; do not introduce npm, yarn, or pnpm lockfiles.
- `src/main.jsx` renders `src/App.jsx` into `#app` from `index.html`.
- `src/App.jsx` owns the React shell around the scene: it mounts the full-screen Three.js container, the `SceneSidebar`, and the loader overlay.
- Core rendering lives in `src/core`:
	- `WebGLContext.js` owns the singleton renderer/canvas setup and fullscreen resize behavior.
	- `Three.js` wires the render loop, scene orchestration, and resize listeners.
	- `PostProcessing.js` configures the composer, bloom pass, color adjustment pass, and output pass.
- Scene composition lives in `src/scenes/Scene.js`. It sets up the black fogged scene, camera, camera rig, PLY particle loader, and loader progress UI hooks.
- Particle loading and simulation live in `src/utils/PlyLoader.js`. It fetches a binary PLY file or gzipped PLY file, parses positions/colors, initializes `GPUComputationRenderer`, and drives the particle shader uniforms.
- Supporting utilities live in `src/utils`, including `CameraRig.js`, `ColorAdjustPass.js`, and helper loaders for textures and glTF.
- UI components live in `src/components` and the generated shadcn primitives in `src/components/ui`; `src/lib/utils.js` exports the shared `cn` helper.
- `src/components/SceneSidebar.jsx` is the fixed overlay UI. It is currently wired to a single `tokyo` scene entry and uses shadcn primitives plus lucide icons.
- Shaders live in `src/shaders`, including the GPGPU particle simulation shader at `src/shaders/gpgpu/particles.glsl`. Keep GLSL in that tree and import it through `vite-plugin-glsl`.
- The point-cloud asset is `public/tokyo.min.ply`. The helper script `scripts/strip-ply.mjs` can strip a larger PLY file down to the fields this app uses and also writes a gzipped copy beside the stripped file.
- Vite is configured in `vite.config.js` with React, Tailwind CSS v4, and GLSL plugins. The `@` alias points at `./src`, and the app is built for the root path (`base: "/"`). If you change the base or asset locations, update `Scene.js` and `index.html` together.

## Build and Test Commands

- Install dependencies: `bun install`
- Start the development server: `bun run dev`
- Build for production: `bun run build`
- Preview the production build: `bun run preview`
- Run Biome checks without writing changes: `bun run check`
- Apply Biome formatter, import organization, and safe fixes: `bun run check:write`
- Format only: `bun run format`
- Lint only: `bun run lint`

There is no dedicated automated test suite in this repository yet. Before finishing code changes, run `bun run check` and `bun run build`. If you change rendering, shaders, asset loading, or responsive behavior, also run the dev server and verify the scene loads in a browser with the loader disappearing after the PLY asset finishes loading.

## Code Style Guidelines

- Use JavaScript ES modules. Keep imports and extensions consistent with the existing Vite setup.
- Follow Biome as the source of truth for formatting and linting. The config uses tabs, double quotes, recommended lint rules, import organization, and Tailwind directive parsing.
- Keep React UI responsibilities separate from Three.js lifecycle responsibilities:
	- React state, layout, and overlay UI belong in `src/App.jsx` and `src/components`.
	- renderer/canvas work belongs in `src/core/WebGLContext.js`;
	- animation loop and top-level orchestration belong in `src/core/Three.js`;
	- scene objects and camera setup belong in `src/scenes/Scene.js`;
	- reusable loaders, passes, camera helpers, and texture helpers belong in `src/utils`.
- Preserve the `WebGLContext.getInstance()` singleton pattern unless intentionally refactoring renderer ownership across the app.
- Keep shader code in `src/shaders` and import it through `vite-plugin-glsl`; do not inline substantial GLSL strings in JavaScript modules.
- When parsing binary data or browser APIs, prefer explicit, readable code over clever shortcuts. Include radix arguments for `parseInt`.
- Use `node:` protocol imports for Node built-ins in scripts.
- The loader overlay uses the `loader` and `loader-bar` DOM IDs in `src/App.jsx` and `src/scenes/Scene.js`; update both files together if you rename them.
- Avoid changing generated output in `dist` unless the task explicitly asks for built artifacts.
- Keep large visual or behavioral changes scoped and verify them in the browser, not just with `bun run build`.

## ExecPlans

When writing complex features or significant refactors, use an ExecPlan from design to implementation. Follow `.agents/PLANS.md` exactly, and keep the plan updated as decisions, discoveries, and validation results change.
