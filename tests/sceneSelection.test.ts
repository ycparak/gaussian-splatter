import { describe, expect, test } from "bun:test";
import {
	applySceneLoadFailed,
	applySceneLoadSucceeded,
	applySceneSelectionRequested,
	createInitialSceneSelectionState,
} from "../shared/sceneSelection";
import type { SceneAsset } from "../shared/types";

const defaultScene: SceneAsset = {
	id: "tokyo",
	name: "Tokyo",
	url: "/tokyo.pgs.gz",
	source: "bundled",
};

const nextScene: SceneAsset = {
	id: "window",
	name: "Window",
	url: "/window.pgs.gz",
	source: "bundled",
};

describe("sceneSelection", () => {
	test("keeps the active scene stable until a new scene loads successfully", () => {
		const initialState = createInitialSceneSelectionState(defaultScene);
		const requestedState = applySceneSelectionRequested(
			initialState,
			nextScene,
		);

		expect(requestedState.activeSceneId).toBe("tokyo");
		expect(requestedState.pendingSceneId).toBe("window");

		const failedState = applySceneLoadFailed(
			requestedState,
			nextScene,
			new Error("HTTP 404"),
		);
		expect(failedState.activeSceneId).toBe("tokyo");
		expect(failedState.pendingSceneId).toBeNull();

		const succeededState = applySceneLoadSucceeded(requestedState, nextScene);
		expect(succeededState.activeSceneId).toBe("window");
		expect(succeededState.pendingSceneId).toBeNull();
	});
});
