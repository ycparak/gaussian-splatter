import type { SceneSettings } from "@/shared/types";

export const DEFAULT_SCENE_SETTINGS = {
	particles: {
		size: 0.05,
		flowFieldInfluence: 0.5,
		flowFieldStrength: 1.2,
		flowFieldFrequency: 0.5,
		timeScale: 0.2,
		decayRate: 0.9,
		returnForce: 7.0,
		morphDuration: 1.45,
	},
	scene: {
		background: "#000000",
		fogEnabled: true,
		fogColor: "#000000",
		fogNear: 40,
		fogFar: 45,
		pointRotationX: Math.PI,
		scale: 1,
	},
	lighting: {
		directionX: 0.5,
		directionY: 0.8,
		directionZ: 1.0,
		ambient: 0.5,
		diffuse: 0.5,
		specular: 0.05,
		shininess: 32,
	},
	bloom: {
		enabled: true,
		strength: 0.4,
		radius: 0.1,
		threshold: 0.5,
	},
	color: {
		brightness: 0,
		contrast: 0.65,
		saturation: 1.2,
		tintColor: "#fff4df",
		tintStrength: 0,
	},
	camera: {
		fov: 45,
		z: 3,
		targetX: 0,
		targetY: 0,
		targetZ: -5,
		damping: 2,
		xMin: -10.25,
		xMax: 10.25,
		yMin: -1.25,
		yMax: 0.25,
		bobAmplitude: 1,
		bobSpeed: 0.5,
		rollAmplitude: 0.1,
	},
	renderer: {
		pixelRatioCap: 2,
		antialias: false,
		toneMapping: "aces",
		exposure: 1,
	},
} satisfies SceneSettings;

export function cloneSceneSettings(
	settings: SceneSettings = DEFAULT_SCENE_SETTINGS,
): SceneSettings {
	return structuredClone(settings);
}
