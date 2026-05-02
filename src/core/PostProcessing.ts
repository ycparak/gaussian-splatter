import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import type { SceneSettings } from "@/shared/types";
import { DEFAULT_SCENE_SETTINGS } from "@/src/config/sceneControls";
import ColorAdjustPass from "@/src/utils/ColorAdjustPass";

type DisposablePass = {
	dispose?: () => void;
};

export default class PostProcessing {
	readonly composer: EffectComposer;
	readonly passes: DisposablePass[] = [];
	readonly bloomPass: UnrealBloomPass;
	readonly colorPass: ColorAdjustPass;

	constructor(
		renderer: THREE.WebGLRenderer,
		scene: THREE.Scene,
		camera: THREE.Camera,
	) {
		this.composer = new EffectComposer(renderer);

		const renderPass = new RenderPass(scene, camera);
		this.composer.addPass(renderPass);
		this.passes.push(renderPass);

		const drawingSize = renderer.getDrawingBufferSize(new THREE.Vector2());
		this.bloomPass = new UnrealBloomPass(drawingSize, 0.4, 0.1, 0.5);
		this.composer.addPass(this.bloomPass);
		this.passes.push(this.bloomPass);

		this.colorPass = new ColorAdjustPass();
		this.composer.addPass(this.colorPass);
		this.passes.push(this.colorPass as DisposablePass);

		const outputPass = new OutputPass();
		this.composer.addPass(outputPass);
		this.passes.push(outputPass);

		this.applySettings(DEFAULT_SCENE_SETTINGS);
	}

	render(): void {
		this.composer.render();
	}

	onResize(width: number, height: number): void {
		this.composer.setSize(width, height);
	}

	applySettings(settings: SceneSettings = DEFAULT_SCENE_SETTINGS): void {
		const bloom = settings.bloom ?? DEFAULT_SCENE_SETTINGS.bloom;
		this.bloomPass.enabled = bloom.enabled;
		this.bloomPass.strength = bloom.strength;
		this.bloomPass.radius = bloom.radius;
		this.bloomPass.threshold = bloom.threshold;
		this.colorPass.applySettings(
			settings.color ?? DEFAULT_SCENE_SETTINGS.color,
		);
	}

	dispose(): void {
		for (const pass of this.passes) {
			pass.dispose?.();
		}
		this.composer.dispose();
	}
}
