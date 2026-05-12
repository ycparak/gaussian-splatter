# Simplify the Particle Generator Codebase Architecture

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

This document follows `.agents/PLANS.md`. It is self-contained so a developer can restart from this file without prior conversation context.

## Purpose / Big Picture

The goal is to make this repository easier for a human developer to understand, reason about, and move through while preserving the current particle generator behavior. After this plan is implemented, the app should still load bundled `.pgs.gz` point-cloud scenes, morph between scenes, expose the same visual controls, support snapshots and recordings, and keep the optional local image-generation workflow. The improvement should be visible in the repository shape: fewer low-value files, clearer module names, fewer mixed responsibilities, a trustworthy validation loop, and no changes to `src/components/archived` for now.

The highest priority is developer locality: when someone wants to understand point asset loading, scene orchestration, controls, or generated-scene uploads, the relevant implementation should be concentrated in one obvious place instead of spread across generic folders such as `utils`.

## Progress

- [x] (2026-05-06 13:22Z) Read `.agents/PLANS.md`, `.agents/domain.md`, `AGENTS.md`, and the `improve-codebase-architecture` and `react-doctor` skill instructions.
- [x] (2026-05-06 13:22Z) Confirmed there is no root `CONTEXT.md` and no `docs/adr/` directory in this working tree, so no domain glossary or ADR currently constrains the plan.
- [x] (2026-05-06 13:22Z) Mapped the live source layout excluding `src/components/archived`.
- [x] (2026-05-06 13:22Z) Captured current validation baseline: `bunx tsc --noEmit` passes, `bun run build` passes with a large chunk warning, `bun run check` fails on formatting, and `react-doctor` scores 88/100 with one reduced-motion accessibility error.
- [x] (2026-05-06 13:43Z) Implemented Milestone 1: `biome.json` excludes `src/components/archived`, live files were formatted, and `bun run check` passes without touching archived files.
- [x] (2026-05-06 13:43Z) Implemented Milestone 2: removed unused live modules and folders including `shared/sceneSelection.ts`, `src/utils/ImportGltf.ts`, `src/utils/PBRTextureLoader.ts`, `src/components/icons/*`, and the now-empty `src/utils` folder.
- [x] (2026-05-06 13:43Z) Implemented Milestone 3: replaced `src/utils/PlyLoader.ts` with `src/scenes/PointAssetRuntime.ts`, extracted pure parsing/resampling into `shared/pointAssetData.ts`, and moved rendering helpers into `src/core`.
- [x] (2026-05-06 13:43Z) Implemented Milestone 4: extracted recording timer behavior to `src/components/useRecordingSession.ts` and generated-scene API behavior to `src/components/generatedSceneApi.ts`.
- [x] (2026-05-06 13:43Z) Implemented Milestone 5: replaced custom icons with `lucide-react`, added reduced-motion handling, reduced large blur values, and switched motion components to `m` under `LazyMotion`.
- [x] (2026-05-06 13:43Z) Implemented Milestone 6: added `bun test`, point asset tests, generated-scene merge tests, and browser smoke verification.

## Surprises & Discoveries

- Observation: The live code has only a modest number of directories, but the names create navigation friction. `src/utils` contains camera behavior, shader passes, PLY/PGS parsing, GPU simulation, and unused glTF/PBR helpers; this makes the folder shallow as a navigation module.
  Evidence: `src/utils/PlyLoader.ts` is 901 lines, `src/utils/CameraRig.ts` is active scene behavior, `src/utils/ColorAdjustPass.ts` is post-processing behavior, and `src/utils/ImportGltf.ts` plus `src/utils/PBRTextureLoader.ts` are not imported by live code.

- Observation: There is no test suite currently discovered by searching for `describe(`, `it(`, or `test(` outside generated dependencies and `dist`.
  Evidence: `rg -n "describe\\(|it\\(|test\\(" . --glob '!node_modules/**' --glob '!dist/**'` only found incidental string/function names in source files.

