#!/usr/bin/env node
import { packPlyFile } from "./pgs-format.mjs";

const [inputPath, outputPath] = process.argv.slice(2);

if (!inputPath || !outputPath) {
	console.error("Usage: node scripts/pack-pgs.mjs <input.ply> <output.pgs.gz>");
	process.exit(1);
}

try {
	const result = await packPlyFile(inputPath, outputPath);
	const inputMB = (result.inputBytes / 1e6).toFixed(2);
	const outputMB = (result.outputBytes / 1e6).toFixed(2);
	const pct = (result.ratio * 100).toFixed(1);

	console.log(
		`${inputPath}: ${inputMB}MB -> ${outputMB}MB (${pct}%, ${result.vertexCount} points)`,
	);
} catch (error) {
	console.error(error);
	process.exit(1);
}
