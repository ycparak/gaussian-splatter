"use client";

import { AnimatePresence, m } from "motion/react";
import {
  type ChangeEvent,
  type DragEvent,
  type RefObject,
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { abortableWait } from "@/shared/abortableWait";
import { mergeGeneratedScene } from "@/shared/generatedScenes";
import type {
  GeneratedScene,
  GenerationJob,
  GenerationJobStatus,
  SceneAsset,
} from "@/shared/types";
import { ChevronRightIcon } from "@/src/components/icons/chevron-right";
import { RandomIcon } from "@/src/components/icons/random";
import Button from "@/src/components/ui/button";
import ScrollArea from "@/src/components/ui/scroll-area";
import { bundledScenes } from "@/src/engine/availableScenes";
import {
  createGenerationJob,
  FINAL_JOB_STATUSES,
  fetchGeneratedScenes,
  fetchGenerationJob,
  resolveCompletedScene,
  statusMessage,
} from "@/src/generatedSceneApi";
import { cn } from "@/src/lib/utils";

const bundledPlyPercentById: Record<string, 11 | 12 | 13> = {
  chapel: 12,
  colosseum: 11,
  columns: 13,
  modern: 12,
  nousresearch: 11,
  "temple-neptune": 13,
  tokyo: 12,
  window: 11,
};

interface ImagePanelProps {
  activeSceneId: string | null;
  enableUploads: boolean;
  sceneErrorMessage: string | null;
  onSceneSelect: (scene: SceneAsset) => void;
}

export default function ImagePanel({
  activeSceneId,
  enableUploads,
  sceneErrorMessage,
  onSceneSelect,
}: ImagePanelProps) {
  const buttonRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const jobPollControllerRef = useRef<AbortController | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [generatedScenes, setGeneratedScenes] = useState<GeneratedScene[]>([]);
  const [job, setJob] = useState<GenerationJob | null>(null);
  const [message, setMessage] = useState("");
  const scenes = useMemo(
    () =>
      enableUploads ? [...bundledScenes, ...generatedScenes] : bundledScenes,
    [enableUploads, generatedScenes],
  );
  const isBusy =
    job?.status === "queued" ||
    job?.status === "running" ||
    job?.status === "optimizing";

  const refreshScenes = useCallback(
    async (options: { silent?: boolean } = {}) => {
      if (!enableUploads) return;

      try {
        const scenes = await fetchGeneratedScenes();
        startTransition(() => setGeneratedScenes(scenes));
        if (!options.silent) setMessage("Image list refreshed.");
      } catch (error) {
        if (!options.silent) {
          setMessage(error instanceof Error ? error.message : String(error));
        }
      }
    },
    [enableUploads],
  );

  useEffect(() => {
    if (!enableUploads) return;

    void refreshScenes({ silent: true });

    return () => {
      jobPollControllerRef.current?.abort();
    };
  }, [enableUploads, refreshScenes]);

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (buttonRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;

      setIsOpen(false);
    }

    window.addEventListener("pointerdown", handlePointerDown, true);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown, true);
    };
  }, [isOpen]);

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

  useEffect(() => {
    if (enableUploads) return;

    jobPollControllerRef.current?.abort();
    jobPollControllerRef.current = null;
    setSelectedFile(null);
    setPreviewUrl("");
    setJob(null);
    setMessage("");
    setIsDragging(false);
  }, [enableUploads]);

  function handlePickFile(file: File | null) {
    if (!enableUploads) return;
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

  function handleFileInputChange(event: ChangeEvent<HTMLInputElement>) {
    handlePickFile(event.target.files?.[0] ?? null);
    event.target.value = "";
  }

  async function handleGenerate() {
    if (!enableUploads) return;
    if (!selectedFile || isBusy) return;

    const formData = new FormData();
    formData.append("image", selectedFile);
    let controller: AbortController | null = null;

    try {
      setMessage("Uploading image...");
      jobPollControllerRef.current?.abort();
      controller = new AbortController();
      jobPollControllerRef.current = controller;

      const nextJob = await createGenerationJob(formData, controller.signal);
      setJob(nextJob);
      setMessage(statusMessage(nextJob));
      await followGenerationJob(nextJob, controller.signal);
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
      nextJob = await fetchGenerationJob(nextJob.id, signal);
      setJob(nextJob);
      setMessage(statusMessage(nextJob));
    }

    if (nextJob.status !== "done") return;

    const scene = await resolveCompletedScene(nextJob, signal);
    if (!scene) {
      throw new Error("Generation completed but no image scene was returned.");
    }

    startTransition(() => {
      setGeneratedScenes((currentScenes) =>
        mergeGeneratedScene(currentScenes, scene),
      );
    });
    onSceneSelect(scene);
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-9 text-[12px] tracking-normal">
      <AnimatePresence>
        {isOpen ? (
          <m.aside
            ref={panelRef}
            key="images-panel"
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
            style={{ borderRadius: "10px", transformOrigin: "right bottom" }}
            className="pointer-events-auto fixed right-5 bottom-17 flex max-h-[calc(100dvh-88px)] w-[min(320px,calc(100vw-40px))] flex-col gap-1"
          >
            {enableUploads ? (
              <UploadDropzone
                fileInputRef={fileInputRef}
                isDragging={isDragging}
                previewUrl={previewUrl}
                selectedFile={selectedFile}
                isBusy={isBusy}
                onInputChange={handleFileInputChange}
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
            ) : null}

            {enableUploads && (message || sceneErrorMessage) ? (
              <StatusLine
                status={sceneErrorMessage ? "error" : (job?.status ?? "idle")}
                message={sceneErrorMessage ?? message}
              />
            ) : null}

            <SceneList
              scenes={scenes}
              activeSceneId={activeSceneId}
              onSceneSelect={onSceneSelect}
            />
          </m.aside>
        ) : null}
      </AnimatePresence>

      <div
        ref={buttonRef}
        className="pointer-events-auto fixed right-5 bottom-5"
      >
        <Button
          type="button"
          aria-label={isOpen ? "Hide images panel" : "Show images panel"}
          aria-expanded={isOpen}
          icon={
            <ChevronRightIcon
              className={cn(
                "size-4 transition-transform duration-150",
                isOpen && "-rotate-90",
              )}
            />
          }
          onClick={() => setIsOpen((value) => !value)}
          className={cn(
            "h-9 gap-1.5 pr-4 pl-2 text-neutral-400 shadow-xl shadow-black/25 hover:text-neutral-300",
            isOpen && "bg-neutral-800/65 text-neutral-300",
          )}
        >
          Images
        </Button>
      </div>
    </div>
  );
}

