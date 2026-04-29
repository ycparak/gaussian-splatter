#!/usr/bin/env bun
import { createHash, randomUUID } from "node:crypto";
import {
	copyFile,
	mkdir,
	readdir,
	readFile,
	stat,
	writeFile,
} from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import { packPlyFile } from "../scripts/pgs-format.mjs";

const PORT = Number.parseInt(process.env.PORT || "8787", 10);
const ROOT = resolve(import.meta.dirname, "..");
const GENERATED_ROOT = join(ROOT, ".generated");
const MANIFEST_PATH = join(GENERATED_ROOT, "scenes.json");
const SHARP_BIN = process.env.SHARP_BIN || "sharp";
const jobs = new Map();

let scenes = await readScenes();

const server = Bun.serve({
	port: PORT,
	async fetch(request) {
		const url = new URL(request.url);

		if (request.method === "OPTIONS") {
			return json(null, { status: 204 });
		}

		try {
			if (request.method === "GET" && url.pathname === "/api/scenes") {
				return json({ scenes });
			}

			if (request.method === "POST" && url.pathname === "/api/scenes") {
				return createSceneJob(request);
			}

			if (request.method === "GET" && url.pathname.startsWith("/api/jobs/")) {
				const id = decodeURIComponent(url.pathname.slice("/api/jobs/".length));
				const job = jobs.get(id);
				if (!job) return json({ error: "Job not found" }, { status: 404 });
				return json({ job });
			}

			if (request.method === "GET" && url.pathname.startsWith("/generated/")) {
				return serveGenerated(url.pathname);
			}

			return json({ error: "Not found" }, { status: 404 });
		} catch (error) {
			console.error(error);
			return json({ error: error.message }, { status: 500 });
		}
	},
});

console.log(`Generator server running at http://localhost:${server.port}`);

async function createSceneJob(request) {
	const formData = await request.formData();
	const image = formData.get("image");

	if (!(image instanceof File)) {
		return json(
			{ error: "Upload one image file with the field name image" },
			{
				status: 400,
			},
		);
	}

	if (!image.type.startsWith("image/")) {
		return json({ error: "Uploaded file must be an image" }, { status: 400 });
	}

	const id = randomUUID();
	const sceneName = readableName(image.name);
	const sceneId = `${Date.now()}-${slugify(sceneName)}`;
	const sceneDir = join(GENERATED_ROOT, sceneId);
	const inputDir = join(sceneDir, "input");
	const outputDir = join(sceneDir, "sharp");
	const extension = extname(image.name) || imageExtension(image.type);
	const inputPath = join(inputDir, `source${extension}`);

	await mkdir(inputDir, { recursive: true });
	await mkdir(outputDir, { recursive: true });
	await writeFile(inputPath, Buffer.from(await image.arrayBuffer()));

	const job = {
		id,
		sceneId,
		name: sceneName,
		status: "queued",
		progress: "Queued",
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
	};
	jobs.set(id, job);

	processJob(job, { inputDir, outputDir, sceneDir, inputPath }).catch(
		(error) => {
			updateJob(job, {
				status: "error",
				progress: "Generation failed",
				error: error.message,
			});
		},
	);

	return json({ job }, { status: 202 });
}

async function processJob(job, paths) {
	updateJob(job, {
		status: "running",
		progress: "Running SHARP model...",
	});

	const sharpResult = await runSharp(paths.inputDir, paths.outputDir).catch(
		(error) => {
			throw new Error(formatSharpRuntimeError(error));
		},
	);
	if (sharpResult.exitCode !== 0) {
		throw new Error(formatSharpProcessError(sharpResult));
	}

	updateJob(job, {
		status: "optimizing",
		progress: "Optimizing point asset...",
	});

	const plyPath = await findFirstFile(paths.outputDir, ".ply");
	if (!plyPath) {
		throw new Error("SHARP completed but no .ply file was found");
	}

	const assetPath = join(paths.sceneDir, "scene.pgs.gz");
	const previewPath = join(paths.sceneDir, `source${extname(paths.inputPath)}`);
	const stats = await packPlyFile(plyPath, assetPath);
	await copyFile(paths.inputPath, previewPath);

	const scene = {
		id: job.sceneId,
		name: job.name,
		url: `/generated/${job.sceneId}/scene.pgs.gz`,
		previewUrl: `/generated/${job.sceneId}/${basename(previewPath)}`,
		vertexCount: stats.vertexCount,
		originalBytes: stats.inputBytes,
		optimizedBytes: stats.outputBytes,
		ratio: stats.ratio,
		createdAt: job.createdAt,
		sourceHash: await fileHash(paths.inputPath),
	};

	scenes = [scene, ...scenes.filter((item) => item.id !== scene.id)];
	await writeScenes(scenes);

	updateJob(job, {
		status: "done",
		progress: "Done. Loading scene...",
		scene,
	});
}

