export type SceneSource = "bundled" | "generated";

export type ToneMappingMode = "none" | "linear" | "reinhard" | "aces";

export interface ParticleSettings {
	size: number;
	flowFieldInfluence: number;
	flowFieldStrength: number;
	flowFieldFrequency: number;
	timeScale: number;
	decayRate: number;
	returnForce: number;
	morphDuration: number;
}

export interface SceneVisualSettings {
	background: string;
	fogEnabled: boolean;
	fogColor: string;
	fogNear: number;
	fogFar: number;
	pointRotationX: number;
	scale: number;
}

export interface LightingSettings {
	directionX: number;
	directionY: number;
	directionZ: number;
	ambient: number;
	diffuse: number;
	specular: number;
	shininess: number;
}

export interface BloomSettings {
	enabled: boolean;
	strength: number;
	radius: number;
	threshold: number;
}

export interface ColorSettings {
	brightness: number;
	contrast: number;
	saturation: number;
	tintColor: string;
	tintStrength: number;
}

export interface CameraSettings {
	fov: number;
	z: number;
	targetX: number;
	targetY: number;
	targetZ: number;
	damping: number;
	xMin: number;
	xMax: number;
	yMin: number;
	yMax: number;
	bobAmplitude: number;
	bobSpeed: number;
	rollAmplitude: number;
}

export interface RendererSettings {
	pixelRatioCap: number;
	antialias: boolean;
	toneMapping: ToneMappingMode;
	exposure: number;
}

export interface SceneSettings {
	particles: ParticleSettings;
	scene: SceneVisualSettings;
	lighting: LightingSettings;
	bloom: BloomSettings;
	color: ColorSettings;
	camera: CameraSettings;
	renderer: RendererSettings;
}

export interface SceneAsset {
	id: string;
	name: string;
	url: string;
	source: SceneSource;
	previewUrl?: string;
	vertexCount?: number;
	originalBytes?: number;
	optimizedBytes?: number;
	ratio?: number;
	createdAt?: string;
	sourceHash?: string;
}

export interface GeneratedScene extends SceneAsset {
	source: "generated";
}

export interface SceneStats {
	activeAssetId: string | null;
	particleCount: number;
}

export type GenerationJobStatus =
	| "queued"
	| "running"
	| "optimizing"
	| "done"
	| "error";

export interface GenerationJob {
	id: string;
	sceneId: string;
	name: string;
	status: GenerationJobStatus;
	progress: string;
	createdAt: string;
	updatedAt: string;
	error?: string;
	scene?: GeneratedScene;
}

export interface SceneManifest {
	scenes: GeneratedScene[];
}

export interface Bounds3 {
	min: [number, number, number];
	max: [number, number, number];
}

export interface PackPlyResult {
	inputBytes: number;
	outputBytes: number;
	vertexCount: number;
	ratio: number;
	bounds: Bounds3;
}

export interface ParsedPointAsset {
	positions: Float32Array;
	colors: Float32Array;
	vertexCount: number;
}

export interface SceneLoadCallbacks {
	onLoadStart?: (asset: SceneAsset) => void;
	onLoadProgress?: (asset: SceneAsset, progress: number) => void;
	onLoadSuccess?: (asset: SceneAsset, stats: SceneStats) => void;
	onLoadError?: (asset: SceneAsset, error: Error) => void;
}
