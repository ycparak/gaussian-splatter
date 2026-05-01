#!/usr/bin/env bun
import { packPlyFile } from "./pgs-format";

const [inputPath, outputPath] = process.argv.slice(2);

if (!inputPath || !outputPath) {
	console.error("Usage: bun scripts/pack-pgs.ts <input.ply> <output.pgs.gz>");
	process.exit(1);
}

try {
	const result = await packPlyFile(inputPath, outputPath);
	const inputMb = (result.inputBytes / 1e6).toFixed(2);
	const outputMb = (result.outputBytes / 1e6).toFixed(2);
	const pct = (result.ratio * 100).toFixed(1);

	console.log(
		`${inputPath}: ${inputMb}MB -> ${outputMb}MB (${pct}%, ${result.vertexCount} points)`,
	);
} catch (error) {
	console.error(error);
	process.exit(1);
}
