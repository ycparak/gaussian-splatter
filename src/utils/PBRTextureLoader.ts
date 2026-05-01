import * as THREE from "three";

interface RepeatConfig {
	x: number;
	y: number;
}

interface TextureNames {
	color?: string | null;
	normal?: string | null;
	roughness?: string | null;
	metalness?: string | null;
	displacement?: string | null;
	ao?: string | null;
}

interface PBRTextureLoaderOptions {
	repeat?: RepeatConfig;
}

export default class PBRTextureLoader {
	readonly basePath: string;
	readonly loader = new THREE.TextureLoader();
	readonly textures: Partial<
		Record<keyof THREE.MeshStandardMaterial, THREE.Texture>
	> = {};
	readonly repeat: RepeatConfig;

	constructor(basePath: string, options: PBRTextureLoaderOptions = {}) {
		this.basePath = basePath;
		this.repeat = options.repeat ?? { x: 1, y: 1 };
	}

	async loadTextures(textureNames: TextureNames = {}) {
		const loadPromises: Array<Promise<void>> = [];

		if (textureNames.color) {
			loadPromises.push(
				this.#loadTexture(textureNames.color, "color").then((texture) => {
					texture.colorSpace = THREE.SRGBColorSpace;
					this.textures.map = texture;
				}),
			);
		}

		if (textureNames.normal) {
			loadPromises.push(
				this.#loadTexture(textureNames.normal, "normal").then((texture) => {
					this.textures.normalMap = texture;
				}),
			);
		}

		if (textureNames.roughness) {
			loadPromises.push(
				this.#loadTexture(textureNames.roughness, "roughness").then(
					(texture) => {
						this.textures.roughnessMap = texture;
					},
				),
			);
		}

		if (textureNames.metalness) {
			loadPromises.push(
				this.#loadTexture(textureNames.metalness, "metalness").then(
					(texture) => {
						this.textures.metalnessMap = texture;
					},
				),
			);
		}

		if (textureNames.displacement) {
			loadPromises.push(
				this.#loadTexture(textureNames.displacement, "displacement").then(
					(texture) => {
						this.textures.displacementMap = texture;
					},
				),
			);
		}

		if (textureNames.ao) {
			loadPromises.push(
				this.#loadTexture(textureNames.ao, "ao").then((texture) => {
					this.textures.aoMap = texture;
				}),
			);
		}

		await Promise.all(loadPromises);
		return this.textures;
	}

	applyToMaterial<TMaterial extends THREE.MeshStandardMaterial>(
		material: TMaterial,
	): TMaterial {
		Object.assign(material, this.textures);
		material.needsUpdate = true;
		return material;
	}

	#loadTexture(filename: string, type: string): Promise<THREE.Texture> {
		return new Promise((resolve, reject) => {
			const path = `${this.basePath}/${filename}`;

			this.loader.load(
				path,
				(texture) => {
					texture.wrapS = THREE.RepeatWrapping;
					texture.wrapT = THREE.RepeatWrapping;
					texture.repeat.set(this.repeat.x, this.repeat.y);
					texture.needsUpdate = true;
					resolve(texture);
				},
				undefined,
				(error) => {
					console.error(`Failed to load ${type} texture at ${path}:`, error);
					reject(error);
				},
			);
		});
	}
}
