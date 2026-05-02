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
			sceneLoadCallbacks: this.sceneLoadCallbacks,
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
		this.scene?.loadAsset(asset);
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

		const delta = this.clock.getDelta();
		const elapsed = this.clock.elapsedTime;
		this.scene.animate(delta, elapsed);
		this.postProcessing.render();
		this.animationFrameId = requestAnimationFrame(() => this.#animate());
	}

	#emitStatsChange(): void {
		this.onStatsChange?.(this.getSceneStats());
	}
}
