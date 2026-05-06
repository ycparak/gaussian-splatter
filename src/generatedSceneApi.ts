import type {
	GeneratedScene,
	GenerationJob,
	GenerationJobStatus,
} from "@/shared/types";

export const FINAL_JOB_STATUSES = new Set<GenerationJobStatus>([
	"done",
	"error",
]);

interface ScenesResponse {
	scenes: GeneratedScene[];
}

interface JobResponse {
	job: GenerationJob;
}

export async function fetchJson<T>(
	input: RequestInfo | URL,
	init?: RequestInit,
): Promise<T> {
	const response = await fetch(input, init);
	const payload = (await response.json()) as T & { error?: string };
	if (!response.ok) {
		throw new Error(payload.error ?? "Request failed.");
	}
	return payload;
}

export async function fetchGeneratedScenes(
	init?: RequestInit,
): Promise<GeneratedScene[]> {
	const payload = await fetchJson<ScenesResponse>("/api/scenes", init);
	return payload.scenes ?? [];
}

export async function createGenerationJob(
	formData: FormData,
	signal: AbortSignal,
): Promise<GenerationJob> {
	const payload = await fetchJson<JobResponse>("/api/scenes", {
		method: "POST",
		body: formData,
		signal,
	});
	return payload.job;
}

export async function fetchGenerationJob(
	id: string,
	signal: AbortSignal,
): Promise<GenerationJob> {
	const payload = await fetchJson<JobResponse>(`/api/jobs/${id}`, { signal });
	return payload.job;
}

export async function resolveCompletedScene(
	job: GenerationJob,
	signal: AbortSignal,
): Promise<GeneratedScene | null> {
	if (job.scene?.url) return job.scene;
	const scenes = await fetchGeneratedScenes({ signal });
	return scenes.find((scene) => scene.id === job.sceneId) ?? null;
}

export function statusMessage(job: GenerationJob | null): string {
	if (!job) return "";
	if (job.status === "error") {
		return job.error ?? job.progress ?? "Generation failed";
	}
	return job.progress ?? "";
}
