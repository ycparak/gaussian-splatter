import {
	PGS_COLOR_RGB565,
	PGS_HEADER_BYTES,
	PGS_MAGIC,
	PGS_VERSION,
	PLY_TYPE_SIZES,
	SH_C0,
} from "@/shared/pgs";
import type { ParsedPointAsset } from "@/shared/types";

export interface ParsedPlyHeader {
	vertexCount: number;
	properties: Map<string, number>;
	stride: number;
}

const PLY_HEADER_END = "end_header\n";

export function parsePointAsset(buffer: ArrayBuffer): ParsedPointAsset {
	return isPgs(buffer) ? parsePgsAsset(buffer) : parsePlyAsset(buffer);
}

export function parsePgsAsset(buffer: ArrayBuffer): ParsedPointAsset {
	const dataView = new DataView(buffer);
	const magic = new TextDecoder().decode(new Uint8Array(buffer, 0, 4));
	const version = dataView.getUint32(4, true);
	const vertexCount = dataView.getUint32(8, true);
	const colorMode = dataView.getUint8(12);

	if (magic !== PGS_MAGIC) {
		throw new Error("Unsupported PGS magic header");
	}

	if (version !== PGS_VERSION) {
		throw new Error(`Unsupported PGS version: ${version}`);
	}

	if (colorMode !== PGS_COLOR_RGB565) {
		throw new Error(`Unsupported PGS color mode: ${colorMode}`);
	}

	const min = [
		dataView.getFloat32(16, true),
		dataView.getFloat32(20, true),
		dataView.getFloat32(24, true),
	] as const;
	const max = [
		dataView.getFloat32(28, true),
		dataView.getFloat32(32, true),
		dataView.getFloat32(36, true),
	] as const;

	const positions = new Float32Array(vertexCount * 3);
	const colors = new Float32Array(vertexCount * 3);
	let offset = PGS_HEADER_BYTES;

	for (let index = 0; index < vertexCount; index++) {
		const i3 = index * 3;
		const qx = dataView.getUint16(offset, true);
		const qy = dataView.getUint16(offset + 2, true);
		const qz = dataView.getUint16(offset + 4, true);
		const rgb565 = dataView.getUint16(offset + 6, true);

		positions[i3] = unquantize(qx, min[0], max[0]);
		positions[i3 + 1] = unquantize(qy, min[1], max[1]);
		positions[i3 + 2] = unquantize(qz, min[2], max[2]);

		colors[i3] = ((rgb565 >> 11) & 0x1f) / 31;
		colors[i3 + 1] = ((rgb565 >> 5) & 0x3f) / 63;
		colors[i3 + 2] = (rgb565 & 0x1f) / 31;
		offset += 8;
	}

	return { positions, colors, vertexCount };
}

export function parsePlyAsset(buffer: ArrayBuffer): ParsedPointAsset {
	const headerEnd = findPlyHeaderEnd(buffer);
	const headerText = new TextDecoder().decode(
		new Uint8Array(buffer, 0, headerEnd),
	);
	const dataStart = headerEnd + PLY_HEADER_END.length;
	const { vertexCount, properties, stride } = parsePlyHeader(headerText);
	const dataView = new DataView(buffer, dataStart);
	const positions = new Float32Array(vertexCount * 3);
	const colors = new Float32Array(vertexCount * 3);

	const xOff = properties.get("x");
	const yOff = properties.get("y");
	const zOff = properties.get("z");
	const dc0Off = properties.get("f_dc_0");
	const dc1Off = properties.get("f_dc_1");
	const dc2Off = properties.get("f_dc_2");
	const hasSHColors =
		dc0Off !== undefined && dc1Off !== undefined && dc2Off !== undefined;

	if (xOff === undefined || yOff === undefined || zOff === undefined) {
		throw new Error("PLY header is missing required position properties");
	}

	for (let index = 0; index < vertexCount; index++) {
		const base = index * stride;
		const i3 = index * 3;
		positions[i3] = dataView.getFloat32(base + xOff, true);
		positions[i3 + 1] = dataView.getFloat32(base + yOff, true);
		positions[i3 + 2] = dataView.getFloat32(base + zOff, true);

		if (
			hasSHColors &&
			dc0Off !== undefined &&
			dc1Off !== undefined &&
			dc2Off !== undefined
		) {
			const r = dataView.getFloat32(base + dc0Off, true);
			const g = dataView.getFloat32(base + dc1Off, true);
			const b = dataView.getFloat32(base + dc2Off, true);
			colors[i3] = Math.max(0, Math.min(1, 0.5 + SH_C0 * r));
			colors[i3 + 1] = Math.max(0, Math.min(1, 0.5 + SH_C0 * g));
			colors[i3 + 2] = Math.max(0, Math.min(1, 0.5 + SH_C0 * b));
		} else {
			colors[i3] = 1;
			colors[i3 + 1] = 1;
			colors[i3 + 2] = 1;
		}
	}

	return { positions, colors, vertexCount };
}

