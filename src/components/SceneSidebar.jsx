import {
	AlertCircle,
	CheckCircle2,
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	ImageIcon,
	LoaderCircle,
	RefreshCw,
	Sparkles,
	Upload,
	X,
} from "lucide-react";
import { startTransition, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { bundledScenes } from "@/scenes/availableScenes";

const FINAL_JOB_STATUSES = new Set(["done", "error"]);

export default function SceneSidebar({ activeSceneId, onSceneSelect }) {
	const [isOpen, setIsOpen] = useState(true);
	const [isDragging, setIsDragging] = useState(false);
	const [selectedFile, setSelectedFile] = useState(null);
	const [previewUrl, setPreviewUrl] = useState("");
	const [generatedScenes, setGeneratedScenes] = useState([]);
	const [job, setJob] = useState(null);
	const [message, setMessage] = useState("");
	const fileInputRef = useRef(null);

	const scenes = [...bundledScenes, ...generatedScenes];
	const isBusy =
		job?.status === "queued" ||
		job?.status === "running" ||
		job?.status === "optimizing";

	useEffect(() => {
		let isMounted = true;

		async function loadScenes() {
			try {
				const response = await fetch("/api/scenes");
				const payload = await response.json();
				if (!response.ok) {
					throw new Error(payload.error || "Could not load generated scenes.");
				}
				if (isMounted) {
					startTransition(() => setGeneratedScenes(payload.scenes || []));
				}
			} catch {
				// The generator server is optional until uploads are used.
			}
		}

		loadScenes();

		return () => {
			isMounted = false;
		};
	}, []);

	useEffect(() => {
		if (!selectedFile) {
			setPreviewUrl("");
			return;
		}

		const objectUrl = URL.createObjectURL(selectedFile);
		setPreviewUrl(objectUrl);

		return () => URL.revokeObjectURL(objectUrl);
	}, [selectedFile]);

	useEffect(() => {
		if (!job?.id || FINAL_JOB_STATUSES.has(job.status)) return;

		const controller = new AbortController();
		const intervalId = window.setInterval(async () => {
			try {
				const nextJob = await fetchJob(job.id, controller.signal);
				setJob(nextJob);
				setMessage(statusMessage(nextJob));

				if (nextJob.status === "done" && nextJob.scene) {
					startTransition(() => {
						setGeneratedScenes((currentScenes) =>
							mergeScene(currentScenes, nextJob.scene),
						);
					});
					onSceneSelect(nextJob.scene);
				}
			} catch (error) {
				if (error.name !== "AbortError") {
					setMessage(error.message);
				}
			}
		}, 1500);

		return () => {
			controller.abort();
			window.clearInterval(intervalId);
		};
	}, [job?.id, job?.status, onSceneSelect]);

	function handlePickFile(file) {
		if (!file) return;

		if (!file.type.startsWith("image/")) {
			setMessage("Choose an image file.");
			return;
		}

		setSelectedFile(file);
		setJob(null);
		setMessage("");
	}

	async function handleGenerate() {
		if (!selectedFile || isBusy) return;

		const formData = new FormData();
		formData.append("image", selectedFile);

		try {
			setMessage("Uploading image...");
			const response = await fetch("/api/scenes", {
				method: "POST",
				body: formData,
			});
			const payload = await response.json();
			if (!response.ok) {
				throw new Error(payload.error || "Could not start generation.");
			}
			setJob(payload.job);
			setMessage(statusMessage(payload.job));
		} catch (error) {
			setMessage(error.message);
		}
	}

	async function refreshScenes(options = {}) {
		try {
			const response = await fetch("/api/scenes");
			const payload = await response.json();
			if (!response.ok) {
				throw new Error(payload.error || "Could not load generated scenes.");
			}
			startTransition(() => setGeneratedScenes(payload.scenes || []));
			if (!options.silent) setMessage("Scene list refreshed.");
		} catch (error) {
			if (!options.silent) setMessage(error.message);
		}
	}

	function handleDrop(event) {
		event.preventDefault();
		setIsDragging(false);
		handlePickFile(event.dataTransfer.files?.[0]);
	}

	function handleSceneClick(scene) {
		onSceneSelect(scene);
	}

	return (
		<div className="dark pointer-events-none fixed inset-0 z-40 text-[12px] tracking-normal text-foreground">
			<aside
				className={cn(
					"pointer-events-auto fixed top-14 right-2 bottom-2 flex w-80 flex-col overflow-hidden rounded-lg border border-border/60 bg-card/85 shadow-2xl shadow-black/40 backdrop-blur-md transition-[transform,opacity] duration-300 ease-out",
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
					<input
						ref={fileInputRef}
						type="file"
						accept="image/*"
						className="hidden"
						onChange={(event) => handlePickFile(event.target.files?.[0])}
					/>

					<button
						type="button"
						className={cn(
							"flex h-23 shrink-0 flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border/55 bg-muted/20 text-muted-foreground transition-colors hover:bg-muted/30 hover:text-foreground",
							isDragging && "border-cyan-400/70 bg-cyan-400/10 text-foreground",
						)}
						aria-label="Upload scene image"
						onClick={() => fileInputRef.current?.click()}
						onDragEnter={(event) => {
							event.preventDefault();
							setIsDragging(true);
						}}
						onDragOver={(event) => event.preventDefault()}
						onDragLeave={() => setIsDragging(false)}
						onDrop={handleDrop}
					>
						<Upload className="size-5 opacity-65" aria-hidden="true" />
						<span className="text-[11px]">Drop image or click to browse</span>
					</button>

					{previewUrl ? (
						<section className="overflow-hidden rounded-md border border-border/45 bg-muted/20">
							<img
								src={previewUrl}
								alt="Selected upload preview"
								className="h-28 w-full object-cover"
							/>
							<div className="flex items-center justify-between gap-2 p-2">
								<div className="min-w-0">
									<p className="truncate font-medium text-[12px]">
										{selectedFile.name}
									</p>
									<p className="text-[11px] text-muted-foreground">
										{formatBytes(selectedFile.size)}
									</p>
								</div>
								<Button
									type="button"
									size="xs"
									className="bg-emerald-500/85 text-black hover:bg-emerald-400"
									disabled={isBusy}
									onClick={handleGenerate}
								>
									<Sparkles data-icon="inline-start" />
									Generate
								</Button>
							</div>
						</section>
					) : null}

					{message ? (
						<StatusLine status={job?.status} message={message} />
					) : null}

					<section className="flex min-h-0 flex-1 flex-col gap-2">
						<div className="flex h-6 shrink-0 items-center justify-between">
							<h3 className="font-medium text-[11px] text-muted-foreground">
								Available Scenes
							</h3>
							<ChevronDown
								className="size-4 text-muted-foreground/70"
								aria-hidden="true"
							/>
						</div>

						<ScrollArea className="min-h-0 flex-1">
							<div className="flex flex-col gap-1 pr-1">
								{scenes.map((scene) => (
									<button
										key={scene.id}
										type="button"
										className={cn(
											"flex min-h-8 items-center gap-2 rounded-md px-2 py-1.5 text-left font-medium text-[12px] transition-colors",
											scene.id === activeSceneId
												? "bg-muted/60 text-foreground shadow-inner shadow-white/5"
												: "bg-muted/25 text-muted-foreground hover:bg-muted/40 hover:text-foreground",
										)}
										aria-current={
											scene.id === activeSceneId ? "true" : undefined
										}
										onClick={() => handleSceneClick(scene)}
									>
										<span
											className={cn(
												"size-1.5 shrink-0 rounded-full",
												scene.id === activeSceneId
													? "bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]"
													: "bg-muted-foreground/35",
											)}
										/>
										<span className="min-w-0 flex-1">
											<span className="block truncate">{scene.name}</span>
											{scene.optimizedBytes ? (
												<span className="block truncate font-normal text-[10px] text-muted-foreground">
													{formatBytes(scene.optimizedBytes)} ·{" "}
													{formatPercent(scene.ratio)} of PLY
												</span>
											) : null}
										</span>
										{scene.previewUrl ? (
											<ImageIcon className="size-3.5 text-muted-foreground/60" />
										) : null}
									</button>
								))}
							</div>
						</ScrollArea>
					</section>

					<Button
						type="button"
						variant="secondary"
						size="sm"
						className="h-8 w-full bg-muted/45 text-muted-foreground hover:bg-muted/65 hover:text-foreground"
						onClick={() => refreshScenes()}
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
					"pointer-events-auto fixed right-2 bottom-6 bg-card/85 text-muted-foreground shadow-xl shadow-black/35 backdrop-blur-md transition-[transform,color,background-color] duration-300 ease-out hover:bg-muted hover:text-foreground",
					isOpen ? "-translate-x-82" : "translate-x-0",
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

function StatusLine({ status, message }) {
	const isError = status === "error";
	const isDone = status === "done";
	const isRunning =
		status === "queued" || status === "running" || status === "optimizing";

	return (
		<div className="flex min-h-6 items-center gap-2 text-[11px] text-muted-foreground">
			{isError ? (
				<AlertCircle className="size-3.5 text-red-400" aria-hidden="true" />
			) : null}
			{isDone ? (
				<CheckCircle2
					className="size-3.5 text-emerald-400"
					aria-hidden="true"
				/>
			) : null}
			{isRunning ? (
				<LoaderCircle
					className="size-3.5 animate-spin text-amber-300"
					aria-hidden="true"
				/>
			) : null}
			<span>{message}</span>
		</div>
	);
}

async function fetchJob(id, signal) {
	const response = await fetch(`/api/jobs/${id}`, { signal });
	const payload = await response.json();
	if (!response.ok) {
		throw new Error(payload.error || "Could not read job status.");
	}
	return payload.job;
}

function statusMessage(job) {
	if (!job) return "";
	if (job.status === "error")
		return job.error || job.progress || "Generation failed";
	return job.progress || "";
}

function mergeScene(scenes, scene) {
	return [scene, ...scenes.filter((item) => item.id !== scene.id)];
}

function formatBytes(bytes) {
	if (!bytes) return "";
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatPercent(value) {
	if (!Number.isFinite(value)) return "";
	return `${Math.round(value * 100)}%`;
}
