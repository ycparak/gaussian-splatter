import * as THREE from "three";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import type { ColorSettings } from "@/shared/types";
import fragmentShader from "@/src/shaders/colorPass.frag";
import vertexShader from "@/src/shaders/colorPass.vert";

const ColorAdjustShader = {
	uniforms: {
		tDiffuse: { value: null },
		uBrightness: { value: 0 },
		uContrast: { value: 1 },
		uSaturation: { value: 1 },
		uTintColor: { value: new THREE.Color("#ffffff") },
		uTintStrength: { value: 0 },
	},
	vertexShader,
	fragmentShader,
};

export default class ColorAdjustPass extends ShaderPass {
	constructor(settings: Partial<ColorSettings> = {}) {
		super(ColorAdjustShader);
		this.applySettings(settings);
	}

	applySettings({
		brightness = 0,
		contrast = 1,
		saturation = 1,
		tintColor = "#ffffff",
		tintStrength = 0,
	}: Partial<ColorSettings> = {}): void {
		const uniforms = this.uniforms as typeof ColorAdjustShader.uniforms;
		uniforms.uBrightness.value = brightness;
		uniforms.uContrast.value = Math.max(contrast, 0.01);
		uniforms.uSaturation.value = saturation;
		uniforms.uTintColor.value.set(tintColor);
		uniforms.uTintStrength.value = tintStrength;
	}
}
