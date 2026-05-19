import type { SceneAsset } from '@/shared/types'
import { bundledScenesManifest } from '@/src/engine/bundledScenesManifest'

export const bundledScenes = bundledScenesManifest as SceneAsset[]

export const defaultScene: SceneAsset | null = bundledScenes[0] ?? null

export type { SceneAsset }
