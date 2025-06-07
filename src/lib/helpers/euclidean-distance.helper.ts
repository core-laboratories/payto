interface IRGB {
	r: number;
	g: number;
	b: number;
}

/**
 * Converts a HEX color string to an RGB object.
 * @param {string} hex - HEX color string.
 * @returns {IRGB} RGB color object.
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
	const bigint = parseInt(hex.slice(1), 16);
	return {
		r: (bigint >> 16) & 255,
		g: (bigint >> 8) & 255,
		b: bigint & 255,
	};
}

/**
 * Calculates the Euclidean distance between two HEX color values.
 * @param {string} color1 - First HEX color string.
 * @param {string} color2 - Second HEX color string.
 * @returns {number} The Euclidean distance between the two colors.
 */
export const calculateColorDistance = (color1: string, color2: string): number => {
	const rgb1 = hexToRgb(color1);
	const rgb2 = hexToRgb(color2);

	return Math.sqrt(
		Math.pow(rgb1.r - rgb2.r, 2) +
		Math.pow(rgb1.g - rgb2.g, 2) +
		Math.pow(rgb1.b - rgb2.b, 2)
	);
}
