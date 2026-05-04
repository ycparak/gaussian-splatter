import type { GeneratedScene } from "@/shared/types";

export function mergeGeneratedScene(
	scenes: GeneratedScene[],
	scene: GeneratedScene,
): GeneratedScene[] {
	return [scene, ...scenes.filter((item) => item.id !== scene.id)];
}
