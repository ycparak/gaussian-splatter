import * as THREE from "three";
import Scene from "../scenes/Scene";
import PostProcessing from "./PostProcessing";
import WebGLContext from "./WebGLContext";

class Three {
	constructor(container) {
		this.container = container;
		this.context = null;
		this.clock = new THREE.Clock();
		this.animationFrameId = null;
		this.isDisposed = false;
		this.resizeHandler = () => this.#onResize();
	}

	run() {
		this.context = WebGLContext.getInstance(this.container);
		this.context.init();
		this.scene = new Scene();
		this.postProcessing = new PostProcessing(
			this.context.renderer,
			this.scene.scene,
			this.scene.camera,
		);
		this.#animate();
		this.#addResizeListener();
	}

	loadScene(asset) {
		this.scene?.loadAsset(asset);
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
