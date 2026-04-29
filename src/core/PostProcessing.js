import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass";
import { DEFAULT_SCENE_SETTINGS } from "../config/sceneControls";
import ColorAdjustPass from "../utils/ColorAdjustPass";

export default class PostProcessing {
	constructor(renderer, scene, camera) {
		this.composer = new EffectComposer(renderer);
		this.passes = [];

		const renderPass = new RenderPass(scene, camera);
		this.composer.addPass(renderPass);
		this.passes.push(renderPass);

		const { width, height } = renderer.getSize(new THREE.Vector2());

		this.bloomPass = new UnrealBloomPass(new THREE.Vector2(width, height));
		this.composer.addPass(this.bloomPass);
		this.passes.push(this.bloomPass);

		this.colorPass = new ColorAdjustPass();
		this.composer.addPass(this.colorPass);
		this.passes.push(this.colorPass);

		const outputPass = new OutputPass();
		this.composer.addPass(outputPass);
		this.passes.push(outputPass);

		this.applySettings(DEFAULT_SCENE_SETTINGS);
	}

	render() {
		this.composer.render();
	}

	onResize(width, height) {
		this.composer.setSize(width, height);
	}

	applySettings(settings = DEFAULT_SCENE_SETTINGS) {
		const bloom = settings.bloom ?? DEFAULT_SCENE_SETTINGS.bloom;
		this.bloomPass.enabled = bloom.enabled;
		this.bloomPass.strength = bloom.strength;
		this.bloomPass.radius = bloom.radius;
		this.bloomPass.threshold = bloom.threshold;

		this.colorPass.applySettings(
			settings.color ?? DEFAULT_SCENE_SETTINGS.color,
		);
	}

	dispose() {
		for (const pass of this.passes) {
			pass.dispose?.();
		}
		this.composer.dispose?.();
		this.passes = [];
	}
}
