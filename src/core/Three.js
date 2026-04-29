import * as THREE from "three";
import { DEFAULT_SCENE_SETTINGS } from "../config/sceneControls";
import Scene from "../scenes/Scene";
import PostProcessing from "./PostProcessing";
import WebGLContext from "./WebGLContext";

class Three {
	constructor(container, options = {}) {
		this.container = container;
		this.context = null;
		this.settings = options.settings ?? DEFAULT_SCENE_SETTINGS;
		this.onStatsChange = options.onStatsChange ?? null;
		this.clock = new THREE.Clock();
		this.animationFrameId = null;
		this.isDisposed = false;
		this.resizeHandler = () => this.#onResize();
	}

	run() {
		this.context = WebGLContext.getInstance(this.container);
		this.context.init();
		this.context.applySettings(this.settings);
		this.scene = new Scene({
			settings: this.settings,
			onStatsChange: () => this.#emitStatsChange(),
		});
		this.postProcessing = new PostProcessing(
			this.context.renderer,
			this.scene.scene,
			this.scene.camera,
		);
		this.postProcessing.applySettings(this.settings);
		this.#animate();
		this.#addResizeListener();
	}

	loadScene(asset) {
		this.scene?.loadAsset(asset);
	}

	applySettings(settings = DEFAULT_SCENE_SETTINGS) {
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

	getSceneStats() {
		return (
			this.scene?.getSceneStats() ?? { activeAssetId: null, particleCount: 0 }
		);
	}

	#animate() {
		if (this.isDisposed) return;

		const delta = this.clock.getDelta();
		const elapsed = this.clock.elapsedTime;

		this.scene.animate(delta, elapsed);
		this.#render();
		this.animationFrameId = requestAnimationFrame(() => this.#animate());
	}

	#render() {
		this.postProcessing.render();
	}

	#addResizeListener() {
		window.addEventListener("resize", this.resizeHandler);
	}

	#onResize() {
		const { width, height } = this.context.getFullScreenDimensions();
		this.context.onResize(width, height);
		this.scene.onResize(width, height);
		this.postProcessing.onResize(width, height);
	}

	#emitStatsChange() {
		this.onStatsChange?.(this.getSceneStats());
	}

	dispose() {
		this.isDisposed = true;

		if (this.animationFrameId !== null) {
			cancelAnimationFrame(this.animationFrameId);
			this.animationFrameId = null;
		}

		window.removeEventListener("resize", this.resizeHandler);

		this.scene?.dispose();
		this.postProcessing?.dispose();
		this.context?.dispose();

		this.scene = null;
		this.postProcessing = null;
		this.context = null;
	}
}

export default Three;
