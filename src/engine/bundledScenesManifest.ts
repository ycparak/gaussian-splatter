import type { SceneAsset } from '@/shared/types'

const BUNDLED_SCENE_IDS = [
	'Chapel',
	'Colosseum',
	'Modern',
	'Nous',
	'Tokyo',
] as const

function resolveBundledScenesBaseUrl(baseUrl: string | undefined): string {
	const normalizedBaseUrl = baseUrl?.trim()
	if (normalizedBaseUrl) {
		return normalizedBaseUrl.endsWith('/') ? normalizedBaseUrl : `${normalizedBaseUrl}/`
	}

	if (import.meta.env.PROD) {
		throw new Error(
			'Missing VITE_BUNDLED_SCENES_BASE_URL in production build. Set it to your R2 public base URL.'
		)
	}

	return import.meta.env.BASE_URL
}

const bundledScenesBaseUrl = resolveBundledScenesBaseUrl(
	import.meta.env.VITE_BUNDLED_SCENES_BASE_URL
)

export const bundledScenesManifest: SceneAsset[] = BUNDLED_SCENE_IDS.map(id => ({
	id,
	name: id,
	url: `${bundledScenesBaseUrl}${id}.pgs.gz`,
	source: 'bundled',
}))
