import * as THREE from "three";

class WebGLContext {
	static getInstance(container) {
		if (!WebGLContext.instance) {
			WebGLContext.instance = new WebGLContext(container);
		} else if (container) {
			WebGLContext.instance.container = container;
		}

		return WebGLContext.instance;
	}

	constructor(container) {
		this.container = container;
		this.renderer = null;
		this.canvas = null;
		this.fullScreenDimensions = { width: 0, height: 0 };
		this.pixelRatio = Math.min(window.devicePixelRatio, 2.0);
	}

	async init() {
		this.#createCanvas();
		this.#setUpRenderer();
	}

	#setUpRenderer() {
		this.renderer = new THREE.WebGLRenderer({
			canvas: this.canvas,
			antialias: false,
		});

		this.fullScreenDimensions = this.getFullScreenDimensions();

		this.renderer.setSize(
			this.fullScreenDimensions.width,
			this.fullScreenDimensions.height,
		);
		this.renderer.setPixelRatio(this.pixelRatio);

		this.renderer.shadowMap.enabled = false;
		this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
		this.renderer.toneMappingExposure = 1.0;
		this.renderer.outputColorSpace = THREE.SRGBColorSpace;
	}

	getFullScreenDimensions() {
		const tempElement = document.createElement("div");
		tempElement.style.height = "100lvh";
		tempElement.style.width = "100lvw";
		tempElement.style.position = "absolute";
		tempElement.style.visibility = "hidden";
		document.body.appendChild(tempElement);

		const width = tempElement.offsetWidth;
		const height = tempElement.offsetHeight;

		document.body.removeChild(tempElement);

		return { width, height };
	}

	#createCanvas() {
		this.canvas = document.createElement("canvas");
		this.canvas.style.position = "fixed";
		this.canvas.style.left = 0;
		this.canvas.style.top = 0;
		this.canvas.style.zIndex = 35;
		this.canvas.style.pointerEvents = "none";

		document.body.appendChild(this.canvas);

		return this.canvas;
	}

	onResize(width, height) {
		this.pixelRatio = Math.min(window.devicePixelRatio, 2);
		this.renderer.setSize(width, height);
		this.renderer.setPixelRatio(this.pixelRatio);
	}

	dispose() {
		this.renderer?.dispose();
		this.renderer?.forceContextLoss();
		this.canvas?.remove();

		this.renderer = null;
		this.canvas = null;
		this.container = null;
		WebGLContext.instance = null;
	}
}

export default WebGLContext;
