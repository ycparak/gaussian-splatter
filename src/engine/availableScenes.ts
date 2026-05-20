import type { SceneAsset } from '@/shared/types'
import { bundledScenes as bundledScenesFromPublic } from 'virtual:bundled-scenes'

export const bundledScenes = bundledScenesFromPublic as SceneAsset[]

export const defaultScene: SceneAsset | null = bundledScenes[0] ?? null

export type { SceneAsset }