async function runSharp(inputDir, outputDir) {
	const proc = Bun.spawn(
		[SHARP_BIN, "predict", "-i", inputDir, "-o", outputDir],
		{
			cwd: ROOT,
			stdout: "pipe",
			stderr: "pipe",
		},
	);

	const [stdout, stderr, exitCode] = await Promise.all([
		new Response(proc.stdout).text(),
		new Response(proc.stderr).text(),
		proc.exited,
	]);

	return { stdout, stderr, exitCode };
}

function formatSharpRuntimeError(error) {
	if (error.message.includes("Executable not found")) {
		return [
			`SHARP CLI not found at "${SHARP_BIN}".`,
			"This prototype runs Apple SHARP inference on the local Bun server, not inside the browser.",
			"Install apple/ml-sharp in a Python environment, verify `sharp --help` works, then restart `bun run server`.",
			"Alternatively set `SHARP_BIN=/absolute/path/to/sharp bun run server`.",
		].join(" ");
	}

	return error.message;
}

function formatSharpProcessError(result) {
	const output = [result.stderr, result.stdout]
		.filter(Boolean)
		.join("\n")
		.trim();
	if (!output) return `SHARP failed with exit code ${result.exitCode}.`;

	return `SHARP failed with exit code ${result.exitCode}: ${output}`;
}

async function readScenes() {
	try {
		const text = await readFile(MANIFEST_PATH, "utf8");
		const manifest = JSON.parse(text);
		return Array.isArray(manifest.scenes) ? manifest.scenes : [];
	} catch {
		return [];
	}
}

async function writeScenes(nextScenes) {
	await mkdir(GENERATED_ROOT, { recursive: true });
	await writeFile(
		MANIFEST_PATH,
		`${JSON.stringify({ scenes: nextScenes }, null, 2)}\n`,
	);
}

async function findFirstFile(directory, extension) {
	const entries = await readdir(directory, { withFileTypes: true });

	for (const entry of entries) {
		const path = join(directory, entry.name);
		if (entry.isDirectory()) {
			const nested = await findFirstFile(path, extension);
			if (nested) return nested;
		}
		if (entry.isFile() && entry.name.endsWith(extension)) return path;
	}

	return null;
}

async function serveGenerated(pathname) {
	const relativePath = decodeURIComponent(pathname.slice("/generated/".length));
	const filePath = resolve(GENERATED_ROOT, relativePath);

	if (
		filePath !== GENERATED_ROOT &&
		!filePath.startsWith(`${GENERATED_ROOT}/`)
	) {
		return json({ error: "Invalid generated path" }, { status: 400 });
	}

	try {
		const fileStat = await stat(filePath);
		if (!fileStat.isFile()) {
			return json({ error: "Not found" }, { status: 404 });
		}
	} catch {
		return json({ error: "Not found" }, { status: 404 });
	}

	return new Response(Bun.file(filePath), {
		headers: {
			"Access-Control-Allow-Origin": "*",
			"Cache-Control": "no-store",
			"Content-Type": contentType(filePath),
		},
	});
}

function updateJob(job, patch) {
	Object.assign(job, patch, { updatedAt: new Date().toISOString() });
	jobs.set(job.id, job);
}

function json(body, init = {}) {
	return new Response(body === null ? null : JSON.stringify(body), {
		...init,
		headers: {
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Methods": "GET,POST,OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type",
			"Content-Type": "application/json",
			...init.headers,
		},
	});
}

function readableName(filename) {
	return (
		filename
			.replace(/\.[^.]+$/, "")
			.replace(/[-_]+/g, " ")
			.trim() || "scene"
	);
}

function slugify(value) {
	return (
		value
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-+|-+$/g, "")
			.slice(0, 48) || "scene"
	);
}

function imageExtension(mimeType) {
	if (mimeType === "image/png") return ".png";
	if (mimeType === "image/webp") return ".webp";
	return ".jpg";
}

function contentType(filePath) {
	if (filePath.endsWith(".png")) return "image/png";
	if (filePath.endsWith(".webp")) return "image/webp";
	if (filePath.endsWith(".jpg") || filePath.endsWith(".jpeg")) {
		return "image/jpeg";
	}
	return "application/octet-stream";
}

function basename(filePath) {
	return filePath.split("/").pop();
}

async function fileHash(filePath) {
	const data = await readFile(filePath);
	return createHash("sha256").update(data).digest("hex");
}
