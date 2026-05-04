import * as THREE from "three";
import { GPUComputationRenderer } from "three/examples/jsm/misc/GPUComputationRenderer.js";
import {
	PGS_COLOR_RGB565,
	PGS_HEADER_BYTES,
	PGS_MAGIC,
	PGS_VERSION,
	PLY_TYPE_SIZES,
	SH_C0,
} from "@/shared/pgs";
import type { ParsedPointAsset, SceneSettings } from "@/shared/types";
import { DEFAULT_SCENE_SETTINGS } from "@/src/config/sceneControls";
import gpgpuParticlesShader from "@/src/shaders/gpgpu/particles.glsl";
import fragmentShader from "@/src/shaders/particles.frag";
import vertexShader from "@/src/shaders/particles.vert";

type PointsMesh = THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;
type GpuVariable = ReturnType<GPUComputationRenderer["addVariable"]>;
type GpuTexture = ReturnType<GPUComputationRenderer["createTexture"]>;

interface TransitionOptions {
	duration?: number;
	onProgress?: (progress: number) => void;
	onLoad?: (points: PointsMesh) => void;
	onError?: (error: Error) => void;
}

interface PlyLoaderOptions {
	renderer: THREE.WebGLRenderer;
	settings?: SceneSettings;
	onLoad?: (points: PointsMesh) => void;
	onProgress?: (progress: number) => void;
	onError?: (error: Error) => void;
	size?: number;
	flowFieldInfluence?: number;
	flowFieldStrength?: number;
	flowFieldFrequency?: number;
	morphDuration?: number;
}

interface MorphState {
	elapsed: number;
	duration: number;
	targetData: ParsedPointAsset;
	onLoad?: (points: PointsMesh) => void;
	url: string;
}

interface ParsedHeader {
	vertexCount: number;
	properties: Map<string, number>;
	stride: number;
}

type SimulationUniforms = Record<
	| "uTime"
	| "uDeltaTime"
	| "uBase"
	| "uTarget"
	| "uMorphProgress"
	| "uFlowFieldInfluence"
	| "uFlowFieldStrength"
	| "uFlowFieldFrequency"
	| "uTimeScale"
	| "uDecayRate"
	| "uReturnForce"
	| "uInfoProgress",
	{ value: unknown }
>;

type RenderUniforms = Record<never, never> & {
	uSize: { value: number };
	uResolution: { value: THREE.Vector2 };
	uParticlesTexture: { value: THREE.Texture };
	uMorphProgress: { value: number };
	uLightDirection: { value: THREE.Vector3 };
	uAmbientLight: { value: number };
	uDiffuseLight: { value: number };
	uSpecularLight: { value: number };
	uShininess: { value: number };
	uInfoProgress: { value: number };
};

const INFO_TRANSITION_DURATION_SECONDS = 2.3;

export default class PlyLoader {
	url: string;
	points: PointsMesh | null = null;
	material: THREE.ShaderMaterial | null = null;
	gpgpu: GPUComputationRenderer | null = null;
	particlesVariable: GpuVariable | null = null;
	gpgpuSize = 0;
	vertexCount = 0;
	positions: Float32Array | null = null;
	colors: Float32Array | null = null;
	baseTexture: GpuTexture | null = null;
	targetTexture: GpuTexture | null = null;
	isReady = false;
	morph: MorphState | null = null;
	transitionAbortController: AbortController | null = null;
	transitionId = 0;
	onLoad: ((points: PointsMesh) => void) | null;
	onProgress: ((progress: number) => void) | null;
	onError: ((error: Error) => void) | null;
	readonly abortController = new AbortController();
	isDisposed = false;
	size: number;
	flowFieldInfluence: number;
	flowFieldStrength: number;
	flowFieldFrequency: number;
	timeScale: number;
	decayRate: number;
	returnForce: number;
	morphDuration: number;
	infoProgress = 0;
	infoTargetProgress = 0;
	lighting: SceneSettings["lighting"];
	readonly renderer: THREE.WebGLRenderer;