- Observation: Validation is currently noisy because `bun run check` includes formatting failures in `src/components/archived`, but this plan must leave archived files untouched.
  Evidence: `bun run check` reports formatting errors in live files and also in `src/components/archived/SceneSidebar.tsx` and archived scene-sidebar files.

- Observation: The production build works but produces one large application chunk.
  Evidence: `bun run build` reports `dist/assets/index-DUThHbg1.js` at 1,083.07 kB minified and 313.54 kB gzip, with Vite's `500 kB` chunk warning.

- Observation: React Doctor reports an accessibility error and several code-quality warnings that align with the architecture problem.
  Evidence: `npx -y react-doctor@latest . --verbose` reports 88/100, one error for missing `prefers-reduced-motion` handling, warnings for `motion` import overhead, React 19 `forwardRef` usage in 18 icon files, unused live files, duplicate default/named exports in UI primitives, and large blur filters.

- Observation: `src/components/ui/separator.tsx` and compatibility named exports on UI primitives must stay while TypeScript still includes archived files.
  Evidence: deleting them caused `bunx tsc --noEmit` to fail from archived imports. They were restored without editing `src/components/archived`.

- Observation: LazyMotion reduced bundle size but did not eliminate Vite's chunk warning.
  Evidence: final `bun run build` reports the main JS chunk at 1,027.58 kB minified and 297.12 kB gzip, down from the planning baseline of 1,083.07 kB minified and 313.54 kB gzip.

## Decision Log

- Decision: Keep `src/components/archived` completely untouched in this plan, even where tooling reports warnings or formatting issues.
  Rationale: The user explicitly asked for archived to remain untouched. Validation must therefore either tolerate archived warnings temporarily or scope checks to live code until archived is intentionally reactivated or deleted in a later plan.
  Date/Author: 2026-05-06 / Codex

- Decision: Treat folder reduction as a result of deeper modules, not as a mechanical flattening exercise.
  Rationale: A folder can help when it names a real concept. The friction in this repo is not simply folder count; it is that generic folders hide mixed responsibilities and shallow files. The plan should improve locality and leverage first, then delete folders that no longer earn their keep.
  Date/Author: 2026-05-06 / Codex

- Decision: Start with validation cleanup before major movement.
  Rationale: The current checks do not provide a clean safety signal. Refactoring rendering, parsing, and React workflow code without a clean baseline would make regressions harder to detect.
  Date/Author: 2026-05-06 / Codex

- Decision: Preserve current public behavior and asset paths.
  Rationale: The app depends on Vite's root `base`, `public/*.pgs.gz`, the virtual bundled-scenes module, and loader DOM IDs `loader` and `loader-bar`. The plan should not trade developer clarity for broken deployed behavior.
  Date/Author: 2026-05-06 / Codex

- Decision: Use `lucide-react` for live UI icons and delete the custom icon folder.
  Rationale: `lucide-react` was already installed and already used. This removed many tiny custom modules and React 19 `forwardRef` warnings while preserving familiar button symbols.
  Date/Author: 2026-05-06 / Codex

- Decision: Keep UI primitive compatibility exports for archived code.
  Rationale: The user asked to leave archived untouched, but TypeScript still checks it. Keeping compatibility in live UI primitives preserves type safety without editing archived files.
  Date/Author: 2026-05-06 / Codex

## Outcomes & Retrospective

Completed on 2026-05-06. The live codebase now has fewer low-value files and folders: `src/utils` and `src/components/icons` are gone, point asset runtime has a clearer name, parsing is testable without WebGL, and rendering helpers live in `src/core`. `src/components/archived` was not edited.

The main remaining gaps are intentionally left for a future pass: archived still forces a few compatibility exports, `ImagePanel` and `App` still have related state that could move to reducers, and Vite still reports a large chunk because Three.js and the app render path remain in one bundle. Validation is substantially better: `bun run check`, `bun run test`, `bunx tsc --noEmit`, and `bun run build` pass; React Doctor improved from 88/100 to 93/100; and browser smoke checks confirmed initial scene load, loader disappearance, controls, image panel, and scene switching.

