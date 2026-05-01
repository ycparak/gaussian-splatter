#!/usr/bin/env bun
import { readFileSync, writeFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { PLY_TYPE_SIZES } from "../shared/pgs";

const KEEP = ["x", "y", "z", "f_dc_0", "f_dc_1", "f_dc_2"];

const file = process.argv[2];
if (!file) {
	console.error("Usage: bun scripts/strip-ply.ts <input.ply>");
	process.exit(1);
}

const buffer = readFileSync(file);
const headerEnd = buffer.indexOf("end_header\n");
if (headerEnd === -1) throw new Error("No end_header found");
const dataStart = headerEnd + "end_header\n".length;
const headerText = buffer.subarray(0, headerEnd).toString("utf8");
const lines = headerText.split("\n");

let vertexCount = 0;
const properties: Array<{
	name: string;
	type: string;
	offset: number;
	size: number;
}> = [];
let offset = 0;
let inVertex = false;

for (const line of lines) {
	const parts = line.trim().split(/\s+/);
	if (parts[0] === "element") {
		inVertex = parts[1] === "vertex";
		if (inVertex) vertexCount = Number.parseInt(parts[2] ?? "0", 10);
	}

	if (parts[0] === "property" && inVertex) {
		const type = parts[1] ?? "float";
		const name = parts[2];
		const size = PLY_TYPE_SIZES[type] ?? 4;
		if (name) {
			properties.push({ name, type, offset, size });
		}
		offset += size;
	}
}

const srcStride = offset;
const kept = properties.filter((property) => KEEP.includes(property.name));
const dstStride = kept.reduce((sum, property) => sum + property.size, 0);

const newHeader = [
	"ply",
	"format binary_little_endian 1.0",
	`element vertex ${vertexCount}`,
	...kept.map((property) => `property ${property.type} ${property.name}`),
	"end_header\n",
].join("\n");

const headerBuffer = Buffer.from(newHeader, "utf8");
const dataBuffer = Buffer.alloc(vertexCount * dstStride);

for (let index = 0; index < vertexCount; index++) {
	let dstOffset = 0;
	for (const property of kept) {
		buffer.copy(
			dataBuffer,
			index * dstStride + dstOffset,
			dataStart + index * srcStride + property.offset,
			dataStart + index * srcStride + property.offset + property.size,
		);
		dstOffset += property.size;
	}
}

const output = Buffer.concat([headerBuffer, dataBuffer]);
const outputPath = file.replace(/\.ply$/, ".min.ply");
writeFileSync(outputPath, output);

const gzipped = gzipSync(output, { level: 9 });
writeFileSync(`${outputPath}.gz`, gzipped);

const originalMb = (buffer.length / 1e6).toFixed(1);
const strippedMb = (output.length / 1e6).toFixed(1);
const gzippedMb = (gzipped.length / 1e6).toFixed(1);

console.log(
	`${file}: ${originalMb}MB → stripped ${strippedMb}MB → gzipped ${gzippedMb}MB`,
);
