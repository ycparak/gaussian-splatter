import { useCallback, useEffect, useRef, useState } from "react";
import SceneSidebar from "./components/SceneSidebar";
import Three from "./core/Three";
import { defaultScene } from "./scenes/availableScenes";

export default function App() {
	const containerRef = useRef(null);
	const threeRef = useRef(null);
	const [activeSceneId, setActiveSceneId] = useState(defaultScene.id);

	useEffect(() => {
		if (!containerRef.current || threeRef.current) return;

		const three = new Three(containerRef.current);
		threeRef.current = three;
		three.run();

		return () => {
			three.dispose();
			threeRef.current = null;
		};
	}, []);

	const handleSceneSelect = useCallback((scene) => {
		setActiveSceneId(scene.id);
		threeRef.current?.loadScene(scene);
	}, []);

	return (
		<>
			<div ref={containerRef} className="h-lvh w-full" />
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
