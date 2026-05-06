import * as THREE from "three";
import type {
	SceneLoadCallbacks,
	SceneSettings,
	SceneStats,
} from "@/shared/types";
import type { SceneAsset } from "@/src/engine/availableScenes";
import PostProcessing from "@/src/engine/PostProcessing";
import Scene from "@/src/engine/Scene";
import { DEFAULT_SCENE_SETTINGS } from "@/src/engine/sceneSettings";
import WebGLContext from "@/src/engine/WebGLContext";

interface ThreeOptions {
	settings?: SceneSettings;
	onStatsChange?: (stats: SceneStats) => void;
	sceneLoadCallbacks?: SceneLoadCallbacks;
}

interface RecordingOptions {
	fileName?: string;
	frameRate?: number;
}

export default class Three {
	readonly container: HTMLElement;
	context: WebGLContext | null = null;
	scene: Scene | null = null;
	postProcessing: PostProcessing | null = null;
	settings: SceneSettings;
	onStatsChange: ((stats: SceneStats) => void) | null;
	sceneLoadCallbacks: SceneLoadCallbacks;
	readonly clock = new THREE.Clock();
	animationFrameId: number | null = null;
	elapsedTime = 0;
	isPaused = false;
	isRecording = false;
	isDisposed = false;
	#mediaRecorder: MediaRecorder | null = null;
	#recordingChunks: Blob[] = [];
	#recordingFileName = "";
	#recordingMimeType = "";
	#recordingStream: MediaStream | null = null;
	#unsubscribeResize: (() => void) | null = null;

	constructor(container: HTMLElement, options: ThreeOptions = {}) {
		this.container = container;
		this.settings = options.settings ?? DEFAULT_SCENE_SETTINGS;
		this.onStatsChange = options.onStatsChange ?? null;
		this.sceneLoadCallbacks = options.sceneLoadCallbacks ?? {};
	}

