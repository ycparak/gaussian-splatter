import * as THREE from "three";
import { GPUComputationRenderer } from "three/examples/jsm/misc/GPUComputationRenderer";
import gpgpuParticlesShader from "../shaders/gpgpu/particles.glsl";
import fragmentShader from "../shaders/particles.frag";
import vertexShader from "../shaders/particles.vert";

export default class PlyLoader {
	constructor(url, options = {}) {
		this.url = url;

		this.points = null;
		this.material = null;
		this.gpgpu = null;
		this.particlesVariable = null;
		this.gpgpuSize = 0;
		this.vertexCount = 0;
		this.positions = null;
		this.colors = null;
		this.baseTexture = null;
		this.targetTexture = null;
		this.isReady = false;
		this.morph = null;
		this.transitionAbortController = null;
		this.transitionId = 0;

		this.onLoad = options.onLoad ?? null;
		this.onProgress = options.onProgress ?? null;
		this.onError = options.onError ?? null;
		this.abortController = new AbortController();
		this.isDisposed = false;

		this.size = options.size ?? 0.07;
		this.flowFieldInfluence = options.flowFieldInfluence ?? 0.5;
		this.flowFieldStrength = options.flowFieldStrength ?? 2.0;
		this.flowFieldFrequency = options.flowFieldFrequency ?? 0.5;
		this.morphDuration = options.morphDuration ?? 1.45;
		this.renderer = options.renderer ?? null;

		this.#load();
	}

