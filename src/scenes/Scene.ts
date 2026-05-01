import * as THREE from "three";
import type {
	SceneLoadCallbacks,
	SceneSettings,
	SceneStats,
} from "../../shared/types";
import { DEFAULT_SCENE_SETTINGS } from "../config/sceneControls";
import WebGLContext from "../core/WebGLContext";
import { CameraRig } from "../utils/CameraRig";
import PlyLoader from "../utils/PlyLoader";
import type { SceneAsset } from "./availableScenes";
import { defaultScene } from "./availableScenes";

interface SceneOptions {
	settings?: SceneSettings;
	onStatsChange?: (stats: SceneStats) => void;
	sceneLoadCallbacks?: SceneLoadCallbacks;
}

export default class Scene {
	context: WebGLContext;
	camera: THREE.PerspectiveCamera;
	cameraRig: CameraRig;
	scene: THREE.Scene;
	width = 0;
	height = 0;
	aspectRatio = 1;
	isDisposed = false;
	activeAssetId: string | null = null;
	settings: SceneSettings;
	onStatsChange: ((stats: SceneStats) => void) | null;
	sceneLoadCallbacks: SceneLoadCallbacks;
	plyLoader: PlyLoader | null = null;

	constructor(options: SceneOptions = {}) {
		this.settings = options.settings ?? DEFAULT_SCENE_SETTINGS;
		this.onStatsChange = options.onStatsChange ?? null;
		this.sceneLoadCallbacks = options.sceneLoadCallbacks ?? {};
		this.context = WebGLContext.getInstance();
		this.scene = this.#createScene();
		this.camera = this.#createCamera();
		this.cameraRig = this.#createCameraRig();

		if (defaultScene) {
			this.loadAsset(defaultScene);
		}
	}

	loadAsset(asset: SceneAsset | null): void {
		if (!asset?.url || this.isDisposed) return;
		if (asset.id === this.activeAssetId && this.plyLoader?.isReady) return;

		this.sceneLoadCallbacks.onLoadStart?.(asset);
		const onProgress = (progress: number) => {
			this.sceneLoadCallbacks.onLoadProgress?.(asset, progress);
		};
		const onError = (error: Error) => {
			this.sceneLoadCallbacks.onLoadError?.(asset, error);
		};

		if (this.plyLoader?.isReady) {
			const didStartTransition = this.plyLoader.transitionTo(asset.url, {
				duration: this.settings.particles.morphDuration,
				onProgress,
				onLoad: () => this.#handleAssetReady(asset),
				onError,
			});

			if (didStartTransition) return;
		}

		this.plyLoader?.dispose();
		const renderer = this.context.renderer;
		if (!renderer) {
			throw new Error("WebGL renderer is not available");
		}

		this.plyLoader = new PlyLoader(asset.url, {
			renderer,
			settings: this.settings,
			onProgress,
			onLoad: (points) => this.#showLoadedPoints(points, asset),
			onError,
		});
	}

	animate(delta: number, elapsed: number): void {
		if (this.isDisposed) return;
		this.cameraRig.update(delta);
		this.plyLoader?.update(delta, elapsed);
	}

	onResize(width: number, height: number): void {
		if (this.isDisposed) return;

		this.width = width;
		this.height = height;
		this.aspectRatio = width / height;
		this.camera.aspect = this.aspectRatio;
		this.camera.updateProjectionMatrix();
		this.plyLoader?.onResize(width, height);
	}

	applySettings(settings: SceneSettings = DEFAULT_SCENE_SETTINGS): void {
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
		this.cameraRig.applySettings(settings.camera);

		if (this.plyLoader?.points) {
			this.#applyPointTransforms(this.plyLoader.points);
		}

		this.plyLoader?.applySettings(settings);
	}

	getSceneStats(): SceneStats {
		return {
			activeAssetId: this.activeAssetId,
			particleCount: this.plyLoader?.vertexCount ?? 0,
		};
	}

	dispose(): void {
		this.isDisposed = true;
		this.cameraRig.dispose();
		this.plyLoader?.dispose();
		this.scene.clear();
		this.plyLoader = null;
	}

	#createScene(): THREE.Scene {
		const scene = new THREE.Scene();
		scene.background = new THREE.Color(this.settings.scene.background);
		scene.fog = this.settings.scene.fogEnabled
			? new THREE.Fog(
					this.settings.scene.fogColor,
					this.settings.scene.fogNear,
					this.settings.scene.fogFar,
				)
			: null;
		return scene;
	}

	#createCamera(): THREE.PerspectiveCamera {
		const { width, height } = this.context.getFullScreenDimensions();
		this.width = width;
		this.height = height;
		this.aspectRatio = width / height;

		const camera = new THREE.PerspectiveCamera(
			this.settings.camera.fov,
			this.aspectRatio,
			0.01,
			1000,
		);
		camera.position.z = this.settings.camera.z;
		return camera;
	}

	#createCameraRig(): CameraRig {
		return new CameraRig(this.camera, {
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

	#showLoadedPoints(
		points: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>,
		asset: SceneAsset,
	): void {
		if (this.isDisposed) return;

		this.#applyPointTransforms(points);
		this.scene.remove(...this.scene.children);
		this.scene.add(points);
		this.#handleAssetReady(asset);
	}

	#handleAssetReady(asset: SceneAsset): void {
		if (this.isDisposed) return;

		this.activeAssetId = asset.id;
		this.plyLoader?.applySettings(this.settings);
		const stats = this.getSceneStats();
		this.onStatsChange?.(stats);
		this.sceneLoadCallbacks.onLoadSuccess?.(asset, stats);
	}

	#applyPointTransforms(
		points: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>,
	): void {
		points.rotation.x = this.settings.scene.pointRotationX;
		points.scale.setScalar(this.settings.scene.scale);
	}
}
