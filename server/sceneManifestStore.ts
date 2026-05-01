import { mergeGeneratedScene } from "../shared/generatedScenes";
import type { GeneratedScene } from "../shared/types";

export interface SceneManifestPersistence {
	writeScenes(scenes: GeneratedScene[]): Promise<void>;
}

export class SceneManifestStore {
	#scenes: GeneratedScene[];
	#persistence: SceneManifestPersistence;
	#queue: Promise<void> = Promise.resolve();

	constructor(
		initialScenes: GeneratedScene[],
		persistence: SceneManifestPersistence,
	) {
		this.#scenes = initialScenes;
		this.#persistence = persistence;
	}

	getScenes(): GeneratedScene[] {
		return this.#scenes;
	}

	async upsertScene(scene: GeneratedScene): Promise<GeneratedScene[]> {
		let nextScenes: GeneratedScene[] = this.#scenes;

		const task = this.#queue.then(async () => {
			nextScenes = mergeGeneratedScene(this.#scenes, scene);
			await this.#persistence.writeScenes(nextScenes);
			this.#scenes = nextScenes;
		});

		this.#queue = task.catch(() => undefined);
		await task;
		return nextScenes;
	}
}
