import { describe, expect, test } from "bun:test";
import { SceneManifestStore } from "../server/sceneManifestStore";
import type { GeneratedScene } from "../shared/types";

function createScene(id: string): GeneratedScene {
	return {
		id,
		name: id,
		url: `/generated/${id}/scene.pgs.gz`,
		source: "generated",
	};
}

describe("SceneManifestStore", () => {
	test("serializes concurrent writes and keeps all completed scenes", async () => {
		let activeWrites = 0;
		let maxConcurrentWrites = 0;
		const writes: string[][] = [];

		const store = new SceneManifestStore([], {
			writeScenes: async (scenes) => {
				activeWrites += 1;
				maxConcurrentWrites = Math.max(maxConcurrentWrites, activeWrites);
				writes.push(scenes.map((scene) => scene.id));
				await Bun.sleep(5);
				activeWrites -= 1;
			},
		});

		await Promise.all([
			store.upsertScene(createScene("scene-a")),
			store.upsertScene(createScene("scene-b")),
		]);

		expect(maxConcurrentWrites).toBe(1);
		expect(store.getScenes().map((scene) => scene.id)).toEqual([
			"scene-b",
			"scene-a",
		]);
		expect(writes.at(-1)).toEqual(["scene-b", "scene-a"]);
	});
});