## Context and Orientation

This is a private Vite application managed with Bun. `src/main.tsx` mounts `src/App.tsx` into `#app` in `index.html`. `src/App.tsx` owns the React shell: it creates the Three.js app object, tracks initial loader state, pause state, recording timers, info panel visibility, selected scene, scene errors, and settings. It renders the full-screen Three canvas host plus `TopLeftActions`, `ActionPanel`, `ControlsPanel`, `ImagePanel`, `InfoPanel`, and the loader overlay.

The rendering path currently starts in `src/core/Three.ts`. That class owns the render loop, pause/resume, snapshot download, video recording, settings propagation, scene loading calls, and disposal. It creates a singleton `src/core/WebGLContext.ts`, a `src/scenes/Scene.ts`, and `src/core/PostProcessing.ts`.

`src/scenes/Scene.ts` owns the Three `Scene`, `PerspectiveCamera`, `CameraRig`, active scene asset state, point transforms, scene load callbacks, and a `PlyLoader` instance. Despite its name, `src/utils/PlyLoader.ts` is the real point asset module. It fetches `.pgs.gz` or `.ply` data, tracks progress, decompresses gzip if needed, parses PGS/PLY buffers, builds GPGPU textures, builds the point geometry and shader material, morphs between assets, updates info-panel animation uniforms, applies particle and lighting settings, and disposes GPU resources.

The UI path currently lives mostly in `src/components`. `src/components/ControlsPanel.tsx` renders the settings island and its popover controls from `src/components/sceneControlsConfig.ts`. `src/components/ImagePanel.tsx` renders the image/scene picker, optional upload dropzone, generation job polling, generated-scene merging, and server API calls. `src/components/ActionPanel.tsx` renders snapshot, recording, pause, and reload actions. `src/components/icons` contains custom SVG icon modules, many of which duplicate what `lucide-react` already provides.

The server path has `server/generator.ts`, a 386-line Bun server that handles scene listing, upload job creation, SHARP execution, PGS packing, generated asset serving, job cleanup, and small utility functions. `server/sceneManifestStore.ts` is a small persistence module for generated scenes. Shared types and helpers live in `shared`.

Architecture terms used in this plan:

- A Module is any file, class, function, or folder that has an interface and an implementation.
- An Interface is everything a caller must know to use a module: types, invariants, ordering, errors, configuration, and side effects.
- An Implementation is the code inside the module.
- Depth means leverage at the interface. A deep module gives callers a lot of behavior through a small interface. A shallow module exposes nearly as much complexity as it hides.
- Locality means related changes and bugs are concentrated in one place.
- An Adapter is a concrete implementation behind a seam. A seam is a place where behavior can be changed without editing every caller.

## Deepening Opportunities

1. Point asset loading and simulation

Files involved: `src/utils/PlyLoader.ts`, `src/scenes/Scene.ts`, `src/shaders/particles.vert`, `src/shaders/particles.frag`, `src/shaders/gpgpu/particles.glsl`, `shared/pgs.ts`, `shared/types.ts`, and `scripts/pgs-format.ts`.

Problem: `PlyLoader` is a shallow name over a very deep implementation. Its interface exposes historical PLY language, but its implementation now includes PGS parsing, gzip transport, morph orchestration, GPGPU texture allocation, shader material construction, settings application, info progress animation, and GPU disposal. Understanding one concept requires reading almost the whole file. This creates poor locality: a parsing bug, a morph bug, and a GPU cleanup bug all look like changes to the same giant module.

Solution: Rename and reorganize around the actual domain concept: point assets. Keep a single public point asset runtime module for `Scene` to call, but split private implementation into nearby files only where the deletion test says the split earns its keep. PGS/PLY parsing should become a small parser module shared by browser loading and packing tests. GPU simulation and point material setup should sit beside the runtime instead of under generic `utils`. Avoid exposing a wide new interface; `Scene` should still ask for load, transition, update, resize, settings, visibility, stats, and dispose behavior through one obvious module.

