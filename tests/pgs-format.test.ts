import { describe, expect, test } from "bun:test";
import { packPlyBuffer, parsePlyHeader } from "../scripts/pgs-format";

function createSamplePlyBuffer(): Buffer {
	const header = [
		"ply",
		"format binary_little_endian 1.0",
		"element vertex 2",
		"property float x",
		"property float y",
		"property float z",
		"property float f_dc_0",
		"property float f_dc_1",
		"property float f_dc_2",
		"end_header\n",
	].join("\n");

	const stride = 24;
	const buffer = Buffer.alloc(Buffer.byteLength(header) + stride * 2);
	buffer.write(header, 0, "utf8");
	let offset = Buffer.byteLength(header);

	const vertices = [
		{ position: [0, 1, 2], sh: [0, 0, 0] },
		{ position: [4, 5, 6], sh: [1, -1, 0.5] },
	] as const;

	for (const vertex of vertices) {
		buffer.writeFloatLE(vertex.position[0], offset);
		buffer.writeFloatLE(vertex.position[1], offset + 4);
		buffer.writeFloatLE(vertex.position[2], offset + 8);
		buffer.writeFloatLE(vertex.sh[0], offset + 12);
		buffer.writeFloatLE(vertex.sh[1], offset + 16);
		buffer.writeFloatLE(vertex.sh[2], offset + 20);
		offset += stride;
	}

	return buffer;
}

describe("pgs-format", () => {
	test("parses the PLY header and packs a valid PGS buffer", () => {
		const plyBuffer = createSamplePlyBuffer();
		const headerText = plyBuffer
			.subarray(0, plyBuffer.indexOf("end_header\n"))
			.toString("utf8");

		const header = parsePlyHeader(headerText);
		expect(header.vertexCount).toBe(2);
		expect(header.stride).toBe(24);

		const packed = packPlyBuffer(plyBuffer);
		expect(packed.vertexCount).toBe(2);
		expect(packed.bounds.min).toEqual([0, 1, 2]);
		expect(packed.bounds.max).toEqual([4, 5, 6]);
		expect(packed.buffer.subarray(0, 4).toString("ascii")).toBe("PGS1");

		const firstColor = packed.buffer.readUInt16LE(46);
		const secondColor = packed.buffer.readUInt16LE(54);
		expect(firstColor).toBe(
			((128 >> 3) << 11) | ((128 >> 2) << 5) | (128 >> 3),
		);
		expect(secondColor).not.toBe(firstColor);
	});
});
