import * as THREE from "three";
import { DEFAULT_SCENE_SETTINGS } from "../config/sceneControls";
import WebGLContext from "../core/WebGLContext";
import { CameraRig } from "../utils/CameraRig";
import PlyLoader from "../utils/PlyLoader";
import { defaultScene } from "./availableScenes";

export default class Scene {
	constructor(options = {}) {
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
		this.settings = options.settings ?? DEFAULT_SCENE_SETTINGS;
		this.onStatsChange = options.onStatsChange ?? null;
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
		this.scene.background = new THREE.Color(this.settings.scene.background);
		this.scene.fog = this.settings.scene.fogEnabled
			? new THREE.Fog(
					this.settings.scene.fogColor,
					this.settings.scene.fogNear,
					this.settings.scene.fogFar,
				)
			: null;
	}

	#setupCamera() {
		this.#calculateAspectRatio();
		this.camera = new THREE.PerspectiveCamera(
			this.settings.camera.fov,
			this.aspectRatio,
			0.01,
			1000,
		);
		this.camera.position.z = this.settings.camera.z;
	}

	#setupCameraRig() {
		this.cameraRig = new CameraRig(this.camera, {
			xLimit: [this.settings.camera.xMin, this.settings.camera.xMax],
			yLimit: [this.settings.camera.yMin, this.settings.camera.yMax],
			target: new THREE.Vector3(
				this.settings.camera.targetX,
				this.settings.camera.targetY,
				this.settings.camera.targetZ,
			),
			damping: this.settings.camera.damping,
			z: this.settings.camera.z,
			bobAmplitude: this.settings.camera.bobAmplitude,
			bobSpeed: this.settings.camera.bobSpeed,
			rollAmplitude: this.settings.camera.rollAmplitude,
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
				duration: this.settings.particles.morphDuration,
				onProgress,
				onLoad: () => {
					if (this.isDisposed) return;
					this.activeAssetId = asset.id;
					this.applySettings(this.settings);
					this.#notifyStatsChange();
				},
				onError,
			});

			if (didStartTransition) return;
		}

		this.plyLoader?.dispose();
		this.plyLoader = new PlyLoader(asset.url, {
			renderer: this.context.renderer,
			settings: this.settings,
			onProgress,
			onLoad: (points) => this.#showLoadedPoints(points, asset),
			onError,
		});
	}

	#showLoadedPoints(points, asset) {
		if (this.isDisposed) return;

		points.rotation.x = this.settings.scene.pointRotationX;
		points.scale.setScalar(this.settings.scene.scale);
		this.scene.remove(...this.scene.children);
		this.scene.add(points);
		this.activeAssetId = asset.id;
		this.plyLoader?.applySettings(this.settings);
		this.#notifyStatsChange();

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

	applySettings(settings = DEFAULT_SCENE_SETTINGS) {
		if (this.isDisposed) return;

		this.settings = settings;
		this.scene.background = new THREE.Color(settings.scene.background);
		this.scene.fog = settings.scene.fogEnabled
			? new THREE.Fog(
					settings.scene.fogColor,
					settings.scene.fogNear,
					settings.scene.fogFar,
				)
			: null;

		this.camera.fov = settings.camera.fov;
		this.camera.updateProjectionMatrix();
		this.cameraRig?.applySettings(settings.camera);

		if (this.plyLoader?.points) {
			this.plyLoader.points.rotation.x = settings.scene.pointRotationX;
			this.plyLoader.points.scale.setScalar(settings.scene.scale);
		}
		this.plyLoader?.applySettings(settings);
	}

	getSceneStats() {
		return {
			activeAssetId: this.activeAssetId,
			particleCount: this.plyLoader?.vertexCount ?? 0,
		};
	}

	#notifyStatsChange() {
		this.onStatsChange?.(this.getSceneStats());
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
