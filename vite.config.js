import { readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import glsl from "vite-plugin-glsl";

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

function bundledScenesPlugin() {
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
			const scenes = readdirSync(publicDir)
				.filter((file) => file.endsWith(".pgs.gz"))
				.sort((a, b) => a.localeCompare(b))
				.map((file) => {
					const id = file.replace(/\.pgs\.gz$/, "");
					return {
						id,
						name: id,
						file,
						source: "bundled",
					};
				});

			const module = scenes
				.map(
					(scene) => `{
	id: ${JSON.stringify(scene.id)},
	name: ${JSON.stringify(scene.name)},
	url: import.meta.env.BASE_URL + ${JSON.stringify(scene.file)},
	source: ${JSON.stringify(scene.source)},
}`,
				)
				.join(",\n");

			return `export const bundledScenes = [${module}];`;
		},
	};
}