Benefits: This increases depth because `Scene` gets the same behavior through a clearer, smaller conceptual interface. It improves locality because parser changes, GPU runtime changes, and scene orchestration changes stop competing inside one 901-line file. Tests can target binary parsing and resampling without constructing WebGL, while browser smoke checks continue proving the runtime path.

2. Rendering orchestration

Files involved: `src/core/Three.ts`, `src/core/WebGLContext.ts`, `src/core/PostProcessing.ts`, `src/scenes/Scene.ts`, `src/utils/CameraRig.ts`, and `src/utils/ColorAdjustPass.ts`.

Problem: `src/core` and `src/scenes` are close to good, but the seams are blurry. `Three` owns app-level capture workflows in addition to animation orchestration. `Scene` reaches into `WebGLContext.getInstance()`. `CameraRig` and `ColorAdjustPass` are active rendering modules but live in `utils`, which weakens navigation.

Solution: Keep the current runtime behavior, but move rendering-specific helpers out of `utils` and into a rendering area with clear names. Consider whether capture belongs in a dedicated capture module called by `Three`, because snapshot and MediaRecorder code are independent of scene orchestration. Preserve the singleton renderer unless intentionally revisiting renderer ownership later.

Benefits: A developer looking for render loop behavior lands in one area. The modules become deeper: `Three` can focus on orchestration, capture behavior can be tested or reasoned about separately, and rendering helpers stop being hidden under a generic folder.

3. React app state and overlay workflows

Files involved: `src/App.tsx`, `src/components/ActionPanel.tsx`, `src/components/ControlsPanel.tsx`, `src/components/ImagePanel.tsx`, `src/components/TopLeftActions.tsx`, `src/components/InfoPanel.tsx`, `src/components/ui/*`, and `src/components/sceneControlsConfig.ts`.

Problem: `App` has many related state variables and timer refs. `ImagePanel` combines scene list UI, upload UI, API access, job polling, and generated-scene state. `ControlsPanel` combines navigation-menu hover heuristics, tab rendering, setting updates, randomization, reset, and individual control widgets. This gives poor locality: a workflow bug and a visual layout edit require navigating the same large files.

Solution: Group related React state by workflow. For the shell, use one reducer or custom hook for scene load state and one for recording timers. For generated scenes, put API calls and polling behind a small generated-scene workflow module or hook so `ImagePanel` can primarily render. For controls, keep the data-driven controls but colocate randomization/reset logic with the control schema and keep rendering widgets small. Do not split into many folders by default; prefer a small number of feature-oriented files with clear names.

Benefits: This improves leverage because UI modules expose intent-level operations instead of raw state juggling. It improves locality because scene load behavior, recording behavior, generated-scene behavior, and control schema behavior can be changed independently. It also reduces lines in `App`, `ImagePanel`, and `ControlsPanel` without losing behavior.

4. Dead or low-leverage files

Files involved: `shared/sceneSelection.ts`, `src/utils/ImportGltf.ts`, `src/utils/PBRTextureLoader.ts`, `src/components/icons/chevron-right.svg`, `src/components/sceneControlsConfig.ts`, `src/components/ui/separator.tsx`, and custom icons in `src/components/icons`.

Problem: Several files appear unused by live code. Some exports exist only because they are exported, not because callers use them. Custom icon modules create many tiny files and React 19 `forwardRef` warnings while `lucide-react` is already installed and used.

Solution: Delete truly unused live files after confirming they are not used by scripts, server, Vite virtual modules, or archived code that must remain untouched. Replace custom icons with lucide icons where the visual match is acceptable, or consolidate the remaining custom icons into one file if exact custom paths matter. Remove duplicate default/named exports in UI primitives if imports can be simplified consistently.

Benefits: This is the most direct line-count and file-count reduction. It improves navigation because fewer files appear relevant during search. It improves depth because files that remain have a reason to exist beyond being pass-through exports.

5. Validation and performance gates

