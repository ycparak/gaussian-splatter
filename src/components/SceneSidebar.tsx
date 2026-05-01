import { ChevronLeft, ChevronRight, RefreshCw, X } from "lucide-react";
import {
	startTransition,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { bundledScenes } from "@/scenes/availableScenes";
import { abortableWait } from "../../shared/abortableWait";
import { mergeGeneratedScene } from "../../shared/generatedScenes";
import type {
	GeneratedScene,
	GenerationJob,
	GenerationJobStatus,
	SceneAsset,
} from "../../shared/types";
import { SceneList } from "./scene-sidebar/SceneList";
import { StatusLine } from "./scene-sidebar/StatusLine";
import { UploadPanel } from "./scene-sidebar/UploadPanel";

const FINAL_JOB_STATUSES = new Set<GenerationJobStatus>(["done", "error"]);

interface SceneSidebarProps {
	activeSceneId: string | null;
	onSceneSelect: (scene: SceneAsset) => void;
	sceneErrorMessage: string | null;
}

interface ScenesResponse {
	scenes: GeneratedScene[];
}

interface JobResponse {
	job: GenerationJob;
}

export default function SceneSidebar({
	activeSceneId,
	onSceneSelect,
	sceneErrorMessage,
}: SceneSidebarProps) {
	const [isOpen, setIsOpen] = useState(true);
	const [isDragging, setIsDragging] = useState(false);
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [previewUrl, setPreviewUrl] = useState("");
	const [generatedScenes, setGeneratedScenes] = useState<GeneratedScene[]>([]);
	const [job, setJob] = useState<GenerationJob | null>(null);
	const [message, setMessage] = useState("");
	const fileInputRef = useRef<HTMLInputElement | null>(null);
	const jobPollControllerRef = useRef<AbortController | null>(null);
	const scenes = useMemo(
		() => [...bundledScenes, ...generatedScenes],
		[generatedScenes],
	);
	const isBusy =
		job?.status === "queued" ||
		job?.status === "running" ||
		job?.status === "optimizing";

	const refreshScenes = useCallback(
		async (options: { silent?: boolean } = {}) => {
			try {
				const payload = await fetchJson<ScenesResponse>("/api/scenes");
				startTransition(() => setGeneratedScenes(payload.scenes ?? []));
				if (!options.silent) setMessage("Scene list refreshed.");
			} catch (error) {
				if (!options.silent) {
					setMessage(error instanceof Error ? error.message : String(error));
				}
			}
		},
		[],
	);

	useEffect(() => {
		void refreshScenes({ silent: true });

		return () => {
			jobPollControllerRef.current?.abort();
		};
	}, [refreshScenes]);

	useEffect(() => {
		if (!selectedFile) {
			setPreviewUrl("");
			return;
		}

		const objectUrl = URL.createObjectURL(selectedFile);
		setPreviewUrl(objectUrl);

		return () => {
			URL.revokeObjectURL(objectUrl);
		};
	}, [selectedFile]);

	function handlePickFile(file: File | null) {
		if (!file) return;

		if (!file.type.startsWith("image/")) {
			setMessage("Choose an image file.");
			return;
		}

		jobPollControllerRef.current?.abort();
		jobPollControllerRef.current = null;
		setSelectedFile(file);
		setJob(null);
		setMessage("");
	}

	async function handleGenerate() {
		if (!selectedFile || isBusy) return;

		const formData = new FormData();
		formData.append("image", selectedFile);
		let controller: AbortController | null = null;

		try {
			setMessage("Uploading image...");
			jobPollControllerRef.current?.abort();
			controller = new AbortController();
			jobPollControllerRef.current = controller;

			const payload = await fetchJson<JobResponse>("/api/scenes", {
				method: "POST",
				body: formData,
				signal: controller.signal,
			});
			setJob(payload.job);
			setMessage(statusMessage(payload.job));
			await followGenerationJob(payload.job, controller.signal);
		} catch (error) {
			if (!(error instanceof Error) || error.name !== "AbortError") {
				setMessage(error instanceof Error ? error.message : String(error));
			}
		} finally {
			if (jobPollControllerRef.current === controller) {
				jobPollControllerRef.current = null;
			}
		}
	}

	async function followGenerationJob(
		initialJob: GenerationJob,
		signal: AbortSignal,
	) {
		let nextJob = initialJob;

		while (nextJob.id && !FINAL_JOB_STATUSES.has(nextJob.status)) {
			await abortableWait(1500, signal);
			nextJob = (
				await fetchJson<JobResponse>(`/api/jobs/${nextJob.id}`, {
					signal,
				})
			).job;
			setJob(nextJob);
			setMessage(statusMessage(nextJob));
		}

		if (nextJob.status !== "done") return;

		const scene = await resolveCompletedScene(nextJob, signal);
		if (!scene) {
			throw new Error("Generation completed but no scene was returned.");
		}

		startTransition(() => {
			setGeneratedScenes((currentScenes) =>
				mergeGeneratedScene(currentScenes, scene),
			);
		});
		onSceneSelect(scene);
	}

	return (
		<div className="dark pointer-events-none fixed inset-0 z-40 text-[12px] tracking-normal text-foreground">
			<aside
				className={cn(
					"pointer-events-auto fixed top-14 right-2 bottom-2 flex w-80 flex-col overflow-hidden rounded-lg border border-border/60 bg-card/85 shadow-2xl shadow-black/40 backdrop-blur-md transition-[transform,opacity] duration-300 ease-out max-sm:top-[calc(50lvh+0.25rem)] max-sm:left-2 max-sm:w-auto",
					isOpen
						? "translate-x-0 opacity-100"
						: "translate-x-[calc(100%+0.75rem)] opacity-0",
				)}
				aria-hidden={!isOpen}
				inert={!isOpen}
			>
				<header className="flex h-9 shrink-0 items-center justify-between px-3">
					<h2 className="font-semibold text-[13px] text-foreground">Scenes</h2>
					<Button
						type="button"
						variant="ghost"
						size="icon-xs"
						className="text-muted-foreground hover:text-foreground"
						aria-label="Hide scenes sidebar"
						onClick={() => setIsOpen(false)}
					>
						<X />
					</Button>
				</header>

				<Separator className="bg-border/40" />

				<div className="flex min-h-0 flex-1 flex-col gap-3 p-3">
					<UploadPanel
						fileInputRef={fileInputRef}
						isDragging={isDragging}
						previewUrl={previewUrl}
						selectedFile={selectedFile}
						isBusy={isBusy}
						onInputChange={(event) =>
							handlePickFile(event.target.files?.[0] ?? null)
						}
						onPickClick={() => fileInputRef.current?.click()}
						onDragEnter={(event) => {
							event.preventDefault();
							setIsDragging(true);
						}}
						onDragOver={(event) => event.preventDefault()}
						onDragLeave={() => setIsDragging(false)}
						onDrop={(event) => {
							event.preventDefault();
							setIsDragging(false);
							handlePickFile(event.dataTransfer.files?.[0] ?? null);
						}}
						onGenerate={() => void handleGenerate()}
					/>

					{message ? (
						<StatusLine status={job?.status ?? "idle"} message={message} />
					) : null}
					{sceneErrorMessage ? (
						<StatusLine status="error" message={sceneErrorMessage} />
					) : null}

					<SceneList
						scenes={scenes}
						activeSceneId={activeSceneId}
						onSceneSelect={onSceneSelect}
					/>

					<Button
						type="button"
						variant="secondary"
						size="sm"
						className="h-8 w-full bg-muted/45 text-muted-foreground hover:bg-muted/65 hover:text-foreground"
						onClick={() => void refreshScenes()}
					>
						<RefreshCw data-icon="inline-start" />
						Refresh
					</Button>
				</div>
			</aside>

			<Button
				type="button"
				variant="secondary"
				size="icon-sm"
				className={cn(
					"pointer-events-auto fixed right-2 bottom-6 bg-card/85 text-muted-foreground shadow-xl shadow-black/35 backdrop-blur-md transition-[transform,color,background-color] duration-300 ease-out hover:bg-muted hover:text-foreground max-sm:bottom-3",
					isOpen ? "-translate-x-82 max-sm:translate-x-0" : "translate-x-0",
				)}
				aria-label={isOpen ? "Hide scenes sidebar" : "Show scenes sidebar"}
				aria-expanded={isOpen}
				onClick={() => setIsOpen((value) => !value)}
			>
				{isOpen ? <ChevronRight /> : <ChevronLeft />}
			</Button>
		</div>
	);
}

async function fetchJson<T>(
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

async function resolveCompletedScene(
	job: GenerationJob,
	signal: AbortSignal,
): Promise<GeneratedScene | null> {
	if (job.scene?.url) return job.scene;
	const payload = await fetchJson<ScenesResponse>("/api/scenes", { signal });
	return payload.scenes.find((scene) => scene.id === job.sceneId) ?? null;
}

function statusMessage(job: GenerationJob | null): string {
	if (!job) return "";
	if (job.status === "error") {
		return job.error ?? job.progress ?? "Generation failed";
	}
	return job.progress ?? "";
}