function UploadDropzone({
  fileInputRef,
  isDragging,
  previewUrl,
  selectedFile,
  isBusy,
  onInputChange,
  onPickClick,
  onDragEnter,
  onDragOver,
  onDragLeave,
  onDrop,
  onGenerate,
}: {
  fileInputRef: RefObject<HTMLInputElement | null>;
  isDragging: boolean;
  previewUrl: string;
  selectedFile: File | null;
  isBusy: boolean;
  onInputChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onPickClick: () => void;
  onDragEnter: (event: DragEvent<HTMLButtonElement>) => void;
  onDragOver: (event: DragEvent<HTMLButtonElement>) => void;
  onDragLeave: (event: DragEvent<HTMLButtonElement>) => void;
  onDrop: (event: DragEvent<HTMLButtonElement>) => void;
  onGenerate: () => void;
}) {
  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onInputChange}
      />

      <button
        type="button"
        className={cn(
          "relative flex h-32 shrink-0 flex-col items-center justify-center gap-2 overflow-hidden rounded-lg bg-neutral-800/50 text-neutral-400 backdrop-blur-[10px] transition-colors hover:bg-neutral-800/60 hover:text-neutral-300",
          isDragging &&
            "bg-cyan-400/10 text-neutral-200 ring-1 ring-cyan-300/70",
        )}
        aria-label="Upload image"
        onClick={onPickClick}
        onDragEnter={onDragEnter}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        {previewUrl ? (
          <img
            src={previewUrl}
            alt=""
            className="absolute inset-0 size-full object-cover opacity-45"
          />
        ) : null}
        <span className="relative max-w-56 truncate text-xs leading-3 font-semibold">
          {selectedFile ? selectedFile.name : "Drop image or click to browse"}
        </span>
      </button>

      {selectedFile ? (
        <Button
          type="button"
          className="h-9 w-full text-neutral-300"
          disabled={isBusy}
          icon={
            isBusy ? (
              <span className="size-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
            ) : (
              <RandomIcon />
            )
          }
          onClick={onGenerate}
        >
          {isBusy ? "Generating" : "Generate image scene"}
        </Button>
      ) : null}
    </>
  );
}

function StatusLine({
  status,
  message,
}: {
  status: GenerationJobStatus | "idle";
  message: string;
}) {
  const isError = status === "error";
  const isRunning =
    status === "queued" || status === "running" || status === "optimizing";

  return (
    <div
      className={cn(
        "flex min-h-8 items-center gap-2 rounded-lg bg-neutral-800/50 px-3 text-[11px] leading-4 text-neutral-400",
        isError && "text-red-300",
      )}
    >
      {isRunning ? (
        <span
          className="size-3.5 rounded-full border-2 border-current border-t-transparent animate-spin"
          aria-hidden="true"
        />
      ) : null}
      <span className="min-w-0 truncate">{message}</span>
    </div>
  );
}

function SceneList({
  scenes,
  activeSceneId,
  onSceneSelect,
}: {
  scenes: SceneAsset[];
  activeSceneId: string | null;
  onSceneSelect: (scene: SceneAsset) => void;
}) {
  return (
    <ScrollArea className="max-h-52 pr-0">
      {scenes.length === 0 ? (
        <div className="rounded-lg bg-neutral-800/50 px-3 py-2 text-[11px] text-neutral-400">
          No images are available yet.
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {scenes.map((scene) => (
            <SceneListItem
              key={scene.id}
              scene={scene}
              isActive={scene.id === activeSceneId}
              onSceneSelect={onSceneSelect}
            />
          ))}
        </div>
      )}
    </ScrollArea>
  );
}

function SceneListItem({
  scene,
  isActive,
  onSceneSelect,
}: {
  scene: SceneAsset;
  isActive: boolean;
  onSceneSelect: (scene: SceneAsset) => void;
}) {
  const bundledPercent =
    scene.source === "bundled" ? bundledPlyPercentById[scene.id] : null;

  return (
    <button
      type="button"
      aria-current={isActive ? "true" : undefined}
      className={cn(
        "flex h-9 items-center gap-2 rounded-lg bg-neutral-800/50 px-3 text-left text-xs leading-3 font-semibold text-neutral-400 backdrop-blur-[10px] transition-colors hover:bg-neutral-800/65 hover:text-neutral-300",
        isActive && "text-neutral-300",
      )}
      onClick={() => onSceneSelect(scene)}
    >
      <span
        className={cn(
          "size-1.5 shrink-0 rounded-full bg-neutral-600",
          isActive && "bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]",
        )}
      />
      <span className="min-w-0 flex-1 truncate">{scene.name}</span>
      {bundledPercent ? (
        <span className="shrink-0 text-[11px] text-neutral-400">
          {bundledPercent}% of ply
        </span>
      ) : null}
    </button>
  );
}