Files involved: `biome.json`, package scripts in `package.json`, future tests under a `tests` or colocated test area, Vite config if chunking is changed, and any browser smoke tooling chosen during implementation.

Problem: `bun run check` currently fails before architecture work begins, partly because archived files are included. There are no discovered tests. The production bundle exceeds Vite's chunk warning threshold. React Doctor reports missing reduced-motion handling, expensive blur usage, and motion import overhead.

Solution: Establish a live-code validation path first. This can be done by formatting live files while leaving archived untouched and by adding a temporary documented check command that excludes archived until the archived folder is explicitly handled. Add focused tests for pure point asset parsing, PGS packing, generated-scene manifest behavior, and reducer/workflow logic. Add browser smoke verification for scene load, loader disappearance, scene switching, controls, pause, snapshot, and reduced-motion behavior.

Benefits: The architecture work becomes safer because each milestone has evidence. Performance changes become measurable instead of aesthetic. Developers get a small set of commands that answer whether the app still works.

## Plan of Work

Milestone 1: Make validation trustworthy without touching archived.

Format or fix only live files that Biome currently flags, and leave `src/components/archived` unchanged. If `bun run check` must still include archived and therefore fail, add a clearly named live-code check script that excludes archived through Biome configuration or command scoping, then document that `bun run check` remains noisy only because archived is intentionally frozen. Run `bunx tsc --noEmit`, `bun run build`, and React Doctor afterward. The acceptance for this milestone is that a developer has at least one clean validation command for the live app plus a documented reason archived remains excluded from cleanup.

Milestone 2: Remove low-leverage live files and exports.

Confirm import reachability with `rg` before each deletion. Remove `shared/sceneSelection.ts` if it remains unused. Remove `src/utils/ImportGltf.ts` and `src/utils/PBRTextureLoader.ts` if there is no active glTF/PBR feature. Remove `src/components/icons/chevron-right.svg` if unused. Remove `DEFAULT_OPEN_SECTIONS` if unused. Review `src/components/ui/separator.tsx`; if it is unused and not needed by shadcn regeneration, delete it, otherwise document why it stays. Do not delete `scripts/strip-ply.ts` only because React Doctor flags it; it is documented in `AGENTS.md` and is a useful manual asset tool.

Milestone 3: Deepen the point asset module.

Move from the name `PlyLoader` toward point asset language. The runtime should remain the only module `Scene` needs to know about for loading and animating point assets. Extract pure PGS/PLY parsing and resampling only if doing so makes the runtime easier to read and test. Keep shader imports in the shader tree. Add tests for PGS header validation, PGS RGB565 decoding, PLY header parsing, missing position properties, SH color conversion, and resampling behavior. After the move, bundled `.pgs.gz` loading and morph transitions must behave the same in the browser.

Milestone 4: Simplify rendering and capture orchestration.

Move active rendering helpers currently under `src/utils` into a rendering-oriented location. Keep `WebGLContext.getInstance()` unless a later decision explicitly changes renderer ownership. Consider extracting snapshot and recording behavior from `Three` into a capture module if it reduces `Three` without creating a shallow pass-through. Preserve file naming that helps navigation: render loop, WebGL context, post-processing, camera rig, color pass, and capture should be easy to find from names alone.

Milestone 5: Simplify React workflows and reduce UI code volume.

Create shell-level workflow modules or hooks for loader/scene load state and recording timers so `src/App.tsx` mostly wires rendering to UI. Move generated-scene API and polling behavior out of `ImagePanel` so the panel renders state and dispatches actions. Move control randomization and reset behavior beside the control schema. Replace or consolidate custom icons where possible, and remove React 19 `forwardRef` wrappers if the selected icon strategy still uses local icon components.

Milestone 6: Address performance and accessibility warnings.

