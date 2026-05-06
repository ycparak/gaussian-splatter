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
import { fileURLToPath } from "node:url";
import type {
	GeneratedScene,
	GenerationJob,
	SceneManifest,
} from "../shared/types";
import { packPlyFile } from "./pgs-format";
import { SceneManifestStore } from "./sceneManifestStore";

const PORT = Number.parseInt(process.env.PORT ?? "8787", 10);
const ROOT = fileURLToPath(new URL("..", import.meta.url));
const GENERATED_ROOT = join(ROOT, ".generated");
const MANIFEST_PATH = join(GENERATED_ROOT, "scenes.json");
const SHARP_BIN = process.env.SHARP_BIN ?? "sharp";
const JOB_RETENTION_MS = 15 * 60 * 1000;
const FINAL_JOB_STATUSES = new Set<GenerationJob["status"]>(["done", "error"]);
const jobs = new Map<string, GenerationJob>();
const jobCleanupTimers = new Map<string, Timer>();
const sceneStore = new SceneManifestStore(await readScenes(), { writeScenes });

const server = Bun.serve({
	port: PORT,
	async fetch(request) {
		const url = new URL(request.url);

		if (request.method === "OPTIONS") {
			return jsonResponse(null, { status: 204 });
		}

		try {
			if (request.method === "GET" && url.pathname === "/api/scenes") {
				return jsonResponse({ scenes: sceneStore.getScenes() });
			}

			if (request.method === "POST" && url.pathname === "/api/scenes") {
				return createSceneJob(request);
			}

			if (request.method === "GET" && url.pathname.startsWith("/api/jobs/")) {
				const id = decodeURIComponent(url.pathname.slice("/api/jobs/".length));
				const job = jobs.get(id);
				if (!job)
					return jsonResponse({ error: "Job not found" }, { status: 404 });
				return jsonResponse({ job });
			}

			if (request.method === "GET" && url.pathname.startsWith("/generated/")) {
				return serveGenerated(url.pathname);
			}

			return jsonResponse({ error: "Not found" }, { status: 404 });
		} catch (error) {
			const normalizedError =
				error instanceof Error ? error : new Error(String(error));
			console.error(normalizedError);
			return jsonResponse({ error: normalizedError.message }, { status: 500 });
		}
	},
});

console.log(`Generator server running at http://localhost:${server.port}`);

