export const PGS_MAGIC = "PGS1";
export const PGS_VERSION = 1;
export const PGS_COLOR_RGB565 = 1;
export const PGS_HEADER_BYTES = 40;
export const PGS_BYTES_PER_POINT = 8;
export const SH_C0 = 0.28209479177387814;

export const PLY_TYPE_SIZES: Record<string, number> = {
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
