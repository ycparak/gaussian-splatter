function parseBooleanEnv(
	value: string | undefined,
	fallback: boolean,
): boolean {
	if (value === undefined) return fallback;

	const normalized = value.trim().toLowerCase();
	if (!normalized) return fallback;

	return ["1", "true", "yes", "on"].includes(normalized);
}

export const isUploadUiEnabled =
	import.meta.env.DEV ||
	parseBooleanEnv(import.meta.env.VITE_ENABLE_UPLOADS, false);
