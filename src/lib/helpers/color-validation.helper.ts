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
	const colorB = design?.colorB;
	const colorF = design?.colorF;

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

/**
 * Normalize hex color to full #RRGGBB form.
 * Supports "#RGB" and "#RRGGBB". Returns null on invalid input.
 */
function normalizeHexColor(input: string | undefined | null): string | null {
	if (!input || typeof input !== 'string') return null;

	let hex = input.trim();

	if (!hex.startsWith('#')) hex = `#${hex}`;
	if (hex.length === 4) {
		// #RGB -> #RRGGBB
		const r = hex[1];
		const g = hex[2];
		const b = hex[3];
		hex = `#${r}${r}${g}${g}${b}${b}`;
	}

	if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return null;

	return hex.toUpperCase();
}

/**
 * Invert a hex color (#RRGGBB) -> #RRGGBB.
 * Returns null if color is invalid.
 */
function invertHexColor(color: string): string | null {
	const hex = normalizeHexColor(color);
	if (!hex) return null;

	const r = 255 - parseInt(hex.slice(1, 3), 16);
	const g = 255 - parseInt(hex.slice(3, 5), 16);
	const b = 255 - parseInt(hex.slice(5, 7), 16);

	const toHex = (v: number) => v.toString(16).padStart(2, '0').toUpperCase();
	return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Calculate an automatic text color for a given background.
 *
 * - If foreground is provided and has enough distance, it's used.
 * - Otherwise, returns inverted background color.
 * - If background is missing/invalid, uses defaultBackground.
 * - If everything fails, falls back to defaultForeground.
 *
 * @param background - Background color (#RRGGBB or #RGB), optional
 * @param foreground - Preferred text color, optional
 * @param defaultBackground - Fallback background if none provided/invalid
 * @param defaultForeground - Fallback text color if all else fails
 * @returns Calculated text color as hex string (#RRGGBB)
 */
export function getAutoTextColor(
	background?: string,
	foreground?: string,
	defaultBackground: string = '#2A3950',
	defaultForeground: string = '#9AB1D6'
): string {
	const bg = normalizeHexColor(background) || normalizeHexColor(defaultBackground) || '#000000';

	// If caller provided foreground and it's sufficiently far from background, use it
	if (foreground) {
		const fgNorm = normalizeHexColor(foreground);
		if (fgNorm) {
			const distance = calculateColorDistance(bg, fgNorm);
			if (distance >= 100) {
				return fgNorm;
			}
		}
	}

	// Otherwise, use inverted background for strong contrast
	const inverted = invertHexColor(bg);
	if (inverted) {
		// This should always be max distance for valid hex,
		// but we can still keep a safety fallback.
		const distance = calculateColorDistance(bg, inverted);
		if (distance >= 100) {
			return inverted;
		}
	}

	// Final fallback
	const fallback = normalizeHexColor(defaultForeground);
	return fallback || '#FFFFFF';
}