Add reduced-motion handling for motion usage. Replace `motion` imports with a lower-overhead LazyMotion pattern or another project-consistent pattern if it preserves the current animation feel. Reduce expensive blur radii or scope them to smaller elements where visual quality remains acceptable. Investigate code splitting only after dead code and icon cleanup, because the current large chunk may shrink enough from simpler imports. Keep Vite's chunk warning visible unless there is a deliberate reason to raise the limit.

Milestone 7: Final browser verification.

Start the dev server with `bun run dev`. In a browser, confirm the initial bundled scene loads, the `loader` overlay disappears, scene switching works, controls change the scene, reset/randomize work, pause/resume works, info overlay toggles, snapshot download works, recording starts/stops where supported, and uploads remain hidden or available according to `VITE_ENABLE_UPLOAD_UI`. If rendering, shader, or responsive behavior changed, verify at a desktop viewport and a mobile-width viewport.

## Concrete Steps

From `/Users/yusufparak/Code/particle-generator`, use Bun for all project commands.

Baseline commands already run during planning:

    bun run check
    bunx tsc --noEmit
    bun run build
    npx -y react-doctor@latest . --verbose

Observed baseline:

    bun run check
    Result: fails with 13 formatting errors, including archived files.

    bunx tsc --noEmit
    Result: passes with no output.

    bun run build
    Result: passes. Vite warns that the main JS chunk is larger than 500 kB.

    npx -y react-doctor@latest . --verbose
    Result: 88 / 100, 1 error, 107 warnings. The error is missing reduced-motion handling.

Implementation commands to run at each milestone:

    bun run check
    bunx tsc --noEmit
    bun run build
    npx -y react-doctor@latest . --verbose

Final validation commands run on 2026-05-06:

    bun run check
    Result: passes. Biome checks 49 files and excludes `src/components/archived`.

    bun run test
    Result: passes. 5 tests pass across `tests/pointAssetData.test.ts` and `tests/generatedScenes.test.ts`.

    bunx tsc --noEmit
    Result: passes with no output.

    bun run build
    Result: passes. Vite still warns that the main JS chunk is larger than 500 kB. Final main JS chunk: 1,027.58 kB minified, 297.12 kB gzip.

    npx -y react-doctor@latest . --verbose
    Result: 93 / 100, 48 warnings, 0 errors. Remaining warnings include archived files, compatibility exports kept for archived TypeScript, related state in App/ImagePanel, sequential job polling, and the intentional manual `strip-ply` script.

## Validation and Acceptance

Architecture acceptance:

The final live source should have fewer low-value files and fewer generic folders. `src/components/archived` must have no content changes. `src/utils` should either disappear or contain only utilities that genuinely do not belong to a rendering, point asset, server, or UI workflow module. A developer should be able to answer "where is point asset loading?", "where is scene orchestration?", "where are visual controls defined?", and "where is generated-scene upload handled?" from file and folder names without reading many unrelated files.

Behavior acceptance:

After running `bun run dev`, opening the app should load the default bundled scene from `public/*.pgs.gz`. The loader overlay with IDs `loader` and `loader-bar` should disappear after the initial scene finishes. Selecting another bundled scene should morph or load into that scene without console errors. Controls should update particle size, flow, scene fog/background, lighting, bloom, color, camera, and renderer settings. Snapshot download should create a PNG. Recording should start and stop in browsers that support the selected MP4 MediaRecorder type. Info mode should still animate point information visibility. Generated image scenes should still work when the local server and upload UI flag are enabled.

Quality acceptance:

`bunx tsc --noEmit` must pass. `bun run build` must pass. The live-code Biome command from Milestone 1 must pass. React Doctor should have no reduced-motion error, and any remaining warnings should be documented if intentionally accepted. New pure tests should cover parsing and workflow logic. Browser smoke verification must be performed for rendering-affecting milestones.

Final browser smoke verification was performed against `http://localhost:5173/` with `agent-browser`. Observed results: the page title was `Particle Generator`; a canvas existed at 1280 by 577 CSS pixels; `#loader` opacity became `0` and pointer events became `none`; toolbar buttons, scene control tabs, and the image panel were accessible; the image panel listed bundled scenes; selecting `colosseum` made the `colosseum` scene item active; pause changed the pause action to play in an earlier smoke pass; and info text appeared when toggled in an earlier smoke pass.

