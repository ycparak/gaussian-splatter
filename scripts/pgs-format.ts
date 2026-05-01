import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { gzipSync } from "node:zlib";
import {
	PGS_BYTES_PER_POINT,
	PGS_COLOR_RGB565,
	PGS_HEADER_BYTES,
	PGS_MAGIC,
	PGS_VERSION,
	PLY_TYPE_SIZES,
	SH_C0,
} from "../shared/pgs";
import type { Bounds3, PackPlyResult } from "../shared/types";

interface PackedBufferResult {
	buffer: Buffer;
	vertexCount: number;
	bounds: Bounds3;
}

interface PlyHeaderProperty {
	offset: number;
	size: number;
	type: string;
}

interface PlyColorInfo {
	dc0Off?: number;
	dc1Off?: number;
	dc2Off?: number;
	redOff?: number;
	greenOff?: number;
	blueOff?: number;
	hasSHColors: boolean;
	hasRgbColors: boolean;
}

export async function packPlyFile(
	inputPath: string,
	outputPath: string,
): Promise<PackPlyResult> {
	const input = await readFile(inputPath);
	const packed = packPlyBuffer(input);
	const gzipped = gzipSync(packed.buffer, { level: 9 });

	await mkdir(dirname(outputPath), { recursive: true });
	await writeFile(outputPath, gzipped);

	return {
		inputBytes: input.byteLength,
		outputBytes: gzipped.byteLength,
		vertexCount: packed.vertexCount,
		ratio: gzipped.byteLength / input.byteLength,
		bounds: packed.bounds,
	};
}

export function packPlyBuffer(input: Buffer | ArrayBuffer): PackedBufferResult {
	const source = Buffer.isBuffer(input) ? input : Buffer.from(input);
	const headerEnd = source.indexOf("end_header\n");
	if (headerEnd === -1) {
		throw new Error("PLY header must contain end_header");
	}

	const dataStart = headerEnd + "end_header\n".length;
	const headerText = source.subarray(0, headerEnd).toString("utf8");
	const { vertexCount, properties, stride } = parsePlyHeader(headerText);

	const xOff = requiredOffset(properties, "x");
	const yOff = requiredOffset(properties, "y");
	const zOff = requiredOffset(properties, "z");
	const dc0Off = properties.get("f_dc_0")?.offset;
	const dc1Off = properties.get("f_dc_1")?.offset;
	const dc2Off = properties.get("f_dc_2")?.offset;
	const redOff = properties.get("red")?.offset;
	const greenOff = properties.get("green")?.offset;
	const blueOff = properties.get("blue")?.offset;
	const hasSHColors =
		dc0Off !== undefined && dc1Off !== undefined && dc2Off !== undefined;
	const hasRgbColors =
		redOff !== undefined && greenOff !== undefined && blueOff !== undefined;

	const min: Bounds3["min"] = [Infinity, Infinity, Infinity];
	const max: Bounds3["max"] = [-Infinity, -Infinity, -Infinity];

	for (let index = 0; index < vertexCount; index++) {
		const base = dataStart + index * stride;
		const x = source.readFloatLE(base + xOff);
		const y = source.readFloatLE(base + yOff);
		const z = source.readFloatLE(base + zOff);

		if (x < min[0]) min[0] = x;
		if (y < min[1]) min[1] = y;
		if (z < min[2]) min[2] = z;
		if (x > max[0]) max[0] = x;
		if (y > max[1]) max[1] = y;
		if (z > max[2]) max[2] = z;
	}

	const output = Buffer.alloc(
		PGS_HEADER_BYTES + vertexCount * PGS_BYTES_PER_POINT,
	);
	output.write(PGS_MAGIC, 0, "ascii");
	output.writeUInt32LE(PGS_VERSION, 4);
	output.writeUInt32LE(vertexCount, 8);
	output.writeUInt8(PGS_COLOR_RGB565, 12);

	for (let axis = 0; axis < 3; axis++) {
		output.writeFloatLE(min[axis] ?? 0, 16 + axis * 4);
		output.writeFloatLE(max[axis] ?? 0, 28 + axis * 4);
	}

	let writeOffset = PGS_HEADER_BYTES;
	for (let index = 0; index < vertexCount; index++) {
		const base = dataStart + index * stride;
		const x = source.readFloatLE(base + xOff);
		const y = source.readFloatLE(base + yOff);
		const z = source.readFloatLE(base + zOff);

		output.writeUInt16LE(quantize(x, min[0], max[0]), writeOffset);
		output.writeUInt16LE(quantize(y, min[1], max[1]), writeOffset + 2);
		output.writeUInt16LE(quantize(z, min[2], max[2]), writeOffset + 4);

		const [r, g, b] = readColor(source, base, {
			dc0Off,
			dc1Off,
			dc2Off,
			redOff,
			greenOff,
			blueOff,
			hasSHColors,
			hasRgbColors,
		});

		output.writeUInt16LE(packRgb565(r, g, b), writeOffset + 6);
		writeOffset += PGS_BYTES_PER_POINT;
	}

	return {
		buffer: output,
		vertexCount,
		bounds: { min, max },
	};
}

