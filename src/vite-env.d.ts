/// <reference types="vite/client" />

declare module '*.glsl' {
	const shaderSource: string
	export default shaderSource
}

declare module '*.frag' {
	const shaderSource: string
	export default shaderSource
}

declare module '*.vert' {
	const shaderSource: string
	export default shaderSource
}

interface ImportMetaEnv {
	readonly VITE_ENABLE_UPLOADS?: string
	readonly VITE_BUNDLED_SCENES_BASE_URL?: string
}

interface ImportMeta {
	readonly env: ImportMetaEnv
}
