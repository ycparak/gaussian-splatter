import * as THREE from "three";
import type { SceneSettings } from "@/shared/types";
import { DEFAULT_SCENE_SETTINGS } from "@/src/engine/sceneSettings";

const TONE_MAPPING: Record<string, THREE.ToneMapping> = {
	none: THREE.NoToneMapping,
	linear: THREE.LinearToneMapping,
	reinhard: THREE.ReinhardToneMapping,
	aces: THREE.ACESFilmicToneMapping,
};

interface ViewportDimensions {
	width: number;
	height: number;
}

type ResizeListener = (dimensions: ViewportDimensions) => void;

export default class WebGLContext {
	static instance: WebGLContext | null = null;

	static getInstance(container?: HTMLElement | null): WebGLContext {
		if (!WebGLContext.instance) {
			WebGLContext.instance = new WebGLContext(container ?? null);
		} else if (container) {
			WebGLContext.instance.container = container;
			WebGLContext.instance.#attachCanvas();
		}

		return WebGLContext.instance;
	}

	container: HTMLElement | null;
	renderer: THREE.WebGLRenderer | null = null;
	canvas: HTMLCanvasElement | null = null;
	fullScreenDimensions: ViewportDimensions = { width: 0, height: 0 };
	pixelRatioCap = DEFAULT_SCENE_SETTINGS.renderer.pixelRatioCap;
	pixelRatio = Math.min(window.devicePixelRatio, this.pixelRatioCap);
	readonly #resizeListeners = new Set<ResizeListener>();
	#resizeObserver: ResizeObserver | null = null;
	readonly #handleWindowResize = () => {
		this.#handleViewportResize();
	};

	private constructor(container: HTMLElement | null) {
		this.container = container;
	}

	init(): void {
		if (!this.canvas) {
			this.#createCanvas();
		}

		if (!this.renderer && this.canvas) {
			this.#setUpRenderer();
		}

		this.#observeViewport();
		this.#handleViewportResize();
	}

	subscribeResize(listener: ResizeListener): () => void {
		this.#resizeListeners.add(listener);
		return () => {
			this.#resizeListeners.delete(listener);
		};
	}

	getFullScreenDimensions(): ViewportDimensions {
		if (this.container) {
			const width = Math.round(this.container.clientWidth);
			const height = Math.round(this.container.clientHeight);
			if (width > 0 && height > 0) {
				return { width, height };
			}
		}

		if (window.visualViewport) {
			return {
				width: Math.round(window.visualViewport.width),
				height: Math.round(window.visualViewport.height),
			};
		}

		return {
			width: window.innerWidth,
			height: window.innerHeight,
		};
	}

	applySettings(settings: SceneSettings = DEFAULT_SCENE_SETTINGS): void {
		const rendererSettings =
			settings.renderer ?? DEFAULT_SCENE_SETTINGS.renderer;
		this.pixelRatioCap = rendererSettings.pixelRatioCap;
		this.pixelRatio = Math.min(window.devicePixelRatio, this.pixelRatioCap);

		if (!this.renderer) return;

		this.renderer.setPixelRatio(this.pixelRatio);
		this.renderer.toneMapping =
			TONE_MAPPING[rendererSettings.toneMapping] ?? THREE.ACESFilmicToneMapping;
		this.renderer.toneMappingExposure = rendererSettings.exposure;
		this.#handleViewportResize();
	}

	dispose(): void {
		this.#resizeObserver?.disconnect();
		this.#resizeObserver = null;
		window.removeEventListener("resize", this.#handleWindowResize);
		window.visualViewport?.removeEventListener(
			"resize",
			this.#handleWindowResize,
		);
		this.#resizeListeners.clear();
		this.renderer?.dispose();
		this.renderer?.forceContextLoss();
		this.canvas?.remove();
		this.renderer = null;
		this.canvas = null;
		this.container = null;
		WebGLContext.instance = null;
	}

	#createCanvas(): void {
		this.canvas = document.createElement("canvas");
		this.canvas.style.position = "absolute";
		this.canvas.style.inset = "0";
		this.canvas.style.zIndex = "35";
		this.canvas.style.width = "100%";
		this.canvas.style.height = "100%";
		this.canvas.style.pointerEvents = "none";
		this.canvas.style.display = "block";
		this.#attachCanvas();
	}

	#attachCanvas(): void {
		if (!this.canvas) return;

		const parent = this.container ?? document.body;
		if (this.canvas.parentElement !== parent) {
			parent.appendChild(this.canvas);
		}
	}

	#setUpRenderer(): void {
		if (!this.canvas) return;

		this.renderer = new THREE.WebGLRenderer({
			canvas: this.canvas,
			antialias: DEFAULT_SCENE_SETTINGS.renderer.antialias,
			preserveDrawingBuffer: true,
		});
		this.renderer.shadowMap.enabled = false;
		this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
		this.renderer.toneMappingExposure = 1;
		this.renderer.outputColorSpace = THREE.SRGBColorSpace;
	}

	#observeViewport(): void {
		this.#resizeObserver?.disconnect();
		this.#resizeObserver = null;

		if (this.container) {
			this.#resizeObserver = new ResizeObserver(() => {
				this.#handleViewportResize();
			});
			this.#resizeObserver.observe(this.container);
		}

		window.removeEventListener("resize", this.#handleWindowResize);
		window.addEventListener("resize", this.#handleWindowResize);
		window.visualViewport?.removeEventListener(
			"resize",
			this.#handleWindowResize,
		);
		window.visualViewport?.addEventListener("resize", this.#handleWindowResize);
	}

	#handleViewportResize(): void {
		if (!this.renderer) return;

		const nextDimensions = this.getFullScreenDimensions();
		if (nextDimensions.width <= 0 || nextDimensions.height <= 0) return;

		this.fullScreenDimensions = nextDimensions;
		this.pixelRatio = Math.min(window.devicePixelRatio, this.pixelRatioCap);
		this.renderer.setPixelRatio(this.pixelRatio);
		this.renderer.setSize(nextDimensions.width, nextDimensions.height, false);

		for (const listener of this.#resizeListeners) {
			listener(nextDimensions);
		}
	}
}
