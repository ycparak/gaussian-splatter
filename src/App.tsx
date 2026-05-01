import { useCallback, useEffect, useRef, useState } from "react";
import {
	applySceneLoadFailed,
	applySceneLoadSucceeded,
	applySceneSelectionRequested,
	createInitialSceneSelectionState,
} from "../shared/sceneSelection";
import type {
	SceneAsset,
	SceneLoadCallbacks,
	SceneStats,
} from "../shared/types";
import SceneControlsSidebar from "./components/SceneControlsSidebar";
import SceneSidebar from "./components/SceneSidebar";
import {
	cloneSceneSettings,
	DEFAULT_SCENE_SETTINGS,
} from "./config/sceneControls";
import Three from "./core/Three";
import { defaultScene } from "./scenes/availableScenes";

interface LoaderState {
	visible: boolean;
	progress: number;
	phase: "idle" | "loading" | "loaded" | "error";
	message: string | null;
}

const INITIAL_LOADER_STATE: LoaderState = defaultScene
	? {
			visible: true,
			progress: 0,
			phase: "loading",
			message: `Loading ${defaultScene.name}...`,
		}
	: {
			visible: false,
			progress: 0,
			phase: "idle",
			message: null,
		};

export default function App() {
	const containerRef = useRef<HTMLDivElement | null>(null);
	const threeRef = useRef<Three | null>(null);
	const initialSceneSettingsRef = useRef(cloneSceneSettings());
	const hasCompletedInitialLoadRef = useRef(!defaultScene);
	const [sceneSettings, setSceneSettings] = useState(
		initialSceneSettingsRef.current,
	);
	const [sceneStats, setSceneStats] = useState<SceneStats>({
		activeAssetId: defaultScene?.id ?? null,
		particleCount: 0,
	});
	const [selectionState, setSelectionState] = useState(() =>
		createInitialSceneSelectionState(defaultScene),
	);
	const [loaderState, setLoaderState] =
		useState<LoaderState>(INITIAL_LOADER_STATE);

	useEffect(() => {
		if (!containerRef.current || threeRef.current) return;

		const sceneLoadCallbacks: SceneLoadCallbacks = {
			onLoadStart: (asset) => {
				setSelectionState((currentState) =>
					applySceneSelectionRequested(currentState, asset),
				);
				if (!hasCompletedInitialLoadRef.current) {
					setLoaderState({
						visible: true,
						progress: 0,
						phase: "loading",
						message: `Loading ${asset.name}...`,
					});
				}
			},
			onLoadProgress: (asset, progress) => {
				if (!hasCompletedInitialLoadRef.current) {
					setLoaderState({
						visible: true,
						progress,
						phase: "loading",
						message: `Loading ${asset.name}...`,
					});
				}
			},
			onLoadSuccess: (asset, stats) => {
				hasCompletedInitialLoadRef.current = true;
				setSelectionState((currentState) =>
					applySceneLoadSucceeded(currentState, asset),
				);
				setSceneStats(stats);
				setLoaderState({
					visible: false,
					progress: 1,
					phase: "loaded",
					message: null,
				});
			},
			onLoadError: (asset, error) => {
				setSelectionState((currentState) =>
					applySceneLoadFailed(currentState, asset, error),
				);
				if (!hasCompletedInitialLoadRef.current) {
					setLoaderState({
						visible: true,
						progress: 0,
						phase: "error",
						message: error.message,
					});
				}
			},
		};

		const three = new Three(containerRef.current, {
			settings: initialSceneSettingsRef.current,
			onStatsChange: setSceneStats,
			sceneLoadCallbacks,
		});
		threeRef.current = three;
		three.run();

		return () => {
			three.dispose();
			threeRef.current = null;
		};
	}, []);

	useEffect(() => {
		threeRef.current?.applySettings(sceneSettings);
	}, [sceneSettings]);

	const handleSceneSelect = useCallback((scene: SceneAsset) => {
		threeRef.current?.loadScene(scene);
	}, []);

	const resetSceneSettings = useCallback(() => {
		setSceneSettings(cloneSceneSettings(DEFAULT_SCENE_SETTINGS));
	}, []);

	return (
		<>
			<div ref={containerRef} className="fixed inset-0 overflow-hidden" />
			<SceneControlsSidebar
				settings={sceneSettings}
				stats={sceneStats}
				onSettingsChange={setSceneSettings}
				onResetAll={resetSceneSettings}
			/>
			<SceneSidebar
				activeSceneId={selectionState.activeSceneId}
				onSceneSelect={handleSceneSelect}
				sceneErrorMessage={selectionState.errorMessage}
			/>
			<div
				id="loader"
				className={`fixed inset-0 z-50 flex items-center justify-center bg-black transition-opacity duration-700 ${
					loaderState.visible ? "opacity-100" : "pointer-events-none opacity-0"
				}`}
			>
				<div className="flex flex-col items-center gap-3">
					<div className="h-1 w-48 overflow-hidden rounded-full bg-white/10">
						<div
							id="loader-bar"
							className="h-full rounded-full bg-white transition-[width] duration-150"
							style={{ width: `${Math.round(loaderState.progress * 100)}%` }}
						/>
					</div>
					{loaderState.message ? (
						<p className="max-w-56 text-center text-[11px] text-white/70">
							{loaderState.phase === "error"
								? `Load failed: ${loaderState.message}`
								: loaderState.message}
						</p>
					) : null}
				</div>
			</div>
		</>
	);
}
