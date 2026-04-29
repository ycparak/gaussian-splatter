import * as THREE from "three";
import Scene from "../scenes/Scene";
import PostProcessing from "./PostProcessing";
import WebGLContext from "./WebGLContext";

class Three {
	constructor(container) {
		this.container = container;
		this.context = null;
		this.clock = new THREE.Clock();
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

	#animate() {
		const delta = this.clock.getDelta();
		const elapsed = this.clock.elapsedTime;

		this.scene.animate(delta, elapsed);
		this.#render();
		requestAnimationFrame(() => this.#animate());
	}

	#render() {
		this.postProcessing.render();
	}

	#addResizeListener() {
		window.addEventListener("resize", () => this.#onResize());
	}

	#onResize() {
		const { width, height } = this.context.getFullScreenDimensions();
		this.context.onResize(width, height);
		this.scene.onResize(width, height);
		this.postProcessing.onResize(width, height);
	}
}

export default Three;
