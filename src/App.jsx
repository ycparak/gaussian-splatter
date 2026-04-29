import { useCallback, useEffect, useRef, useState } from "react";
import SceneControlsSidebar from "./components/SceneControlsSidebar";
import SceneSidebar from "./components/SceneSidebar";
import {
	cloneSceneSettings,
	DEFAULT_SCENE_SETTINGS,
} from "./config/sceneControls";
import Three from "./core/Three";
import { defaultScene } from "./scenes/availableScenes";

export default function App() {
	const containerRef = useRef(null);
	const threeRef = useRef(null);
	const [activeSceneId, setActiveSceneId] = useState(defaultScene.id);
	const [sceneSettings, setSceneSettings] = useState(() =>
		cloneSceneSettings(),
	);
	const initialSceneSettingsRef = useRef(sceneSettings);
	const [sceneStats, setSceneStats] = useState({
		activeAssetId: defaultScene?.id ?? null,
		particleCount: 0,
	});

	useEffect(() => {
		if (!containerRef.current || threeRef.current) return;

		const three = new Three(containerRef.current, {
			settings: initialSceneSettingsRef.current,
			onStatsChange: setSceneStats,
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

	const handleSceneSelect = useCallback((scene) => {
		setActiveSceneId(scene.id);
		threeRef.current?.loadScene(scene);
	}, []);

	const resetSceneSettings = useCallback(() => {
		setSceneSettings(cloneSceneSettings(DEFAULT_SCENE_SETTINGS));
	}, []);

	return (
		<>
			<div ref={containerRef} className="h-lvh w-full" />
			<SceneControlsSidebar
				settings={sceneSettings}
				stats={sceneStats}
				onSettingsChange={setSceneSettings}
				onResetAll={resetSceneSettings}
			/>
			<SceneSidebar
				activeSceneId={activeSceneId}
				onSceneSelect={handleSceneSelect}
			/>
			<div
				id="loader"
				className="fixed inset-0 z-50 flex items-center justify-center bg-black transition-opacity duration-700"
			>
				<div className="flex flex-col items-center gap-3">
					<div className="h-1 w-48 overflow-hidden rounded-full bg-white/10">
						<div
							id="loader-bar"
							className="h-full w-0 rounded-full bg-white transition-[width] duration-150"
						/>
					</div>
				</div>
			</div>
		</>
	);
}
