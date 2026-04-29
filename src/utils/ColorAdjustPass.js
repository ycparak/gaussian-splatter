import * as THREE from "three";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass";
import fragmentShader from "../shaders/colorPass.frag";
import vertexShader from "../shaders/colorPass.vert";

const ColorAdjustShader = {
	uniforms: {
		tDiffuse: { value: null },
		uBrightness: { value: 0.0 },
		uContrast: { value: 1.0 },
		uSaturation: { value: 1.0 },
		uTintColor: { value: new THREE.Color("#ffffff") },
		uTintStrength: { value: 0.0 },
	},
	vertexShader,
	fragmentShader,
};

export default class ColorAdjustPass extends ShaderPass {
	constructor({
		brightness = 0.0,
		contrast = 1.0,
		saturation = 1.0,
		tintColor = "#ffffff",
		tintStrength = 0.0,
	} = {}) {
		super(ColorAdjustShader);
		this.applySettings({
			brightness,
			contrast,
			saturation,
			tintColor,
			tintStrength,
		});
	}

	applySettings({
		brightness = 0.0,
		contrast = 1.0,
		saturation = 1.0,
		tintColor = "#ffffff",
		tintStrength = 0.0,
	} = {}) {
		this.uniforms.uBrightness.value = brightness;
		this.uniforms.uContrast.value = Math.max(contrast, 0.01);
		this.uniforms.uSaturation.value = saturation;
		this.uniforms.uTintColor.value.set(tintColor);
		this.uniforms.uTintStrength.value = tintStrength;
	}
}