	#load() {
		this.#loadData(this.url, {
			signal: this.abortController.signal,
			onProgress: this.onProgress,
		})
			.then(({ positions, colors, vertexCount }) => {
				if (this.isDisposed) return;

				this.positions = positions;
				this.colors = colors;
				this.vertexCount = vertexCount;
				this.#setupGPGPU(positions, vertexCount);
				this.#setupParticles(positions, colors, vertexCount);
				this.isReady = true;
				this.onLoad?.(this.points);
			})
			.catch((error) => {
				if (this.isDisposed && error.name === "AbortError") return;
				console.error("PLY load error:", error);
				this.onError?.(error);
			});
	}

	transitionTo(url, options = {}) {
		if (this.isDisposed || !this.isReady) return false;

		this.transitionAbortController?.abort();
		this.transitionAbortController = new AbortController();
		const transitionId = ++this.transitionId;

		this.#loadData(url, {
			signal: this.transitionAbortController.signal,
			onProgress: options.onProgress,
		})
			.then((targetData) => {
				if (this.isDisposed || transitionId !== this.transitionId) return;

				this.#startMorph(targetData, {
					duration: options.duration ?? this.morphDuration,
					onLoad: options.onLoad,
					url,
				});
			})
			.catch((error) => {
				if (error.name === "AbortError") return;
				console.error("PLY transition error:", error);
				options.onError?.(error);
			});

		return true;
	}

	async #loadData(url, options = {}) {
		const response = await fetch(url, { signal: options.signal });
		if (!response.ok) throw new Error(`HTTP ${response.status}`);

		const buffer = await this.#readWithProgress(
			response,
			url,
			options.onProgress,
		);
		return this.#parse(buffer);
	}

	#parse(buffer) {
		if (this.#isPgs(buffer)) {
			return this.#parsePgs(buffer);
		}

		return this.#parsePly(buffer);
	}

	#parsePgs(buffer) {
		const dataView = new DataView(buffer);
		const version = dataView.getUint32(4, true);
		const vertexCount = dataView.getUint32(8, true);
		const colorMode = dataView.getUint8(12);

		if (version !== 1) {
			throw new Error(`Unsupported PGS version: ${version}`);
		}

		if (colorMode !== 1) {
			throw new Error(`Unsupported PGS color mode: ${colorMode}`);
		}

		const min = [
			dataView.getFloat32(16, true),
			dataView.getFloat32(20, true),
			dataView.getFloat32(24, true),
		];
		const max = [
			dataView.getFloat32(28, true),
			dataView.getFloat32(32, true),
			dataView.getFloat32(36, true),
		];

		const positions = new Float32Array(vertexCount * 3);
		const colors = new Float32Array(vertexCount * 3);
		let offset = 40;

		for (let i = 0; i < vertexCount; i++) {
			const i3 = i * 3;
			const qx = dataView.getUint16(offset, true);
			const qy = dataView.getUint16(offset + 2, true);
			const qz = dataView.getUint16(offset + 4, true);
			const rgb565 = dataView.getUint16(offset + 6, true);

			positions[i3] = this.#unquantize(qx, min[0], max[0]);
			positions[i3 + 1] = this.#unquantize(qy, min[1], max[1]);
			positions[i3 + 2] = this.#unquantize(qz, min[2], max[2]);

			colors[i3] = ((rgb565 >> 11) & 0x1f) / 31;
			colors[i3 + 1] = ((rgb565 >> 5) & 0x3f) / 63;
			colors[i3 + 2] = (rgb565 & 0x1f) / 31;

			offset += 8;
		}

		return { positions, colors, vertexCount };
	}

	#parsePly(buffer) {
		const headerEnd = this.#findHeaderEnd(buffer);
		const headerText = new TextDecoder().decode(
			new Uint8Array(buffer, 0, headerEnd),
		);
		const dataStart = headerEnd + "end_header\n".length;

		const { vertexCount, properties, stride } = this.#parseHeader(headerText);

		const dataView = new DataView(buffer, dataStart);

		const positions = new Float32Array(vertexCount * 3);
		const colors = new Float32Array(vertexCount * 3);

		const xOff = properties.get("x");
		const yOff = properties.get("y");
		const zOff = properties.get("z");
		const dc0Off = properties.get("f_dc_0");
		const dc1Off = properties.get("f_dc_1");
		const dc2Off = properties.get("f_dc_2");

		const hasSHColors =
			dc0Off !== undefined && dc1Off !== undefined && dc2Off !== undefined;
		const SH_C0 = 0.28209479177387814;

		for (let i = 0; i < vertexCount; i++) {
			const base = i * stride;

			positions[i * 3] = dataView.getFloat32(base + xOff, true);
			positions[i * 3 + 1] = dataView.getFloat32(base + yOff, true);
			positions[i * 3 + 2] = dataView.getFloat32(base + zOff, true);

			if (hasSHColors) {
				const r = dataView.getFloat32(base + dc0Off, true);
				const g = dataView.getFloat32(base + dc1Off, true);
				const b = dataView.getFloat32(base + dc2Off, true);

				colors[i * 3] = Math.max(0, Math.min(1, 0.5 + SH_C0 * r));
				colors[i * 3 + 1] = Math.max(0, Math.min(1, 0.5 + SH_C0 * g));
				colors[i * 3 + 2] = Math.max(0, Math.min(1, 0.5 + SH_C0 * b));
			} else {
				colors[i * 3] = 1.0;
				colors[i * 3 + 1] = 1.0;
				colors[i * 3 + 2] = 1.0;
			}
		}

		return { positions, colors, vertexCount };
	}

	#isPgs(buffer) {
		const bytes = new Uint8Array(buffer, 0, 4);
		return (
			bytes[0] === 0x50 &&
			bytes[1] === 0x47 &&
			bytes[2] === 0x53 &&
			bytes[3] === 0x31
		);
	}

	#unquantize(value, min, max) {
		if (max <= min) return min;
		return min + (value / 65535) * (max - min);
	}

	#setupGPGPU(positions, vertexCount) {
		// compute texture size (width x height >= vertexCount)
		const size = Math.ceil(Math.sqrt(vertexCount));
		this.gpgpuSize = size;

		this.gpgpu = new GPUComputationRenderer(size, size, this.renderer);

		this.baseTexture = this.#createPositionTexture(positions, vertexCount);
		this.targetTexture = this.baseTexture;
		const particlesTexture = this.#createPositionTexture(
			positions,
			vertexCount,
		);

		this.particlesVariable = this.gpgpu.addVariable(
			"uParticles",
			gpgpuParticlesShader,
			particlesTexture,
		);

		this.gpgpu.setVariableDependencies(this.particlesVariable, [
			this.particlesVariable,
		]);

		// uniforms
		this.particlesVariable.material.uniforms.uTime = { value: 0 };
		this.particlesVariable.material.uniforms.uDeltaTime = { value: 0 };
		this.particlesVariable.material.uniforms.uBase = {
			value: this.baseTexture,
		};
		this.particlesVariable.material.uniforms.uTarget = {
			value: this.targetTexture,
		};
		this.particlesVariable.material.uniforms.uMorphProgress = { value: 0 };
		this.particlesVariable.material.uniforms.uFlowFieldInfluence = {
			value: this.flowFieldInfluence,
		};
		this.particlesVariable.material.uniforms.uFlowFieldStrength = {
			value: this.flowFieldStrength,
		};
		this.particlesVariable.material.uniforms.uFlowFieldFrequency = {
			value: this.flowFieldFrequency,
		};

		this.gpgpu.init();
	}

	#setupParticles(_positions, colors, vertexCount) {
		const size = this.gpgpuSize;

		// UV coordinates to sample the GPGPU texture
		const particlesUv = new Float32Array(vertexCount * 2);
		const sizesArray = new Float32Array(vertexCount);

		for (let i = 0; i < vertexCount; i++) {
			const y = Math.floor(i / size);
			const x = i % size;

			particlesUv[i * 2 + 0] = (x + 0.5) / size;
			particlesUv[i * 2 + 1] = (y + 0.5) / size;

			sizesArray[i] = Math.random();
		}

		const geometry = new THREE.BufferGeometry();
		geometry.setDrawRange(0, vertexCount);
		geometry.setAttribute(
			"aParticlesUv",
			new THREE.BufferAttribute(particlesUv, 2),
		);
		geometry.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));
		geometry.setAttribute(
			"aTargetColor",
			new THREE.BufferAttribute(new Float32Array(colors), 3),
		);
		geometry.setAttribute("aSize", new THREE.BufferAttribute(sizesArray, 1));

		this.material = new THREE.ShaderMaterial({
			vertexShader,
			fragmentShader,
			uniforms: {
				...THREE.UniformsLib.fog,
				uSize: { value: this.size },
				uResolution: {
					value: new THREE.Vector2(
						window.innerWidth * window.devicePixelRatio,
						window.innerHeight * window.devicePixelRatio,
					),
				},
				uParticlesTexture: {
					value: this.gpgpu.getCurrentRenderTarget(this.particlesVariable)
						.texture,
				},
				uMorphProgress: { value: 0 },
			},
			transparent: true,
			depthWrite: true,
			side: THREE.DoubleSide,
			fog: true,
		});

		if (this.points) {
			const oldGeometry = this.points.geometry;
			const oldMaterial = this.points.material;
			this.points.geometry = geometry;
			this.points.material = this.material;
			oldGeometry?.dispose();
			oldMaterial?.dispose();
		} else {
			this.points = new THREE.Points(geometry, this.material);
		}

		this.points.frustumCulled = false;
	}

	update(delta, elapsed) {
		if (this.isDisposed) return;
		if (!this.gpgpu || !this.particlesVariable) return;

		this.particlesVariable.material.uniforms.uTime.value = elapsed;
		this.particlesVariable.material.uniforms.uDeltaTime.value = delta;

		this.#updateMorph(delta);

		this.gpgpu.compute();

		this.material.uniforms.uParticlesTexture.value =
			this.gpgpu.getCurrentRenderTarget(this.particlesVariable).texture;
	}

	onResize(width, height) {
		if (this.isDisposed) return;
		if (!this.material) return;
		this.material.uniforms.uResolution.value.set(
			width * window.devicePixelRatio,
			height * window.devicePixelRatio,
		);
	}

	dispose() {
		this.isDisposed = true;
		this.abortController.abort();
		this.transitionAbortController?.abort();
		this.points?.geometry?.dispose();
		this.material?.dispose();
		this.gpgpu?.dispose();
		this.baseTexture?.dispose();
		if (this.targetTexture !== this.baseTexture) this.targetTexture?.dispose();
	}

	async #readWithProgress(response, url, onProgress) {
		const body = response.body;
		const contentLength = parseInt(
			response.headers.get("Content-Length") || "0",
			10,
		);
		const isBrowserDecoded =
			response.headers.get("Content-Encoding")?.includes("gzip") ?? false;

		if (!contentLength || !onProgress) {
			const buffer = await new Response(body).arrayBuffer();
			return this.#maybeDecompress(buffer, url, isBrowserDecoded);
		}

		const reader = body.getReader();
		const chunks = [];
		let received = 0;

		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			chunks.push(value);
			received += value.length;
			onProgress(Math.min(received / contentLength, 1));
		}

		const result = new Uint8Array(received);
		let offset = 0;
		for (const chunk of chunks) {
			result.set(chunk, offset);
			offset += chunk.length;
		}
		return this.#maybeDecompress(result.buffer, url, isBrowserDecoded);
	}

	async #maybeDecompress(buffer, url, isBrowserDecoded) {
		if (!url.endsWith(".gz") || isBrowserDecoded) return buffer;
		if (!("DecompressionStream" in window)) {
			throw new Error("This browser does not support gzip decompression");
		}

		const stream = new Blob([buffer])
			.stream()
			.pipeThrough(new DecompressionStream("gzip"));
		return new Response(stream).arrayBuffer();
	}

	#createPositionTexture(positions, vertexCount) {
		const texture = this.gpgpu.createTexture();
		const particleCount = this.gpgpuSize * this.gpgpuSize;

		for (let i = 0; i < particleCount; i++) {
			const i3 = i * 3;
			const i4 = i * 4;

			if (i < vertexCount) {
				texture.image.data[i4 + 0] = positions[i3 + 0];
				texture.image.data[i4 + 1] = positions[i3 + 1];
				texture.image.data[i4 + 2] = positions[i3 + 2];
				texture.image.data[i4 + 3] = Math.random();
			}
		}

		return texture;
	}

	#startMorph(targetData, options) {
		const transitionVertexCount = Math.max(
			this.vertexCount,
			targetData.vertexCount,
		);

		if (transitionVertexCount !== this.vertexCount) {
			const sourceData = this.#resampleData(
				{
					positions: this.positions,
					colors: this.colors,
					vertexCount: this.vertexCount,
				},
				transitionVertexCount,
			);

			this.gpgpu?.dispose();
			this.baseTexture?.dispose();
			if (this.targetTexture !== this.baseTexture)
				this.targetTexture?.dispose();

			this.positions = sourceData.positions;
			this.colors = sourceData.colors;
			this.vertexCount = transitionVertexCount;
			this.#setupGPGPU(sourceData.positions, transitionVertexCount);
			this.#setupParticles(
				sourceData.positions,
				sourceData.colors,
				transitionVertexCount,
			);
		}

		const normalizedTarget = this.#resampleData(targetData, this.vertexCount);
		if (this.targetTexture !== this.baseTexture) this.targetTexture?.dispose();
		this.targetTexture = this.#createPositionTexture(
			normalizedTarget.positions,
			this.vertexCount,
		);

		this.particlesVariable.material.uniforms.uTarget.value = this.targetTexture;
		this.particlesVariable.material.uniforms.uMorphProgress.value = 0;
		this.material.uniforms.uMorphProgress.value = 0;
		this.#setTargetColors(normalizedTarget.colors);

		this.morph = {
			elapsed: 0,
			duration: Math.max(options.duration, 0.001),
			targetData: normalizedTarget,
			onLoad: options.onLoad,
			url: options.url,
		};
	}

	#updateMorph(delta) {
		if (!this.morph) return;

		this.morph.elapsed += delta;
		const progress = Math.min(this.morph.elapsed / this.morph.duration, 1);
		this.particlesVariable.material.uniforms.uMorphProgress.value = progress;
		this.material.uniforms.uMorphProgress.value = progress;

		if (progress >= 1) this.#finishMorph();
	}

	#finishMorph() {
		const morph = this.morph;
		this.morph = null;
		this.url = morph.url;
		this.positions = morph.targetData.positions;
		this.colors = morph.targetData.colors;
		this.vertexCount = morph.targetData.vertexCount;

		const previousBaseTexture = this.baseTexture;
		this.baseTexture = this.#createPositionTexture(
			this.positions,
			this.vertexCount,
		);
		if (this.targetTexture !== previousBaseTexture)
			this.targetTexture?.dispose();
		this.targetTexture = this.baseTexture;
		previousBaseTexture?.dispose();

		this.particlesVariable.material.uniforms.uBase.value = this.baseTexture;
		this.particlesVariable.material.uniforms.uTarget.value = this.targetTexture;
		this.particlesVariable.material.uniforms.uMorphProgress.value = 0;
		this.material.uniforms.uMorphProgress.value = 0;
		this.#setBaseColors(this.colors);
		this.#setTargetColors(this.colors);
		morph.onLoad?.(this.points);
	}

	#resampleData(data, vertexCount) {
		if (data.vertexCount === vertexCount) return data;

		const positions = new Float32Array(vertexCount * 3);
		const colors = new Float32Array(vertexCount * 3);

		for (let i = 0; i < vertexCount; i++) {
			const sourceIndex = Math.floor((i / vertexCount) * data.vertexCount);
			const sourceI3 = sourceIndex * 3;
			const i3 = i * 3;

			positions[i3 + 0] = data.positions[sourceI3 + 0];
			positions[i3 + 1] = data.positions[sourceI3 + 1];
			positions[i3 + 2] = data.positions[sourceI3 + 2];
			colors[i3 + 0] = data.colors[sourceI3 + 0];
			colors[i3 + 1] = data.colors[sourceI3 + 1];
			colors[i3 + 2] = data.colors[sourceI3 + 2];
		}

		return { positions, colors, vertexCount };
	}

	#setBaseColors(colors) {
		const colorAttribute = this.points.geometry.getAttribute("aColor");
		colorAttribute.array.set(colors);
		colorAttribute.needsUpdate = true;
	}

	#setTargetColors(colors) {
		const colorAttribute = this.points.geometry.getAttribute("aTargetColor");
		colorAttribute.array.set(colors);
		colorAttribute.needsUpdate = true;
	}

	#findHeaderEnd(buffer) {
		const bytes = new Uint8Array(buffer);
		const target = "end_header\n";
		for (let i = 0; i < Math.min(bytes.length, 4096); i++) {
			let match = true;
			for (let j = 0; j < target.length; j++) {
				if (bytes[i + j] !== target.charCodeAt(j)) {
					match = false;
					break;
				}
			}
			if (match) return i;
		}
		throw new Error("Could not find PLY header end");
	}

	#parseHeader(headerText) {
		const lines = headerText.split("\n");
		let vertexCount = 0;
		const properties = new Map();
		let offset = 0;
		let inVertexElement = false;

		const typeSizes = {
			float: 4,
			double: 8,
			int: 4,
			uint: 4,
			short: 2,
			ushort: 2,
			char: 1,
			uchar: 1,
		};

		for (const line of lines) {
			const parts = line.trim().split(/\s+/);

			if (parts[0] === "element") {
				if (parts[1] === "vertex") {
					vertexCount = parseInt(parts[2], 10);
					inVertexElement = true;
				} else {
					inVertexElement = false;
				}
			}

			if (parts[0] === "property" && inVertexElement) {
				const type = parts[1];
				const name = parts[2];
				const size = typeSizes[type] ?? 4;
				properties.set(name, offset);
				offset += size;
			}
		}

		return { vertexCount, properties, stride: offset };
	}
}
