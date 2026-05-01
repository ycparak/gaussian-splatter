import * as THREE from "three";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import {
	type GLTF,
	GLTFLoader,
} from "three/examples/jsm/loaders/GLTFLoader.js";

interface ImportGltfOptions {
	onLoad?: (model: THREE.Group<THREE.Object3DEventMap>, gltf: GLTF) => void;
	onProgress?: (progress: number) => void;
	onError?: (error: ErrorEvent | Error) => void;
}

export default class ImportGltf {
	readonly url: string;
	gltf: GLTF | null = null;
	model: THREE.Group<THREE.Object3DEventMap> | null = null;
	readonly onLoad: ImportGltfOptions["onLoad"];
	readonly onProgress: ImportGltfOptions["onProgress"];
	readonly onError: ImportGltfOptions["onError"];
	readonly loader: GLTFLoader;
	readonly dracoLoader: DRACOLoader;

	constructor(url: string, options: ImportGltfOptions = {}) {
		this.url = url;
		this.onLoad = options.onLoad;
		this.onProgress = options.onProgress;
		this.onError = options.onError;
		this.loader = new GLTFLoader();
		this.dracoLoader = new DRACOLoader();
		this.dracoLoader.setDecoderPath(
			"https://www.gstatic.com/draco/v1/decoders/",
		);
		this.loader.setDRACOLoader(this.dracoLoader);
		this.#load();
	}

	addTo(scene: THREE.Scene): void {
		if (!this.model) return;
		scene.add(this.model);
	}

	setPosition(x = 0, y = 0, z = 0): void {
		this.model?.position.set(x, y, z);
	}

	setScale(x = 1, y = 1, z = 1): void {
		this.model?.scale.set(x, y, z);
	}

	dispose(): void {
		if (!this.model) {
			this.dracoLoader.dispose();
			return;
		}

		this.model.traverse((child) => {
			if (!(child instanceof THREE.Mesh)) return;
			child.geometry.dispose();
			if (Array.isArray(child.material)) {
				for (const material of child.material) {
					material.dispose();
				}
			} else {
				child.material.dispose();
			}
		});

		this.dracoLoader.dispose();
	}

	#load(): void {
		this.loader.load(
			this.url,
			(gltf: GLTF) => {
				this.gltf = gltf;
				this.model = gltf.scene;
				this.model?.traverse((child) => {
					if (child instanceof THREE.Mesh) {
						child.castShadow = true;
						child.receiveShadow = true;
					}
				});
				if (this.model) {
					this.onLoad?.(this.model, gltf);
				}
			},
			(event: ProgressEvent<EventTarget>) => {
				if (!event.total) return;
				this.onProgress?.(event.loaded / event.total);
			},
			(error: unknown) => {
				console.error("GLTF load error:", error);
				this.onError?.(
					error instanceof ErrorEvent || error instanceof Error
						? error
						: new Error(String(error)),
				);
			},
		);
	}
}
