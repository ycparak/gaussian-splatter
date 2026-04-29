import * as THREE from "three";
import WebGLContext from "../core/WebGLContext";
import { CameraRig } from "../utils/CameraRig";
import PlyLoader from "../utils/PlyLoader";
import { defaultScene } from "./availableScenes";

export default class Scene {
	constructor() {
		this.context = null;
		this.camera = null;
		this.cameraRig = null;
		this.width = 0;
		this.height = 0;
		this.aspectRatio = 0;
		this.scene = null;
		this.envMap = null;
		this.isDisposed = false;
		this.activeAssetId = null;
		this.#init();
	}

	async #init() {
		this.#setContext();
		this.#setupScene();
		this.#setupCamera();
		this.#setupCameraRig();
		await this.#addObjects();
	}

	#setContext() {
		this.context = WebGLContext.getInstance();
	}

	#setupScene() {
		this.scene = new THREE.Scene();
		this.scene.background = new THREE.Color(0x000000);
		this.scene.fog = new THREE.Fog(0x000000, 40.0, 45.0);
	}

	#setupCamera() {
		this.#calculateAspectRatio();
		this.camera = new THREE.PerspectiveCamera(45, this.aspectRatio, 0.01, 1000);
		this.camera.position.z = 3;
	}

	#setupCameraRig() {
		this.cameraRig = new CameraRig(this.camera, {
			xLimit: [-10.25, 10.25],
			yLimit: [-1.25, 0.25],
			target: new THREE.Vector3(0, 0, -5),
			damping: 2.0,
		});
	}

	async #addObjects() {
		this.loadAsset(defaultScene);
	}

	loadAsset(asset) {
		if (!asset?.url) return;
		if (asset.id === this.activeAssetId && this.plyLoader?.isReady) return;

		const onProgress = (progress) => {
			const pct = Math.round(progress * 100);
			const bar = document.getElementById("loader-bar");
			if (bar) bar.style.width = `${pct}%`;
		};
		const onError = (error) => {
			window.dispatchEvent(
				new CustomEvent("scene-load-error", {
					detail: { id: asset.id, message: error.message },
				}),
			);
		};

		if (this.plyLoader?.isReady) {
			const didStartTransition = this.plyLoader.transitionTo(asset.url, {
				duration: 1.45,
				onProgress,
				onLoad: () => {
					if (!this.isDisposed) this.activeAssetId = asset.id;
				},
				onError,
			});

			if (didStartTransition) return;
		}

		this.plyLoader?.dispose();
		this.plyLoader = new PlyLoader(asset.url, {
			renderer: this.context.renderer,
			size: 0.05,
			flowFieldInfluence: 0.5,
			flowFieldStrength: 1.2,
			flowFieldFrequency: 0.5,
			morphDuration: 1.45,
			onProgress,
			onLoad: (points) => this.#showLoadedPoints(points, asset),
			onError,
		});
	}

	#showLoadedPoints(points, asset) {
		if (this.isDisposed) return;

		points.rotation.x = Math.PI;
		this.scene.remove(...this.scene.children);
		this.scene.add(points);
		this.activeAssetId = asset.id;

		const loader = document.getElementById("loader");
		if (loader) {
			loader.style.opacity = "0";
			setTimeout(() => loader.remove(), 700);
		}
	}

	#calculateAspectRatio() {
		const { width, height } = this.context.getFullScreenDimensions();
		this.width = width;
		this.height = height;
		this.aspectRatio = this.width / this.height;
	}

	animate(delta, elapsed) {
		if (this.isDisposed) return;

		this.cameraRig?.update(delta);
		this.plyLoader?.update(delta, elapsed);
	}

	onResize(width, height) {
		if (this.isDisposed) return;

		this.width = width;
		this.height = height;
		this.aspectRatio = width / height;

		this.camera.aspect = this.aspectRatio;
		this.camera.updateProjectionMatrix();

		this.plyLoader?.onResize(width, height);
	}

	dispose() {
		this.isDisposed = true;
		this.cameraRig?.dispose();
		this.plyLoader?.dispose();
		this.scene?.clear();

		this.cameraRig = null;
		this.plyLoader = null;
		this.camera = null;
		this.scene = null;
		this.context = null;
	}
}