## Idempotence and Recovery

All file moves should be done in small milestones with checks after each milestone. Before deleting any file, run `rg` for its basename and exported symbols across `src`, `shared`, `server`, `scripts`, and `vite.config.ts`, excluding `node_modules` and `dist`. Do not use `git reset --hard`. If a move causes confusing import errors, use the TypeScript error output as the source of truth and update imports rather than reverting unrelated user changes. Do not edit `dist` except as output from validation builds, and do not commit generated build output unless explicitly requested.

## Artifacts and Notes

Current largest live files outside archived by line count:

    901 src/utils/PlyLoader.ts
    597 src/components/ControlsPanel.tsx
    528 src/components/ImagePanel.tsx
    509 src/components/sceneControlsConfig.ts
    386 server/generator.ts
    353 src/core/Three.ts
    296 src/App.tsx
    262 src/components/ActionPanel.tsx
    254 src/components/ui/range-slider.tsx
    241 src/scenes/Scene.ts
    236 scripts/pgs-format.ts
    194 src/core/WebGLContext.ts

Likely unused live files or exports found during planning:

    shared/sceneSelection.ts
    src/utils/ImportGltf.ts
    src/utils/PBRTextureLoader.ts
    src/components/icons/chevron-right.svg
    src/components/sceneControlsConfig.ts DEFAULT_OPEN_SECTIONS
    src/components/ui/separator.tsx

Do not treat these as deletion instructions without rechecking imports immediately before deletion.

React Doctor findings to prioritize, excluding archived-only findings:

    Error: project uses motion without reduced-motion handling.
    Warning: use LazyMotion/m imports instead of direct motion imports to reduce bundle size.
    Warning: React 19 no longer needs forwardRef wrappers in local icon components.
    Warning: SVG path decimals in icons are over-precise.
    Warning: large blur filters are potentially expensive on mobile.
    Warning: App, ImagePanel, and some UI primitives have related state that should be grouped or derived.

## Interfaces and Dependencies

Do not introduce new runtime dependencies for architecture cleanup unless a milestone proves a clear need. Keep Bun, Vite, React, Three.js, Base UI, Motion, Tailwind, and lucide-react as the existing stack. Prefer moving and deepening existing modules over adding abstraction libraries.

The stable external behavior to preserve is:

- `src/main.tsx` renders `src/App.tsx` into `#app`.
- Vite serves the app from `base: "/"`.
- Bundled point assets are discovered from `public/*.pgs.gz` by the virtual bundled-scenes plugin in `vite.config.ts`.
- The loader overlay keeps DOM IDs `loader` and `loader-bar`.
- Shaders stay under `src/shaders` and are imported through `vite-plugin-glsl`.
- The optional generation server keeps `/api/scenes`, `/api/jobs/:id`, and `/generated/*` behavior.
- Build and validation use Bun commands, not npm/yarn/pnpm lockfiles.

The intended internal direction is:

- A point asset runtime module gives `Scene` one obvious place for load, transition, update, resize, settings, info visibility, stats, and disposal behavior.
- Parsing and packing share point asset vocabulary where practical, with pure functions testable without WebGL.
- Rendering helpers live near rendering orchestration, not in a generic `utils` folder.
- React workflow state is grouped by user workflow rather than scattered as unrelated `useState` calls.
- UI primitive exports are consistent and avoid duplicate default/named export patterns when possible.

## Revision Notes

2026-05-06 / Codex: Created the initial architecture simplification plan from source analysis, validation baseline, and React Doctor output. The plan keeps archived untouched and focuses on developer ease of understanding as the primary outcome.

2026-05-06 / Codex: Implemented the plan. The main route was deleting shallow live modules, retiring `src/utils`, naming the point asset runtime directly, adding pure point asset tests, keeping archived compatibility without editing archived, and improving validation/performance evidence.
