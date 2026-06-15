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
	English: {
		camera: {
			z: 4.4,
			targetY: -0.3,
		},
		scene: {
			fogNear: 35.5,
		},
		lighting: {
			specular: 0.02,
			shininess: 85,
		},
		color: {
			brightness: 0.15,
			contrast: 0.58,
			saturation: 1.49,
			tintStrength: 0.45,
		},
		bloom: {
			strength: 0.65,
			radius: 0.3,
			threshold: 0.42,
		},
		renderer: {
			exposure: 1.75,
		},
	},
	Iran: {
		camera: {
			z: 2.95,
			targetY: -0.1,
		},
		particles: {
			size: 0.035,
			flowFieldInfluence: 0.35,
		},
		scene: {
			fogNear: 19.5,
			fogFar: 20.5,
			pointRotationX: 3.14,
		},
		lighting: {
			ambient: 0.45,
			specular: 0.0,
		},
		color: {
			brightness: -0.1,
			contrast: 0.52,
			tintStrength: 0.75,
		},
		bloom: {
			strength: 0.05,
			radius: 0.1,
			threshold: 0.34,
		},
		renderer: {
			exposure: 0.95,
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
	Petra: {
		camera: {
			fov: 56,
			z: 2.05,
			targetX: 0.05,
			targetY: -0.1,
			targetZ: -4.25,
		},
		scene: {
			pointRotationX: 3.09,
		},
		color: {
			brightness: 0.1,
			contrast: 0.55,
			saturation: 1.27,
		},
		bloom: {
			strength: 0.1,
			radius: 0.05,
			threshold: 0.75,
		},
		renderer: {
			exposure: 0.9,
		},
	},
	Patio: {
		camera: {
			fov: 44,
			z: 2.7,
			targetX: -0.45,
			targetY: 0.15,
			targetZ: -5.0,
		},
		particles: {
			size: 0.028,
			flowFieldInfluence: 0.43,
			flowFieldStrength: 0.4,
			flowFieldFrequency: 2.0,
			decayRate: 1.8,
			returnForce: 1.8,
			morphDuration: 1.65,
		},
		scene: {
			scale: 1.05,
		},
		lighting: {
			ambient: 0.35,
			diffuse: 0.65,
			specular: 0.0,
		},
		color: {
			brightness: 0.01,
			contrast: 0.58,
			saturation: 1.38,
		},
		bloom: {
			strength: 0.95,
			radius: 0.53,
			threshold: 0.39,
		},
	},
	Aylesbury: {
		camera: {
			targetX: 0.1,
			targetY: 0.15,
			targetZ: -5.85,
		},
		particles: {
			size: 0.0425,
		},
		color: {
			brightness: -0.14,
			saturation: 1.5,
			tintStrength: 0.5,
		},
		bloom: {
			strength: 0.05,
			threshold: 0.65,
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