	constructor(url: string, options: PlyLoaderOptions) {
		this.url = url;
		this.onLoad = options.onLoad ?? null;
		this.onProgress = options.onProgress ?? null;
		this.onError = options.onError ?? null;
		const particleSettings =
			options.settings?.particles ?? DEFAULT_SCENE_SETTINGS.particles;
		const lightingSettings =
			options.settings?.lighting ?? DEFAULT_SCENE_SETTINGS.lighting;
		this.size = options.size ?? particleSettings.size;
		this.flowFieldInfluence =
			options.flowFieldInfluence ?? particleSettings.flowFieldInfluence;
		this.flowFieldStrength =
			options.flowFieldStrength ?? particleSettings.flowFieldStrength;
		this.flowFieldFrequency =
			options.flowFieldFrequency ?? particleSettings.flowFieldFrequency;
		this.timeScale = particleSettings.timeScale;
		this.decayRate = particleSettings.decayRate;
		this.returnForce = particleSettings.returnForce;
		this.morphDuration =
			options.morphDuration ?? particleSettings.morphDuration;
		this.lighting = { ...lightingSettings };
		this.renderer = options.renderer;
		this.#load();
	}

	transitionTo(url: string, options: TransitionOptions = {}): boolean {
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
			.catch((error: unknown) => {
				if (error instanceof Error && error.name === "AbortError") return;
				const normalizedError =
					error instanceof Error ? error : new Error(String(error));
				console.error("PLY transition error:", normalizedError);
				options.onError?.(normalizedError);
			});

		return true;
	}

	setInfoVisible(isVisible: boolean): void {
		this.infoTargetProgress = isVisible ? 1 : 0;
	}

	update(delta: number, elapsed: number): void {
		if (
			this.isDisposed ||
			!this.gpgpu ||
			!this.particlesVariable ||
			!this.material
		) {
			return;
		}

		const uniforms = this.#getSimulationUniforms();
		uniforms.uTime.value = elapsed;
		uniforms.uDeltaTime.value = delta;
		this.#updateMorph(delta);
		this.#updateInfoProgress(delta);
		this.gpgpu.compute();
		this.#getRenderUniforms().uParticlesTexture.value =
			this.gpgpu.getCurrentRenderTarget(this.particlesVariable).texture;
	}

