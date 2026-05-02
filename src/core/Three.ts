import * as THREE from "three";
import type {
	SceneLoadCallbacks,
	SceneSettings,
	SceneStats,
} from "@/shared/types";
import { DEFAULT_SCENE_SETTINGS } from "@/src/config/sceneControls";
import PostProcessing from "@/src/core/PostProcessing";
import WebGLContext from "@/src/core/WebGLContext";
import type { SceneAsset } from "@/src/scenes/availableScenes";
import Scene from "@/src/scenes/Scene";

interface ThreeOptions {
	settings?: SceneSettings;
	onStatsChange?: (stats: SceneStats) => void;
	sceneLoadCallbacks?: SceneLoadCallbacks;
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
	isDisposed = false;
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
		const sceneName = this.scene?.activeAsset?.name ?? "scene";
		const slug = sceneName
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-+|-+$/g, "");
		const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
		return `${slug || "scene"}-${timestamp}.png`;
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

	#emitStatsChange(): void {
		this.onStatsChange?.(this.getSceneStats());
	}
}
