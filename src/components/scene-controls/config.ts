import type {
	SceneSettings,
	SceneStats,
	ToneMappingMode,
} from "../../../shared/types";

export type SettingsGroup = keyof SceneSettings;

export interface SelectOption<T extends string> {
	label: string;
	value: T;
}

export type ControlDefinition =
	| {
			kind: "slider";
			label: string;
			group: SettingsGroup;
			settingKey: string;
			min: number;
			max: number;
			step: number;
			digits: number;
	  }
	| {
			kind: "toggle";
			label: string;
			group: SettingsGroup;
			settingKey: string;
	  }
	| {
			kind: "color";
			label: string;
			group: SettingsGroup;
			settingKey: string;
	  }
	| {
			kind: "select";
			label: string;
			group: SettingsGroup;
			settingKey: string;
			options: SelectOption<ToneMappingMode>[];
	  }
	| {
			kind: "readonly";
			label: string;
			getValue: (settings: SceneSettings, stats: SceneStats) => string;
	  };

export interface ControlSectionDefinition {
	id: SettingsGroup;
	title: string;
	controls: ControlDefinition[];
}

export const DEFAULT_OPEN_SECTIONS: Record<SettingsGroup, boolean> = {
	particles: true,
	scene: false,
	lighting: false,
	bloom: false,
	color: true,
	camera: false,
	renderer: false,
};

const TONE_MAPPING_OPTIONS: SelectOption<ToneMappingMode>[] = [
	{ label: "ACES Filmic", value: "aces" },
	{ label: "Linear", value: "linear" },
	{ label: "Reinhard", value: "reinhard" },
	{ label: "None", value: "none" },
];

