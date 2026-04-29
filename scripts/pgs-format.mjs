import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { gzipSync } from "node:zlib";

const MAGIC = "PGS1";
const VERSION = 1;
const COLOR_RGB565 = 1;
const HEADER_BYTES = 40;
const BYTES_PER_POINT = 8;
const SH_C0 = 0.28209479177387814;

const TYPE_SIZES = {
	float: 4,
	float32: 4,
	double: 8,
	float64: 8,
	int: 4,
	int32: 4,
	uint: 4,
	uint32: 4,
	short: 2,
	int16: 2,
	ushort: 2,
	uint16: 2,
	char: 1,
	int8: 1,
	uchar: 1,
	uint8: 1,
};

export async function packPlyFile(inputPath, outputPath) {
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

export function packPlyBuffer(input) {
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

	const min = [Infinity, Infinity, Infinity];
	const max = [-Infinity, -Infinity, -Infinity];

	for (let i = 0; i < vertexCount; i++) {
		const base = dataStart + i * stride;
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

	const output = Buffer.alloc(HEADER_BYTES + vertexCount * BYTES_PER_POINT);
	output.write(MAGIC, 0, "ascii");
	output.writeUInt32LE(VERSION, 4);
	output.writeUInt32LE(vertexCount, 8);
	output.writeUInt8(COLOR_RGB565, 12);

	for (let i = 0; i < 3; i++) {
		output.writeFloatLE(min[i], 16 + i * 4);
		output.writeFloatLE(max[i], 28 + i * 4);
	}

	let writeOffset = HEADER_BYTES;
	for (let i = 0; i < vertexCount; i++) {
		const base = dataStart + i * stride;
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
		writeOffset += BYTES_PER_POINT;
	}

	return {
		buffer: output,
		vertexCount,
		bounds: { min, max },
	};
}

function parsePlyHeader(headerText) {
	const lines = headerText.split("\n");
	const properties = new Map();
	let vertexCount = 0;
	let offset = 0;
	let inVertexElement = false;

	for (const line of lines) {
		const parts = line.trim().split(/\s+/);
		if (parts[0] === "element") {
			inVertexElement = parts[1] === "vertex";
			if (inVertexElement) vertexCount = parseInt(parts[2], 10);
			continue;
		}

		if (parts[0] === "property" && inVertexElement) {
			const type = parts[1];
			const name = parts[2];
			const size = TYPE_SIZES[type] ?? 4;
			properties.set(name, { offset, size, type });
			offset += size;
		}
	}

	if (!vertexCount) {
		throw new Error("PLY header is missing a vertex count");
	}

	return { vertexCount, properties, stride: offset };
}

function requiredOffset(properties, name) {
	const property = properties.get(name);
	if (!property) {
		throw new Error(`PLY header is missing required property: ${name}`);
	}
	return property.offset;
}

function quantize(value, min, max) {
	if (max <= min) return 0;
	const normalized = (value - min) / (max - min);
	return Math.max(0, Math.min(65535, Math.round(normalized * 65535)));
}

function readColor(source, base, colorInfo) {
	if (colorInfo.hasSHColors) {
		return [
			shToByte(source.readFloatLE(base + colorInfo.dc0Off)),
			shToByte(source.readFloatLE(base + colorInfo.dc1Off)),
			shToByte(source.readFloatLE(base + colorInfo.dc2Off)),
		];
	}

	if (colorInfo.hasRgbColors) {
		return [
			source.readUInt8(base + colorInfo.redOff),
			source.readUInt8(base + colorInfo.greenOff),
			source.readUInt8(base + colorInfo.blueOff),
		];
	}

	return [255, 255, 255];
}

function shToByte(value) {
	return Math.max(0, Math.min(255, Math.round((0.5 + SH_C0 * value) * 255)));
}

function packRgb565(r, g, b) {
	return ((r >> 3) << 11) | ((g >> 2) << 5) | (b >> 3);
}
