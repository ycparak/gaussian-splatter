import type { SceneAsset } from '@/shared/types'

const BUNDLED_SCENE_IDS = [
	'Chapel',
	'Colosseum',
	'Modern',
	'Nous',
	'Tokyo',
] as const

const FALLBACK_BASE_URL = import.meta.env.BASE_URL

function resolveBundledScenesBaseUrl(baseUrl: string | undefined): string {
	const normalizedBaseUrl = baseUrl?.trim()
	if (!normalizedBaseUrl) {
		return FALLBACK_BASE_URL
	}

	return normalizedBaseUrl.endsWith('/') ? normalizedBaseUrl : `${normalizedBaseUrl}/`
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