export const CONTROL_SECTIONS: ControlSectionDefinition[] = [
	{
		id: "particles",
		title: "Particles",
		controls: [
			{
				kind: "readonly",
				label: "Count",
				getValue: (_settings, stats) =>
					(stats.particleCount ?? 0).toLocaleString(),
			},
			{
				kind: "slider",
				label: "Size",
				group: "particles",
				settingKey: "size",
				min: 0.005,
				max: 0.12,
				step: 0.001,
				digits: 3,
			},
			{
				kind: "slider",
				label: "Flow Influence",
				group: "particles",
				settingKey: "flowFieldInfluence",
				min: 0,
				max: 1,
				step: 0.01,
				digits: 2,
			},
			{
				kind: "slider",
				label: "Flow Strength",
				group: "particles",
				settingKey: "flowFieldStrength",
				min: 0,
				max: 4,
				step: 0.05,
				digits: 2,
			},
			{
				kind: "slider",
				label: "Flow Frequency",
				group: "particles",
				settingKey: "flowFieldFrequency",
				min: 0.05,
				max: 3,
				step: 0.05,
				digits: 2,
			},
			{
				kind: "slider",
				label: "Time Scale",
				group: "particles",
				settingKey: "timeScale",
				min: 0,
				max: 1,
				step: 0.01,
				digits: 2,
			},
			{
				kind: "slider",
				label: "Decay Rate",
				group: "particles",
				settingKey: "decayRate",
				min: 0.1,
				max: 3,
				step: 0.05,
				digits: 2,
			},
			{
				kind: "slider",
				label: "Return Force",
				group: "particles",
				settingKey: "returnForce",
				min: 0,
				max: 14,
				step: 0.1,
				digits: 1,
			},
			{
				kind: "slider",
				label: "Morph Duration",
				group: "particles",
				settingKey: "morphDuration",
				min: 0.15,
				max: 4,
				step: 0.05,
				digits: 2,
			},
		],
	},
	{
		id: "scene",
		title: "Scene",
		controls: [
			{
				kind: "color",
				label: "Background",
				group: "scene",
				settingKey: "background",
			},
			{
				kind: "toggle",
				label: "Fog",
				group: "scene",
				settingKey: "fogEnabled",
			},
			{
				kind: "color",
				label: "Fog Color",
				group: "scene",
				settingKey: "fogColor",
			},
			{
				kind: "slider",
				label: "Fog Near",
				group: "scene",
				settingKey: "fogNear",
				min: 0,
				max: 100,
				step: 0.5,
				digits: 1,
			},
			{
				kind: "slider",
				label: "Fog Far",
				group: "scene",
				settingKey: "fogFar",
				min: 1,
				max: 120,
				step: 0.5,
				digits: 1,
			},
			{
				kind: "slider",
				label: "Rotation X",
				group: "scene",
				settingKey: "pointRotationX",
				min: 0,
				max: Math.PI * 2,
				step: 0.01,
				digits: 2,
			},
			{
				kind: "slider",
				label: "Scale",
				group: "scene",
				settingKey: "scale",
				min: 0.2,
				max: 3,
				step: 0.01,
				digits: 2,
			},
		],
	},
	{
		id: "lighting",
		title: "Lighting",
		controls: [
			{
				kind: "slider",
				label: "Direction X",
				group: "lighting",
				settingKey: "directionX",
				min: -2,
				max: 2,
				step: 0.05,
				digits: 2,
			},
			{
				kind: "slider",
				label: "Direction Y",
				group: "lighting",
				settingKey: "directionY",
				min: -2,
				max: 2,
				step: 0.05,
				digits: 2,
			},
			{
				kind: "slider",
				label: "Direction Z",
				group: "lighting",
				settingKey: "directionZ",
				min: -2,
				max: 2,
				step: 0.05,
				digits: 2,
			},
			{
				kind: "slider",
				label: "Ambient",
				group: "lighting",
				settingKey: "ambient",
				min: 0,
				max: 2,
				step: 0.05,
				digits: 2,
			},
			{
				kind: "slider",
				label: "Diffuse",
				group: "lighting",
				settingKey: "diffuse",
				min: 0,
				max: 2,
				step: 0.05,
				digits: 2,
			},
			{
				kind: "slider",
				label: "Specular",
				group: "lighting",
				settingKey: "specular",
				min: 0,
				max: 1,
				step: 0.01,
				digits: 2,
			},
			{
				kind: "slider",
				label: "Shininess",
				group: "lighting",
				settingKey: "shininess",
				min: 1,
				max: 128,
				step: 1,
				digits: 0,
			},
		],
	},
	{
		id: "bloom",
		title: "Bloom",
		controls: [
			{
				kind: "toggle",
				label: "Enabled",
				group: "bloom",
				settingKey: "enabled",
			},
			{
				kind: "slider",
				label: "Strength",
				group: "bloom",
				settingKey: "strength",
				min: 0,
				max: 2.5,
				step: 0.05,
				digits: 2,
			},
			{
				kind: "slider",
				label: "Radius",
				group: "bloom",
				settingKey: "radius",
				min: 0,
				max: 1,
				step: 0.01,
				digits: 2,
			},
			{
				kind: "slider",
				label: "Threshold",
				group: "bloom",
				settingKey: "threshold",
				min: 0,
				max: 1,
				step: 0.01,
				digits: 2,
			},
		],
	},
	{
		id: "color",
		title: "Color Adjust",
		controls: [
			{
				kind: "slider",
				label: "Brightness",
				group: "color",
				settingKey: "brightness",
				min: -0.75,
				max: 0.75,
				step: 0.01,
				digits: 2,
			},
			{
				kind: "slider",
				label: "Contrast",
				group: "color",
				settingKey: "contrast",
				min: 0.1,
				max: 2,
				step: 0.01,
				digits: 2,
			},
			{
				kind: "slider",
				label: "Saturation",
				group: "color",
				settingKey: "saturation",
				min: 0,
				max: 2.5,
				step: 0.01,
				digits: 2,
			},
			{ kind: "color", label: "Tint", group: "color", settingKey: "tintColor" },
			{
				kind: "slider",
				label: "Tint Strength",
				group: "color",
				settingKey: "tintStrength",
				min: 0,
				max: 1,
				step: 0.01,
				digits: 2,
			},
		],
	},
	{
		id: "camera",
		title: "Camera",
		controls: [
			{
				kind: "slider",
				label: "FOV",
				group: "camera",
				settingKey: "fov",
				min: 15,
				max: 90,
				step: 1,
				digits: 0,
			},
			{
				kind: "slider",
				label: "Z Position",
				group: "camera",
				settingKey: "z",
				min: 0.5,
				max: 10,
				step: 0.05,
				digits: 2,
			},
			{
				kind: "slider",
				label: "Target X",
				group: "camera",
				settingKey: "targetX",
				min: -10,
				max: 10,
				step: 0.05,
				digits: 2,
			},
			{
				kind: "slider",
				label: "Target Y",
				group: "camera",
				settingKey: "targetY",
				min: -10,
				max: 10,
				step: 0.05,
				digits: 2,
			},
			{
				kind: "slider",
				label: "Target Z",
				group: "camera",
				settingKey: "targetZ",
				min: -15,
				max: 5,
				step: 0.05,
				digits: 2,
			},
			{
				kind: "slider",
				label: "Damping",
				group: "camera",
				settingKey: "damping",
				min: 0.25,
				max: 8,
				step: 0.05,
				digits: 2,
			},
			{
				kind: "slider",
				label: "Bob Amount",
				group: "camera",
				settingKey: "bobAmplitude",
				min: 0,
				max: 3,
				step: 0.05,
				digits: 2,
			},
			{
				kind: "slider",
				label: "Bob Speed",
				group: "camera",
				settingKey: "bobSpeed",
				min: 0,
				max: 3,
				step: 0.05,
				digits: 2,
			},
			{
				kind: "slider",
				label: "Roll Amount",
				group: "camera",
				settingKey: "rollAmplitude",
				min: 0,
				max: 0.5,
				step: 0.01,
				digits: 2,
			},
		],
	},
	{
		id: "renderer",
		title: "Renderer",
		controls: [
			{
				kind: "slider",
				label: "Pixel Ratio Cap",
				group: "renderer",
				settingKey: "pixelRatioCap",
				min: 0.5,
				max: 3,
				step: 0.25,
				digits: 2,
			},
			{
				kind: "select",
				label: "Tone Mapping",
				group: "renderer",
				settingKey: "toneMapping",
				options: TONE_MAPPING_OPTIONS,
			},
			{
				kind: "slider",
				label: "Exposure",
				group: "renderer",
				settingKey: "exposure",
				min: 0.1,
				max: 3,
				step: 0.05,
				digits: 2,
			},
			{
				kind: "readonly",
				label: "Antialias",
				getValue: (settings) => (settings.renderer.antialias ? "On" : "Off"),
			},
		],
	},
];