	onResize(width: number, height: number): void {
		if (this.isDisposed || !this.material) return;
		this.#getRenderUniforms().uResolution.value.set(
			width * this.#getPixelRatio(),
			height * this.#getPixelRatio(),
		);
	}

	applySettings(settings: SceneSettings = DEFAULT_SCENE_SETTINGS): void {
		const particles = settings.particles ?? DEFAULT_SCENE_SETTINGS.particles;
		const lighting = settings.lighting ?? DEFAULT_SCENE_SETTINGS.lighting;
		this.size = particles.size;
		this.flowFieldInfluence = particles.flowFieldInfluence;
		this.flowFieldStrength = particles.flowFieldStrength;
		this.flowFieldFrequency = particles.flowFieldFrequency;
		this.timeScale = particles.timeScale;
		this.decayRate = particles.decayRate;
		this.returnForce = particles.returnForce;
		this.morphDuration = particles.morphDuration;
		this.lighting = { ...lighting };

		if (this.material) {
			const uniforms = this.#getRenderUniforms();
			uniforms.uSize.value = this.size;
			uniforms.uLightDirection.value.set(
				lighting.directionX,
				lighting.directionY,
				lighting.directionZ,
			);
			uniforms.uAmbientLight.value = lighting.ambient;
			uniforms.uDiffuseLight.value = lighting.diffuse;
			uniforms.uSpecularLight.value = lighting.specular;
			uniforms.uShininess.value = lighting.shininess;
		}

		if (this.particlesVariable) {
			const uniforms = this.#getSimulationUniforms();
			uniforms.uFlowFieldInfluence.value = this.flowFieldInfluence;
			uniforms.uFlowFieldStrength.value = this.flowFieldStrength;
			uniforms.uFlowFieldFrequency.value = this.flowFieldFrequency;
			uniforms.uTimeScale.value = this.timeScale;
			uniforms.uDecayRate.value = this.decayRate;
			uniforms.uReturnForce.value = this.returnForce;
		}
	}

	dispose(): void {
		this.isDisposed = true;
		this.abortController.abort();
		this.transitionAbortController?.abort();
		this.points?.geometry.dispose();
		this.material?.dispose();
		this.gpgpu?.dispose();
		this.baseTexture?.dispose();
		if (this.targetTexture && this.targetTexture !== this.baseTexture) {
			this.targetTexture.dispose();
		}
	}

	#load(): void {
		this.#loadData(this.url, {
			signal: this.abortController.signal,
			onProgress: this.onProgress ?? undefined,
		})
			.then(({ positions, colors, vertexCount }) => {
				if (this.isDisposed) return;

				this.positions = positions;
				this.colors = colors;
				this.vertexCount = vertexCount;
				this.#setupGPGPU(positions, vertexCount);
				this.#setupParticles(colors, vertexCount);
				this.isReady = true;
				if (this.points) {
					this.onLoad?.(this.points);
				}
			})
			.catch((error: unknown) => {
				if (
					this.isDisposed &&
					error instanceof Error &&
					error.name === "AbortError"
				) {
					return;
				}

				const normalizedError =
					error instanceof Error ? error : new Error(String(error));
				console.error("PLY load error:", normalizedError);
				this.onError?.(normalizedError);
			});
	}

	async #loadData(
		url: string,
		options: {
			signal?: AbortSignal;
			onProgress?: (progress: number) => void;
		} = {},
	): Promise<ParsedPointAsset> {
		const response = await fetch(url, { signal: options.signal });
		if (!response.ok) throw new Error(`HTTP ${response.status}`);
		const buffer = await this.#readWithProgress(
			response,
			url,
			options.onProgress,
		);
		return this.#parse(buffer);
	}

	#parse(buffer: ArrayBuffer): ParsedPointAsset {
		return this.#isPgs(buffer)
			? this.#parsePgs(buffer)
			: this.#parsePly(buffer);
	}

	#parsePgs(buffer: ArrayBuffer): ParsedPointAsset {
		const dataView = new DataView(buffer);
		const magic = new TextDecoder().decode(new Uint8Array(buffer, 0, 4));
		const version = dataView.getUint32(4, true);
		const vertexCount = dataView.getUint32(8, true);
		const colorMode = dataView.getUint8(12);

		if (magic !== PGS_MAGIC) {
			throw new Error("Unsupported PGS magic header");
		}

		if (version !== PGS_VERSION) {
			throw new Error(`Unsupported PGS version: ${version}`);
		}

		if (colorMode !== PGS_COLOR_RGB565) {
			throw new Error(`Unsupported PGS color mode: ${colorMode}`);
		}

		const min = [
			dataView.getFloat32(16, true),
			dataView.getFloat32(20, true),
			dataView.getFloat32(24, true),
		] as const;
		const max = [
			dataView.getFloat32(28, true),
			dataView.getFloat32(32, true),
			dataView.getFloat32(36, true),
		] as const;

		const positions = new Float32Array(vertexCount * 3);
		const colors = new Float32Array(vertexCount * 3);
		let offset = PGS_HEADER_BYTES;

		for (let index = 0; index < vertexCount; index++) {
			const i3 = index * 3;
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

	#parsePly(buffer: ArrayBuffer): ParsedPointAsset {
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

		if (xOff === undefined || yOff === undefined || zOff === undefined) {
			throw new Error("PLY header is missing required position properties");
		}

		for (let index = 0; index < vertexCount; index++) {
			const base = index * stride;
			const i3 = index * 3;
			positions[i3] = dataView.getFloat32(base + xOff, true);
			positions[i3 + 1] = dataView.getFloat32(base + yOff, true);
			positions[i3 + 2] = dataView.getFloat32(base + zOff, true);

			if (
				hasSHColors &&
				dc0Off !== undefined &&
				dc1Off !== undefined &&
				dc2Off !== undefined
			) {
				const r = dataView.getFloat32(base + dc0Off, true);
				const g = dataView.getFloat32(base + dc1Off, true);
				const b = dataView.getFloat32(base + dc2Off, true);
				colors[i3] = Math.max(0, Math.min(1, 0.5 + SH_C0 * r));
				colors[i3 + 1] = Math.max(0, Math.min(1, 0.5 + SH_C0 * g));
				colors[i3 + 2] = Math.max(0, Math.min(1, 0.5 + SH_C0 * b));
			} else {
				colors[i3] = 1;
				colors[i3 + 1] = 1;
				colors[i3 + 2] = 1;
			}
		}

		return { positions, colors, vertexCount };
	}

	#isPgs(buffer: ArrayBuffer): boolean {
		const bytes = new Uint8Array(buffer, 0, 4);
		return (
			bytes[0] === 0x50 &&
			bytes[1] === 0x47 &&
			bytes[2] === 0x53 &&
			bytes[3] === 0x31
		);
	}

	#unquantize(value: number, min: number, max: number): number {
		if (max <= min) return min;
		return min + (value / 65535) * (max - min);
	}

	#setupGPGPU(positions: Float32Array, vertexCount: number): void {
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

		const uniforms = this.#getSimulationUniforms();
		uniforms.uTime = { value: 0 };
		uniforms.uDeltaTime = { value: 0 };
		uniforms.uBase = { value: this.baseTexture };
		uniforms.uTarget = { value: this.targetTexture };
		uniforms.uMorphProgress = { value: 0 };
		uniforms.uFlowFieldInfluence = { value: this.flowFieldInfluence };
		uniforms.uFlowFieldStrength = { value: this.flowFieldStrength };
		uniforms.uFlowFieldFrequency = { value: this.flowFieldFrequency };
		uniforms.uTimeScale = { value: this.timeScale };
		uniforms.uDecayRate = { value: this.decayRate };
		uniforms.uReturnForce = { value: this.returnForce };
		uniforms.uInfoProgress = { value: this.infoProgress };

		const initError = this.gpgpu.init();
		if (initError) {
			throw new Error(initError);
		}
	}

	#setupParticles(colors: Float32Array, vertexCount: number): void {
		if (!this.gpgpu || !this.particlesVariable) {
			throw new Error("GPGPU state is not initialized");
		}

		const size = this.gpgpuSize;
		const particlesUv = new Float32Array(vertexCount * 2);
		const sizesArray = new Float32Array(vertexCount);

		for (let index = 0; index < vertexCount; index++) {
			const y = Math.floor(index / size);
			const x = index % size;
			particlesUv[index * 2] = (x + 0.5) / size;
			particlesUv[index * 2 + 1] = (y + 0.5) / size;
			sizesArray[index] = Math.random();
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

		const drawingSize = this.renderer.getDrawingBufferSize(new THREE.Vector2());
		this.material = new THREE.ShaderMaterial({
			vertexShader,
			fragmentShader,
			uniforms: {
				...THREE.UniformsLib.fog,
				uSize: { value: this.size },
				uResolution: { value: drawingSize },
				uParticlesTexture: {
					value: this.gpgpu.getCurrentRenderTarget(this.particlesVariable)
						.texture,
				},
				uMorphProgress: { value: 0 },
				uLightDirection: {
					value: new THREE.Vector3(
						this.lighting.directionX,
						this.lighting.directionY,
						this.lighting.directionZ,
					),
				},
				uAmbientLight: { value: this.lighting.ambient },
				uDiffuseLight: { value: this.lighting.diffuse },
				uSpecularLight: { value: this.lighting.specular },
				uShininess: { value: this.lighting.shininess },
				uInfoProgress: { value: this.infoProgress },
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
			oldGeometry.dispose();
			oldMaterial.dispose();
		} else {
			this.points = new THREE.Points(geometry, this.material);
		}

		this.points.frustumCulled = false;
	}

	async #readWithProgress(
		response: Response,
		url: string,
		onProgress?: (progress: number) => void,
	): Promise<ArrayBuffer> {
		const body = response.body;
		if (!body) {
			return response.arrayBuffer();
		}

		const contentLength = Number.parseInt(
			response.headers.get("Content-Length") ?? "0",
			10,
		);
		const isBrowserDecoded =
			response.headers.get("Content-Encoding")?.includes("gzip") ?? false;

		if (!contentLength || !onProgress) {
			const buffer = await new Response(body).arrayBuffer();
			return this.#maybeDecompress(buffer, url, isBrowserDecoded);
		}

		const reader = body.getReader();
		const chunks: Uint8Array[] = [];
		let received = 0;

		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			if (!value) continue;
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

	async #maybeDecompress(
		buffer: ArrayBuffer,
		url: string,
		isBrowserDecoded: boolean,
	): Promise<ArrayBuffer> {
		if (!url.endsWith(".gz") || isBrowserDecoded) return buffer;
		if (!("DecompressionStream" in window)) {
			throw new Error("This browser does not support gzip decompression");
		}

		const stream = new Blob([buffer])
			.stream()
			.pipeThrough(new DecompressionStream("gzip"));
		return new Response(stream).arrayBuffer();
	}

	#createPositionTexture(
		positions: Float32Array,
		vertexCount: number,
	): GpuTexture {
		if (!this.gpgpu) {
			throw new Error("GPGPU state is not initialized");
		}

		const texture = this.gpgpu.createTexture();
		const textureData = texture.image.data as Float32Array | null;
		if (!textureData) {
			throw new Error("GPGPU texture data is not available");
		}
		const particleCount = this.gpgpuSize * this.gpgpuSize;

		for (let index = 0; index < particleCount; index++) {
			const i3 = index * 3;
			const i4 = index * 4;

			if (index < vertexCount) {
				textureData[i4] = positions[i3] ?? 0;
				textureData[i4 + 1] = positions[i3 + 1] ?? 0;
				textureData[i4 + 2] = positions[i3 + 2] ?? 0;
				textureData[i4 + 3] = Math.random();
			}
		}

		return texture;
	}

	#startMorph(
		targetData: ParsedPointAsset,
		options: {
			duration: number;
			onLoad?: (points: PointsMesh) => void;
			url: string;
		},
	): void {
		const transitionVertexCount = Math.max(
			this.vertexCount,
			targetData.vertexCount,
		);

		if (transitionVertexCount !== this.vertexCount) {
			if (!this.positions || !this.colors) {
				throw new Error("Source points are not available for morph");
			}

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
			if (this.targetTexture && this.targetTexture !== this.baseTexture) {
				this.targetTexture.dispose();
			}

			this.positions = sourceData.positions;
			this.colors = sourceData.colors;
			this.vertexCount = transitionVertexCount;
			this.#setupGPGPU(sourceData.positions, transitionVertexCount);
			this.#setupParticles(sourceData.colors, transitionVertexCount);
		}

		const normalizedTarget = this.#resampleData(targetData, this.vertexCount);
		if (this.targetTexture && this.targetTexture !== this.baseTexture) {
			this.targetTexture.dispose();
		}

		this.targetTexture = this.#createPositionTexture(
			normalizedTarget.positions,
			this.vertexCount,
		);

		if (!this.particlesVariable || !this.material) {
			throw new Error("Morph target cannot be applied before materials exist");
		}

		const simulationUniforms = this.#getSimulationUniforms();
		const renderUniforms = this.#getRenderUniforms();
		simulationUniforms.uTarget.value = this.targetTexture;
		simulationUniforms.uMorphProgress.value = 0;
		renderUniforms.uMorphProgress.value = 0;
		this.#setTargetColors(normalizedTarget.colors);
		this.morph = {
			elapsed: 0,
			duration: Math.max(options.duration, 0.001),
			targetData: normalizedTarget,
			onLoad: options.onLoad,
			url: options.url,
		};
	}

	#updateMorph(delta: number): void {
		if (!this.morph || !this.particlesVariable || !this.material) return;

		this.morph.elapsed += delta;
		const progress = Math.min(this.morph.elapsed / this.morph.duration, 1);
		const simulationUniforms = this.#getSimulationUniforms();
		const renderUniforms = this.#getRenderUniforms();
		simulationUniforms.uMorphProgress.value = progress;
		renderUniforms.uMorphProgress.value = progress;

		if (progress >= 1) {
			this.#finishMorph();
		}
	}

	#updateInfoProgress(delta: number): void {
		if (!this.particlesVariable || !this.material) return;

		const step = delta / INFO_TRANSITION_DURATION_SECONDS;
		if (this.infoTargetProgress > this.infoProgress) {
			this.infoProgress = Math.min(
				this.infoProgress + step,
				this.infoTargetProgress,
			);
		} else {
			this.infoProgress = Math.max(
				this.infoProgress - step,
				this.infoTargetProgress,
			);
		}

		const simulationUniforms = this.#getSimulationUniforms();
		const renderUniforms = this.#getRenderUniforms();
		simulationUniforms.uInfoProgress.value = this.infoProgress;
		renderUniforms.uInfoProgress.value = this.infoProgress;
	}

	#finishMorph(): void {
		if (
			!this.morph ||
			!this.particlesVariable ||
			!this.material ||
			!this.points
		) {
			return;
		}

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

		if (this.targetTexture && this.targetTexture !== previousBaseTexture) {
			this.targetTexture.dispose();
		}

		this.targetTexture = this.baseTexture;
		previousBaseTexture?.dispose();
		const simulationUniforms = this.#getSimulationUniforms();
		const renderUniforms = this.#getRenderUniforms();
		simulationUniforms.uBase.value = this.baseTexture;
		simulationUniforms.uTarget.value = this.targetTexture;
		simulationUniforms.uMorphProgress.value = 0;
		renderUniforms.uMorphProgress.value = 0;
		this.#setBaseColors(this.colors);
		this.#setTargetColors(this.colors);
		morph.onLoad?.(this.points);
	}

	#resampleData(data: ParsedPointAsset, vertexCount: number): ParsedPointAsset {
		if (data.vertexCount === vertexCount) return data;

		const positions = new Float32Array(vertexCount * 3);
		const colors = new Float32Array(vertexCount * 3);

		for (let index = 0; index < vertexCount; index++) {
			const sourceIndex = Math.floor((index / vertexCount) * data.vertexCount);
			const sourceI3 = sourceIndex * 3;
			const i3 = index * 3;
			positions[i3] = data.positions[sourceI3] ?? 0;
			positions[i3 + 1] = data.positions[sourceI3 + 1] ?? 0;
			positions[i3 + 2] = data.positions[sourceI3 + 2] ?? 0;
			colors[i3] = data.colors[sourceI3] ?? 0;
			colors[i3 + 1] = data.colors[sourceI3 + 1] ?? 0;
			colors[i3 + 2] = data.colors[sourceI3 + 2] ?? 0;
		}

		return { positions, colors, vertexCount };
	}

	#setBaseColors(colors: Float32Array): void {
		if (!this.points) return;
		const colorAttribute = this.points.geometry.getAttribute(
			"aColor",
		) as THREE.BufferAttribute;
		colorAttribute.array.set(colors);
		colorAttribute.needsUpdate = true;
	}

	#setTargetColors(colors: Float32Array): void {
		if (!this.points) return;
		const colorAttribute = this.points.geometry.getAttribute(
			"aTargetColor",
		) as THREE.BufferAttribute;
		colorAttribute.array.set(colors);
		colorAttribute.needsUpdate = true;
	}

	#findHeaderEnd(buffer: ArrayBuffer): number {
		const bytes = new Uint8Array(buffer);
		const target = "end_header\n";

		for (let index = 0; index < Math.min(bytes.length, 4096); index++) {
			let isMatch = true;
			for (let offset = 0; offset < target.length; offset++) {
				if (bytes[index + offset] !== target.charCodeAt(offset)) {
					isMatch = false;
					break;
				}
			}

			if (isMatch) {
				return index;
			}
		}

		throw new Error("Could not find PLY header end");
	}

	#parseHeader(headerText: string): ParsedHeader {
		const lines = headerText.split("\n");
		let vertexCount = 0;
		const properties = new Map<string, number>();
		let offset = 0;
		let inVertexElement = false;

		for (const line of lines) {
			const parts = line.trim().split(/\s+/);
			if (parts[0] === "element") {
				if (parts[1] === "vertex") {
					vertexCount = Number.parseInt(parts[2] ?? "0", 10);
					inVertexElement = true;
				} else {
					inVertexElement = false;
				}
			}

			if (parts[0] === "property" && inVertexElement) {
				const type = parts[1];
				const name = parts[2];
				const size = type ? (PLY_TYPE_SIZES[type] ?? 4) : 4;
				if (name) {
					properties.set(name, offset);
				}
				offset += size;
			}
		}

		return { vertexCount, properties, stride: offset };
	}

	#getPixelRatio(): number {
		return this.renderer.getPixelRatio();
	}

	#getSimulationUniforms(): SimulationUniforms {
		if (!this.particlesVariable) {
			throw new Error("Simulation uniforms requested before initialization");
		}

		return this.particlesVariable.material.uniforms as SimulationUniforms;
	}

	#getRenderUniforms(): RenderUniforms {
		if (!this.material) {
			throw new Error("Render uniforms requested before initialization");
		}

		return this.material.uniforms as RenderUniforms;
	}
}
