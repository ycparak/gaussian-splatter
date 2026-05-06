import * as THREE from "three";
import { GPUComputationRenderer } from "three/examples/jsm/misc/GPUComputationRenderer.js";
import { parsePointAsset, resamplePointAsset } from "@/shared/pointAssetData";
import type { ParsedPointAsset, SceneSettings } from "@/shared/types";
import { DEFAULT_SCENE_SETTINGS } from "@/src/engine/sceneSettings";
import gpgpuParticlesShader from "@/src/engine/shaders/gpgpu/particles.glsl";
import fragmentShader from "@/src/engine/shaders/particles.frag";
import vertexShader from "@/src/engine/shaders/particles.vert";

type PointsMesh = THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;
type GpuVariable = ReturnType<GPUComputationRenderer["addVariable"]>;
type GpuTexture = ReturnType<GPUComputationRenderer["createTexture"]>;

interface TransitionOptions {
  duration?: number;
  onProgress?: (progress: number) => void;
  onLoad?: (points: PointsMesh) => void;
  onError?: (error: Error) => void;
}

interface PointAssetRuntimeOptions {
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

const INFO_ENTER_TRANSITION_DURATION_SECONDS = 1.5;
const INFO_EXIT_TRANSITION_DURATION_SECONDS =
  INFO_ENTER_TRANSITION_DURATION_SECONDS / 2.5;

export default class PointAssetRuntime {
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

  constructor(url: string, options: PointAssetRuntimeOptions) {
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
        console.error("Point asset transition error:", normalizedError);
        options.onError?.(normalizedError);
      });

    return true;
  }

  setInfoVisible(isVisible: boolean): void {
    this.infoTargetProgress = isVisible ? 1 : 0;
  }

  isInfoTransitionActive(): boolean {
    return Math.abs(this.infoTargetProgress - this.infoProgress) > 0.0001;
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
        console.error("Point asset load error:", normalizedError);
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
    return parsePointAsset(buffer);
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

      const sourceData = resamplePointAsset(
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

    const normalizedTarget = resamplePointAsset(targetData, this.vertexCount);
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

    const duration =
      this.infoTargetProgress > this.infoProgress
        ? INFO_ENTER_TRANSITION_DURATION_SECONDS
        : INFO_EXIT_TRANSITION_DURATION_SECONDS;
    const step = delta / duration;
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
