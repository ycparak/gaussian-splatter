/// <reference types="vite/client" />

declare module "virtual:bundled-scenes" {
	import type { SceneAsset } from "../shared/types";

	export const bundledScenes: SceneAsset[];
}

declare module "*.glsl" {
	const shaderSource: string;
	export default shaderSource;
}

declare module "*.frag" {
	const shaderSource: string;
	export default shaderSource;
}

declare module "*.vert" {
	const shaderSource: string;
	export default shaderSource;
}
