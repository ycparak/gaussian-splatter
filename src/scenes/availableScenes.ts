import { bundledScenes as rawBundledScenes } from "virtual:bundled-scenes";
import type { SceneAsset } from "../../shared/types";

export const bundledScenes = rawBundledScenes as SceneAsset[];

export const defaultScene: SceneAsset | null = bundledScenes[0] ?? null;

export type { SceneAsset };