	run(): void {
		this.context = WebGLContext.getInstance(this.container);
		this.context.init();
		this.context.applySettings(this.settings);

		this.scene = new Scene({
			settings: this.settings,
			onStatsChange: () => this.#emitStatsChange(),
			sceneLoadCallbacks: this.#createSceneLoadCallbacks(),
		});

		const renderer = this.context.renderer;
		if (!renderer) {
			throw new Error("WebGL renderer failed to initialize");
		}

		this.postProcessing = new PostProcessing(
			renderer,
			this.scene.scene,
			this.scene.camera,
		);
		this.postProcessing.applySettings(this.settings);
		this.#unsubscribeResize = this.context.subscribeResize(
			({ width, height }) => {
				this.scene?.onResize(width, height);
				this.postProcessing?.onResize(width, height);
			},
		);
		const { width, height } = this.context.fullScreenDimensions;
		this.scene.onResize(width, height);
		this.postProcessing.onResize(width, height);
		this.#animate();
	}

	loadScene(asset: SceneAsset): void {
		this.elapsedTime = 0;
		this.scene?.loadAsset(asset);
	}

	reloadScene(): void {
		this.elapsedTime = 0;
		this.scene?.reloadAsset();
		this.renderStillFrame();
	}

	setInfoVisible(isVisible: boolean): void {
		this.scene?.setInfoVisible(isVisible);
		if (this.isPaused) {
			this.renderStillFrame();
		}
	}

	setPaused(isPaused: boolean): void {
		if (this.isDisposed || this.isPaused === isPaused) return;

		this.isPaused = isPaused;

		if (isPaused) {
			if (this.animationFrameId !== null) {
				cancelAnimationFrame(this.animationFrameId);
				this.animationFrameId = null;
			}
			return;
		}

		this.clock.getDelta();
		this.#animate();
	}

	togglePaused(): boolean {
		this.setPaused(!this.isPaused);
		return this.isPaused;
	}

	renderStillFrame(): void {
		if (this.isDisposed || !this.scene || !this.postProcessing) return;

		this.scene.animate(0, this.elapsedTime);
		this.postProcessing.render();
	}

	async downloadSnapshot(
		fileName = this.#createSnapshotFileName(),
	): Promise<void> {
		const canvas = this.context?.canvas;
		if (!canvas) {
			throw new Error("WebGL canvas is not available");
		}

		this.renderStillFrame();
		const blob = await this.#canvasToPngBlob(canvas);
		this.#downloadBlob(blob, fileName);
	}

	startRecording(options: RecordingOptions = {}): void {
		if (this.isDisposed || this.isRecording) return;

		const canvas = this.context?.canvas;
		if (!canvas) {
			throw new Error("WebGL canvas is not available");
		}

		if (!("MediaRecorder" in window)) {
			throw new Error("Scene recording is not supported by this browser");
		}

		const mimeType = this.#getSupportedRecordingMimeType();
		if (!mimeType) {
			throw new Error("MP4 scene recording is not supported by this browser");
		}

		this.renderStillFrame();
		const stream = canvas.captureStream(options.frameRate ?? 60);
		const mediaRecorder = new MediaRecorder(stream, {
			mimeType,
			videoBitsPerSecond: 12_000_000,
		});

		this.#recordingChunks = [];
		this.#recordingFileName =
			options.fileName ?? this.#createCaptureFileName("mp4");
		this.#recordingMimeType = mimeType;
		this.#recordingStream = stream;
		this.#mediaRecorder = mediaRecorder;

		mediaRecorder.addEventListener("dataavailable", (event) => {
			if (event.data.size > 0) {
				this.#recordingChunks.push(event.data);
			}
		});
		mediaRecorder.addEventListener("stop", () => {
			const blob = new Blob(this.#recordingChunks, {
				type: this.#recordingMimeType,
			});
			this.#downloadBlob(blob, this.#recordingFileName);
			this.#clearRecordingState();
		});
		mediaRecorder.addEventListener("error", (event) => {
			console.error("Scene recording failed:", event);
			this.#clearRecordingState();
		});

		mediaRecorder.start(1000);
		this.isRecording = true;
	}

	stopRecording(): void {
		const mediaRecorder = this.#mediaRecorder;
		if (!mediaRecorder || mediaRecorder.state === "inactive") return;

		try {
			mediaRecorder.requestData();
		} catch {
			// Some browsers throw if data is already being flushed during stop.
		}
		mediaRecorder.stop();
	}

	applySettings(settings: SceneSettings = DEFAULT_SCENE_SETTINGS): void {
		this.settings = settings;
		this.context?.applySettings(settings);
		this.scene?.applySettings(settings);
		this.postProcessing?.applySettings(settings);

		if (this.context && this.scene && this.postProcessing) {
			const { width, height } = this.context.fullScreenDimensions;
			this.scene.onResize(width, height);
			this.postProcessing.onResize(width, height);
		}
	}

	getSceneStats(): SceneStats {
		return (
			this.scene?.getSceneStats() ?? { activeAssetId: null, particleCount: 0 }
		);
	}

	dispose(): void {
		this.isDisposed = true;

		if (this.animationFrameId !== null) {
			cancelAnimationFrame(this.animationFrameId);
			this.animationFrameId = null;
		}

		this.#discardRecording();
		this.#unsubscribeResize?.();
		this.#unsubscribeResize = null;
		this.scene?.dispose();
		this.postProcessing?.dispose();
		this.context?.dispose();
		this.scene = null;
		this.postProcessing = null;
		this.context = null;
	}

	#animate(): void {
		if (this.isDisposed || !this.scene || !this.postProcessing) return;
		if (this.isPaused) {
			this.animationFrameId = null;
			return;
		}

		const delta = this.clock.getDelta();
		this.elapsedTime += delta;
		this.scene.animate(delta, this.elapsedTime);
		this.postProcessing.render();
		this.animationFrameId = requestAnimationFrame(() => this.#animate());
	}

	#createSceneLoadCallbacks(): SceneLoadCallbacks {
		return {
			...this.sceneLoadCallbacks,
			onLoadSuccess: (asset, stats) => {
				this.sceneLoadCallbacks.onLoadSuccess?.(asset, stats);
				this.renderStillFrame();
			},
		};
	}

	#createSnapshotFileName(): string {
		return this.#createCaptureFileName("png");
	}

	#createCaptureFileName(extension: "mp4" | "png"): string {
		const sceneName = this.scene?.activeAsset?.name ?? "scene";
		const slug = sceneName
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-+|-+$/g, "");
		const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
		return `${slug || "scene"}-${timestamp}.${extension}`;
	}

	#canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
		return new Promise((resolve, reject) => {
			try {
				canvas.toBlob((blob) => {
					if (blob) {
						resolve(blob);
						return;
					}

					reject(new Error("PNG snapshot could not be created"));
				}, "image/png");
			} catch (error) {
				reject(error);
			}
		});
	}

	#downloadBlob(blob: Blob, fileName: string): void {
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = fileName;
		document.body.append(link);
		link.click();
		link.remove();
		window.setTimeout(() => URL.revokeObjectURL(url), 0);
	}

	#getSupportedRecordingMimeType(): string | null {
		const supportedMimeTypes = [
			"video/mp4;codecs=avc1.42E01E",
			"video/mp4;codecs=h264",
			"video/mp4",
		];

		return (
			supportedMimeTypes.find((mimeType) =>
				MediaRecorder.isTypeSupported(mimeType),
			) ?? null
		);
	}

	#discardRecording(): void {
		const mediaRecorder = this.#mediaRecorder;
		if (mediaRecorder && mediaRecorder.state !== "inactive") {
			mediaRecorder.stream.getTracks().forEach((track) => {
				track.stop();
			});
		}
		this.#clearRecordingState();
	}

	#clearRecordingState(): void {
		this.#recordingStream?.getTracks().forEach((track) => {
			track.stop();
		});
		this.#mediaRecorder = null;
		this.#recordingChunks = [];
		this.#recordingFileName = "";
		this.#recordingMimeType = "";
		this.#recordingStream = null;
		this.isRecording = false;
	}

	#emitStatsChange(): void {
		this.onStatsChange?.(this.getSceneStats());
	}
}
