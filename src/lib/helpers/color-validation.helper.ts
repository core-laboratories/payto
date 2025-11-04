import { calculateColorDistance } from './euclidean-distance.helper';

export interface ValidColors {
	background: string;
	foreground: string;
}

/**
 * Get valid background and foreground colors based on design and KV data
 * Validates color distance if both colors are provided, otherwise applies single color without distance check
 * @param design - Design object with colorF and colorB properties
 * @param kvData - KV data with theme colors as fallback
 * @param defaultBackground - Default background color
 * @param defaultForeground - Default foreground color
 * @returns Object with validated background and foreground colors
 */
export function getValidColors(
	design: any,
	kvData: any,
	defaultBackground: string = '#2A3950',
	defaultForeground: string = '#9AB1D6'
): ValidColors {
	const colorB = design.colorB;
	const colorF = design.colorF;

	// If both colors provided, validate distance
	if (colorB && colorF) {
		const distance = calculateColorDistance(colorB, colorF);
		if (distance >= 100) {
			return {
				background: colorB,
				foreground: colorF
			};
		}
		// Distance too low, use KV or defaults
		return {
			background: kvData?.theme?.colorB || defaultBackground,
			foreground: kvData?.theme?.colorF || defaultForeground
		};
	}

	// Only background provided, use it without distance check
	if (colorB) {
		return {
			background: colorB,
			foreground: kvData?.theme?.colorF || defaultForeground
		};
	}

	// Only foreground provided, use it without distance check
	if (colorF) {
		return {
			background: kvData?.theme?.colorB || defaultBackground,
			foreground: colorF
		};
	}

	// Fall back to KV or defaults
	return {
		background: kvData?.theme?.colorB || defaultBackground,
		foreground: kvData?.theme?.colorF || defaultForeground
	};
}

/**
 * Get valid background color
 * @param design - Design object with colorF and colorB properties
 * @param kvData - KV data with theme colors as fallback
 * @param defaultColor - Default background color
 * @returns Validated background color
 */
export function getValidBackgroundColor(
	design: any,
	kvData: any,
	defaultColor: string = '#2A3950'
): string {
	return getValidColors(design, kvData, defaultColor).background;
}

/**
 * Get valid foreground color
 * @param design - Design object with colorF and colorB properties
 * @param kvData - KV data with theme colors as fallback
 * @param defaultColor - Default foreground color
 * @returns Validated foreground color
 */
export function getValidForegroundColor(
	design: any,
	kvData: any,
	defaultColor: string = '#9AB1D6'
): string {
	return getValidColors(design, kvData, undefined, defaultColor).foreground;
}
