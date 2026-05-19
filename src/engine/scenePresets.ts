import type { SceneAsset } from '@/shared/types'
import type { SceneSettings } from '@/shared/types'
import { cloneSceneSettings, DEFAULT_SCENE_SETTINGS } from '@/src/engine/sceneSettings'

type DeepPartial<T> = {
	[K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K]
}

const BUNDLED_SCENE_SETTING_OVERRIDES: Record<string, DeepPartial<SceneSettings>> = {
	Chapel: {
		camera: {
			targetX: -0.3,
			targetZ: -15,
			damping: 3.6,
		},
		particles: {
			size: 0.084,
			flowFieldStrength: 1.65,
		},
		scene: {
			fogNear: 45,
			fogFar: 120,
			pointRotationX: 3.1,
			scale: 1.95,
		},
		lighting: {
			ambient: 0.65,
			diffuse: 0.7,
			specular: 0.11,
			shininess: 91,
		},
		color: {
			brightness: -0.17,
			contrast: 0.64,
			saturation: 1.6,
			tintStrength: 0.63,
		},
		bloom: {
			strength: 0.7,
			radius: 0.79,
			threshold: 0.54,
		},
		renderer: {
			pixelRatioCap: 3,
			exposure: 1.75,
		},
	},
}

export function resolveSceneSettingsPreset(
	asset: SceneAsset | null,
	baseSettings: SceneSettings = DEFAULT_SCENE_SETTINGS
): SceneSettings {
	const settings = cloneSceneSettings(baseSettings)
	if (!asset || asset.source !== 'bundled') {
		return settings
	}

	const overrides = BUNDLED_SCENE_SETTING_OVERRIDES[asset.id]
	if (!overrides) {
		return settings
	}

	return {
		particles: {
			...settings.particles,
			...overrides.particles,
		},
		scene: {
			...settings.scene,
			...overrides.scene,
		},
		lighting: {
			...settings.lighting,
			...overrides.lighting,
		},
		bloom: {
			...settings.bloom,
			...overrides.bloom,
		},
		color: {
			...settings.color,
			...overrides.color,
		},
		camera: {
			...settings.camera,
			...overrides.camera,
		},
		renderer: {
			...settings.renderer,
			...overrides.renderer,
		},
	}
}
