import type { SceneAsset } from "./types";

export interface SceneSelectionState {
	activeSceneId: string | null;
	pendingSceneId: string | null;
	errorMessage: string | null;
}

export function createInitialSceneSelectionState(
	defaultScene: SceneAsset | null,
): SceneSelectionState {
	return {
		activeSceneId: defaultScene?.id ?? null,
		pendingSceneId: null,
		errorMessage: null,
	};
}

export function applySceneSelectionRequested(
	state: SceneSelectionState,
	scene: SceneAsset,
): SceneSelectionState {
	return {
		...state,
		pendingSceneId: scene.id,
		errorMessage: null,
	};
}

export function applySceneLoadSucceeded(
	_state: SceneSelectionState,
	scene: SceneAsset,
): SceneSelectionState {
	return {
		activeSceneId: scene.id,
		pendingSceneId: null,
		errorMessage: null,
	};
}

export function applySceneLoadFailed(
	state: SceneSelectionState,
	scene: SceneAsset,
	error: Error,
): SceneSelectionState {
	return {
		...state,
		pendingSceneId: null,
		errorMessage: `Could not load ${scene.id}: ${error.message}`,
	};
}