export function parsePlyHeader(headerText: string): ParsedPlyHeader {
	const lines = headerText.split("\n");
	let vertexCount = 0;
	const properties = new Map<string, number>();
	let offset = 0;
	let inVertexElement = false;

	for (const line of lines) {
		const parts = line.trim().split(/\s+/);
		if (parts[0] === "element") {
			if (parts[1] === "vertex") {
				vertexCount = Number.parseInt(parts[2] ?? "0", 10);
				inVertexElement = true;
			} else {
				inVertexElement = false;
			}
		}

		if (parts[0] === "property" && inVertexElement) {
			const type = parts[1];
			const name = parts[2];
			const size = type ? (PLY_TYPE_SIZES[type] ?? 4) : 4;
			if (name) {
				properties.set(name, offset);
			}
			offset += size;
		}
	}

	return { vertexCount, properties, stride: offset };
}

export function resamplePointAsset(
	data: ParsedPointAsset,
	vertexCount: number,
): ParsedPointAsset {
	if (data.vertexCount === vertexCount) return data;

	const positions = new Float32Array(vertexCount * 3);
	const colors = new Float32Array(vertexCount * 3);

	for (let index = 0; index < vertexCount; index++) {
		const sourceIndex = Math.floor((index / vertexCount) * data.vertexCount);
		const sourceI3 = sourceIndex * 3;
		const i3 = index * 3;
		positions[i3] = data.positions[sourceI3] ?? 0;
		positions[i3 + 1] = data.positions[sourceI3 + 1] ?? 0;
		positions[i3 + 2] = data.positions[sourceI3 + 2] ?? 0;
		colors[i3] = data.colors[sourceI3] ?? 0;
		colors[i3 + 1] = data.colors[sourceI3 + 1] ?? 0;
		colors[i3 + 2] = data.colors[sourceI3 + 2] ?? 0;
	}

	return { positions, colors, vertexCount };
}

function isPgs(buffer: ArrayBuffer): boolean {
	const bytes = new Uint8Array(buffer, 0, 4);
	return (
		bytes[0] === 0x50 &&
		bytes[1] === 0x47 &&
		bytes[2] === 0x53 &&
		bytes[3] === 0x31
	);
}

function unquantize(value: number, min: number, max: number): number {
	if (max <= min) return min;
	return min + (value / 65535) * (max - min);
}

function findPlyHeaderEnd(buffer: ArrayBuffer): number {
	const bytes = new Uint8Array(buffer);

	for (let index = 0; index < Math.min(bytes.length, 4096); index++) {
		let isMatch = true;
		for (let offset = 0; offset < PLY_HEADER_END.length; offset++) {
			if (bytes[index + offset] !== PLY_HEADER_END.charCodeAt(offset)) {
				isMatch = false;
				break;
			}
		}

		if (isMatch) {
			return index;
		}
	}

	throw new Error("Could not find PLY header end");
}