async function createSceneJob(request: Request): Promise<Response> {
	const formData = await request.formData();
	const image = formData.get("image");

	if (!(image instanceof File)) {
		return jsonResponse(
			{ error: "Upload one image file with the field name image" },
			{ status: 400 },
		);
	}

	if (!image.type.startsWith("image/")) {
		return jsonResponse(
			{ error: "Uploaded file must be an image" },
			{ status: 400 },
		);
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

	const job: GenerationJob = {
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
		(error: unknown) => {
			const normalizedError =
				error instanceof Error ? error : new Error(String(error));
			updateJob(job, {
				status: "error",
				progress: "Generation failed",
				error: normalizedError.message,
			});
		},
	);

	return jsonResponse({ job }, { status: 202 });
}

async function processJob(
	job: GenerationJob,
	paths: {
		inputDir: string;
		outputDir: string;
		sceneDir: string;
		inputPath: string;
	},
): Promise<void> {
	updateJob(job, {
		status: "running",
		progress: "Running SHARP model...",
	});

	const sharpResult = await runSharp(paths.inputDir, paths.outputDir).catch(
		(error: unknown) => {
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

	const scene: GeneratedScene = {
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
		source: "generated",
	};

	await sceneStore.upsertScene(scene);

	updateJob(job, {
		status: "done",
		progress: "Done. Loading scene...",
		scene,
	});
}

async function runSharp(inputDir: string, outputDir: string) {
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

function formatSharpRuntimeError(error: unknown): string {
	const message = error instanceof Error ? error.message : String(error);

	if (message.includes("Executable not found")) {
		return [
			`SHARP CLI not found at "${SHARP_BIN}".`,
			"This prototype runs Apple SHARP inference on the local Bun server, not inside the browser.",
			"Install apple/ml-sharp in a Python environment, verify `sharp --help` works, then restart `bun run server`.",
			"Alternatively set `SHARP_BIN=/absolute/path/to/sharp bun run server`.",
		].join(" ");
	}

	return message;
}

function formatSharpProcessError(result: {
	stdout: string;
	stderr: string;
	exitCode: number;
}): string {
	const output = [result.stderr, result.stdout]
		.filter(Boolean)
		.join("\n")
		.trim();
	if (!output) return `SHARP failed with exit code ${result.exitCode}.`;
	return `SHARP failed with exit code ${result.exitCode}: ${output}`;
}

async function readScenes(): Promise<GeneratedScene[]> {
	try {
		const text = await readFile(MANIFEST_PATH, "utf8");
		const manifest = JSON.parse(text) as SceneManifest;
		return Array.isArray(manifest.scenes)
			? manifest.scenes.map((scene) => ({ ...scene, source: "generated" }))
			: [];
	} catch {
		return [];
	}
}

async function writeScenes(nextScenes: GeneratedScene[]): Promise<void> {
	await mkdir(GENERATED_ROOT, { recursive: true });
	const manifest: SceneManifest = { scenes: nextScenes };
	await writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
}

async function findFirstFile(
	directory: string,
	extension: string,
): Promise<string | null> {
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

async function serveGenerated(pathname: string): Promise<Response> {
	const relativePath = decodeURIComponent(pathname.slice("/generated/".length));
	const filePath = resolve(GENERATED_ROOT, relativePath);

	if (
		filePath !== GENERATED_ROOT &&
		!filePath.startsWith(`${GENERATED_ROOT}/`)
	) {
		return jsonResponse({ error: "Invalid generated path" }, { status: 400 });
	}

	try {
		const fileStat = await stat(filePath);
		if (!fileStat.isFile()) {
			return jsonResponse({ error: "Not found" }, { status: 404 });
		}
	} catch {
		return jsonResponse({ error: "Not found" }, { status: 404 });
	}

	return new Response(Bun.file(filePath), {
		headers: {
			"Access-Control-Allow-Origin": "*",
			"Cache-Control": "no-store",
			"Content-Type": contentType(filePath),
		},
	});
}

function updateJob(job: GenerationJob, patch: Partial<GenerationJob>): void {
	Object.assign(job, patch, { updatedAt: new Date().toISOString() });
	jobs.set(job.id, job);

	if (FINAL_JOB_STATUSES.has(job.status)) {
		scheduleJobCleanup(job.id);
	} else {
		clearJobCleanup(job.id);
	}
}

function scheduleJobCleanup(jobId: string): void {
	clearJobCleanup(jobId);
	const timer = setTimeout(() => {
		jobs.delete(jobId);
		jobCleanupTimers.delete(jobId);
	}, JOB_RETENTION_MS);
	jobCleanupTimers.set(jobId, timer);
}

function clearJobCleanup(jobId: string): void {
	const existingTimer = jobCleanupTimers.get(jobId);
	if (!existingTimer) return;
	clearTimeout(existingTimer);
	jobCleanupTimers.delete(jobId);
}

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
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

function readableName(filename: string): string {
	return (
		filename
			.replace(/\.[^.]+$/, "")
			.replace(/[-_]+/g, " ")
			.trim() || "scene"
	);
}

function slugify(value: string): string {
	return (
		value
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-+|-+$/g, "")
			.slice(0, 48) || "scene"
	);
}

function imageExtension(mimeType: string): string {
	if (mimeType === "image/png") return ".png";
	if (mimeType === "image/webp") return ".webp";
	return ".jpg";
}

function contentType(filePath: string): string {
	if (filePath.endsWith(".png")) return "image/png";
	if (filePath.endsWith(".webp")) return "image/webp";
	if (filePath.endsWith(".jpg") || filePath.endsWith(".jpeg")) {
		return "image/jpeg";
	}
	return "application/octet-stream";
}

function basename(filePath: string): string {
	return filePath.split("/").pop() ?? filePath;
}

async function fileHash(filePath: string): Promise<string> {
	const data = await readFile(filePath);
	return createHash("sha256").update(data).digest("hex");
}
