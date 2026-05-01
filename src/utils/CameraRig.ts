import * as THREE from "three";
import type { CameraSettings } from "../../shared/types";

interface CameraRigOptions {
	target?: THREE.Vector3;
	xLimit?: [number, number];
	yLimit?: [number, number];
	damping?: number;
	z?: number;
	bobAmplitude?: number;
	bobSpeed?: number;
	rollAmplitude?: number;
}

interface PointerPosition {
	x: number;
	y: number;
}

export class CameraRig {
	readonly camera: THREE.Camera;
	readonly target: THREE.Vector3;
	xLimit: [number, number];
	yLimit: [number, number];
	damping: number;
	baseZ: number;
	bobAmplitude: number;
	bobSpeed: number;
	rollAmplitude: number;
	elapsed = 0;
	pointer: PointerPosition = { x: 0, y: 0 };
	readonly #handleMouseMove: (event: MouseEvent) => void;

	constructor(camera: THREE.Camera, options: CameraRigOptions = {}) {
		this.camera = camera;
		this.target = options.target ?? new THREE.Vector3(0, 0, 0);
		this.xLimit = options.xLimit ?? [-10, 10];
		this.yLimit = options.yLimit ?? [-10, 10];
		this.damping = options.damping ?? 2;
		this.baseZ = options.z ?? 3;
		this.bobAmplitude = options.bobAmplitude ?? 1;
		this.bobSpeed = options.bobSpeed ?? 0.5;
		this.rollAmplitude = options.rollAmplitude ?? 0.1;
		this.#handleMouseMove = (event) => {
			this.pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
			this.pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
		};

		window.addEventListener("mousemove", this.#handleMouseMove);
	}

	update(delta: number): void {
		const targetX = this.target.x + this.pointer.x * 2;
		const limitedX = Math.max(
			this.xLimit[0],
			Math.min(this.xLimit[1], targetX),
		);
		this.camera.position.x = THREE.MathUtils.damp(
			this.camera.position.x,
			limitedX,
			this.damping,
			delta,
		);

		const targetY = this.target.y + this.pointer.y * 10;
		const limitedY = Math.max(
			this.yLimit[0],
			Math.min(this.yLimit[1], targetY),
		);
		this.camera.position.y = THREE.MathUtils.damp(
			this.camera.position.y,
			limitedY,
			this.damping,
			delta,
		);

		this.elapsed += delta;
		this.camera.position.z =
			this.baseZ + Math.sin(this.elapsed * this.bobSpeed) * this.bobAmplitude;
		this.camera.lookAt(this.target);
		this.camera.rotation.z =
			Math.sin(this.elapsed * this.bobSpeed) * this.rollAmplitude;
	}

	applySettings(settings: CameraSettings): void {
		this.target.set(settings.targetX, settings.targetY, settings.targetZ);
		this.xLimit = [settings.xMin, settings.xMax];
		this.yLimit = [settings.yMin, settings.yMax];
		this.damping = settings.damping;
		this.baseZ = settings.z;
		this.bobAmplitude = settings.bobAmplitude;
		this.bobSpeed = settings.bobSpeed;
		this.rollAmplitude = settings.rollAmplitude;
	}

	dispose(): void {
		window.removeEventListener("mousemove", this.#handleMouseMove);
	}
}
