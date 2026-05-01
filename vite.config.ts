import { readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import type { Plugin } from "vite";
import { defineConfig } from "vite";
import glsl from "vite-plugin-glsl";
import type { SceneAsset } from "./shared/types";

const bundledScenesModuleId = "virtual:bundled-scenes";
const resolvedBundledScenesModuleId = `\0${bundledScenesModuleId}`;

export default defineConfig({
	plugins: [bundledScenesPlugin(), react(), tailwindcss(), glsl()],
	base: "/",
	server: {
		proxy: {
			"/api": "http://localhost:8787",
			"/generated": "http://localhost:8787",
		},
	},
	resolve: {
		alias: {
			"@": fileURLToPath(new URL("./src", import.meta.url)),
		},
	},
});

function bundledScenesPlugin(): Plugin {
	return {
		name: "bundled-scenes",
		configureServer(server) {
			server.watcher.add(join(process.cwd(), "public", "*.pgs.gz"));
			server.watcher.on("all", (_event, path) => {
				if (!path.endsWith(".pgs.gz")) return;

				const module = server.moduleGraph.getModuleById(
					resolvedBundledScenesModuleId,
				);
				if (module) server.moduleGraph.invalidateModule(module);
				server.ws.send({ type: "full-reload" });
			});
		},
		resolveId(id) {
			if (id === bundledScenesModuleId) return resolvedBundledScenesModuleId;
			return null;
		},
		load(id) {
			if (id !== resolvedBundledScenesModuleId) return null;

			const publicDir = join(process.cwd(), "public");
			const scenes: SceneAsset[] = readdirSync(publicDir)
				.filter((file) => file.endsWith(".pgs.gz"))
				.sort((left, right) => left.localeCompare(right))
				.map((file) => ({
					id: file.replace(/\.pgs\.gz$/, ""),
					name: file.replace(/\.pgs\.gz$/, ""),
					url: `__BASE__${file}`,
					source: "bundled",
				}));

			const moduleSource = scenes
				.map(
					(scene) => `{
	id: ${JSON.stringify(scene.id)},
	name: ${JSON.stringify(scene.name)},
	url: import.meta.env.BASE_URL + ${JSON.stringify(scene.url.replace("__BASE__", ""))},
	source: ${JSON.stringify(scene.source)},
}`,
				)
				.join(",\n");

			return `export const bundledScenes = [${moduleSource}];`;
		},
	};
}