export function parsePlyHeader(headerText: string): {
	vertexCount: number;
	properties: Map<string, PlyHeaderProperty>;
	stride: number;
} {
	const lines = headerText.split("\n");
	const properties = new Map<string, PlyHeaderProperty>();
	let vertexCount = 0;
	let offset = 0;
	let inVertexElement = false;

	for (const line of lines) {
		const parts = line.trim().split(/\s+/);
		if (parts[0] === "element") {
			inVertexElement = parts[1] === "vertex";
			if (inVertexElement) vertexCount = Number.parseInt(parts[2] ?? "0", 10);
			continue;
		}

		if (parts[0] === "property" && inVertexElement) {
			const type = parts[1] ?? "float";
			const name = parts[2];
			const size = PLY_TYPE_SIZES[type] ?? 4;
			if (name) {
				properties.set(name, { offset, size, type });
			}
			offset += size;
		}
	}

	if (!vertexCount) {
		throw new Error("PLY header is missing a vertex count");
	}

	return { vertexCount, properties, stride: offset };
}

function requiredOffset(
	properties: Map<string, PlyHeaderProperty>,
	name: string,
): number {
	const property = properties.get(name);
	if (!property) {
		throw new Error(`PLY header is missing required property: ${name}`);
	}
	return property.offset;
}

function quantize(value: number, min: number, max: number): number {
	if (max <= min) return 0;
	const normalized = (value - min) / (max - min);
	return Math.max(0, Math.min(65535, Math.round(normalized * 65535)));
}

function readColor(source: Buffer, base: number, colorInfo: PlyColorInfo) {
	if (
		colorInfo.hasSHColors &&
		colorInfo.dc0Off !== undefined &&
		colorInfo.dc1Off !== undefined &&
		colorInfo.dc2Off !== undefined
	) {
		return [
			shToByte(source.readFloatLE(base + colorInfo.dc0Off)),
			shToByte(source.readFloatLE(base + colorInfo.dc1Off)),
			shToByte(source.readFloatLE(base + colorInfo.dc2Off)),
		] as const;
	}

	if (
		colorInfo.hasRgbColors &&
		colorInfo.redOff !== undefined &&
		colorInfo.greenOff !== undefined &&
		colorInfo.blueOff !== undefined
	) {
		return [
			source.readUInt8(base + colorInfo.redOff),
			source.readUInt8(base + colorInfo.greenOff),
			source.readUInt8(base + colorInfo.blueOff),
		] as const;
	}

	return [255, 255, 255] as const;
}

function shToByte(value: number): number {
	return Math.max(0, Math.min(255, Math.round((0.5 + SH_C0 * value) * 255)));
}

function packRgb565(r: number, g: number, b: number): number {
	return ((r >> 3) << 11) | ((g >> 2) << 5) | (b >> 3);
}
