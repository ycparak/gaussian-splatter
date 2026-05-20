import type { SceneAsset } from '@/shared/types'
import type { SceneSettings } from '@/shared/types'
import { cloneSceneSettings, DEFAULT_SCENE_SETTINGS } from '@/src/engine/sceneSettings'

type DeepPartial<T> = {
	[K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K]
}

const BUNDLED_SCENE_SETTING_OVERRIDES: Record<string, DeepPartial<SceneSettings>> = {
	Chapel: {
		camera: {
			fov: 50,
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
			saturation: 1.5,
			tintStrength: 0.5,
		},
		bloom: {
			strength: 0.5,
			radius: 0.79,
			threshold: 0.54,
		},
		renderer: {
			pixelRatioCap: 3,
			exposure: 1.75,
		},
	},
	Colosseum: {
		camera: {
			fov: 48,
			targetX: -0.35,
			targetY: 1.2,
			damping: 3.6,
		},
		particles: {
			size: 0.02,
		},
		scene: {
			fogNear: 45.0,
			fogFar: 55.5,
		},
		color: {
			brightness: 0.19,
			contrast: 0.45,
			saturation: 1.43,
		},
		bloom: {
			strength: 0.15,
			radius: 1.0,
			threshold: 0.73,
		},
	},
	Modern: {
		camera: {
			z: 5.75,
			targetY: -0.75,
			targetZ: -6.45,
		},
		particles: {
			size: 0.06,
		},
		scene: {
			pointRotationX: 3.12,
			scale: 1.1,
		},
		lighting: {
			diffuse: 0.4,
			specular: 0.0,
		},
		color: {
			contrast: 0.57,
			saturation: 1.72,
			tintStrength: 0.31,
		},
		bloom: {
			strength: 0.15,
			radius: 0.37,
			threshold: 0.18,
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
