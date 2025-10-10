// Helper types for deep partial merging
export type DeepPartial<T> = {
	[P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// Deep merge function for translation dictionaries
export function deepMergeDict<T extends Record<string, any>>(target: T, source: DeepPartial<T>): T {
	const result = { ...target };

	for (const key in source) {
		if (source.hasOwnProperty(key)) {
			const sourceValue = source[key];
			const targetValue = target[key];

			if (sourceValue && typeof sourceValue === 'object' && !Array.isArray(sourceValue)) {
				// Recursively merge nested objects
				result[key] = deepMergeDict(targetValue || ({} as any), sourceValue as any);
			} else {
				// Use source value if provided, otherwise keep target value
				result[key] = sourceValue !== undefined ? (sourceValue as any) : targetValue;
			}
		}
	}

	return result;
}

// Determine if a locale uses RTL (right-to-left) script direction
export function isRtlLanguage(locale?: string): boolean {
	const currentLocale = locale || (typeof navigator !== 'undefined' ? navigator.language : 'en');

	// Languages that use RTL script direction
	const rtlLanguages = ['ar', 'fa', 'ur', 'he', 'yi', 'ps', 'sd', 'ks', 'ku', 'dv'];

	const languageCode = currentLocale.split('-')[0].toLowerCase();
	return rtlLanguages.includes(languageCode);
}

// Determine the appropriate numbering system for a locale
export function getNumberingSystem(locale?: string): 'arab' | 'latn' {
	const currentLocale = locale || (typeof navigator !== 'undefined' ? navigator.language : 'en');

	// Languages that use Arabic-Indic numerals
	const arabicNumeralLanguages = ['ar', 'fa', 'ur', 'ps', 'sd', 'ks', 'ku', 'dv'];

	const languageCode = currentLocale.split('-')[0].toLowerCase();
	return arabicNumeralLanguages.includes(languageCode) ? 'arab' : 'latn';
}

// Format numbers into localized value
export function formatLocalizedNumber(value: number, locale?: string): string {
	const currentLocale = locale || (typeof navigator !== 'undefined' ? navigator.language : 'en');

	return new Intl.NumberFormat(currentLocale, {
		numberingSystem: getNumberingSystem(currentLocale)
	}).format(value);
}

// Format recurring symbols with localized numbers
// Input formats: 'd', 'm', 'y', '2d', '3m', '7d', etc.
// Output: localized number + translated period symbol
export function formatRecurringSymbol(
	symbol: string,
	locale?: string,
	translations?: { day: string; week: string; month: string; year: string }
): string {
	const currentLocale = locale || (typeof navigator !== 'undefined' ? navigator.language : 'en');

	// Default translations (fallback to English abbreviations)
	const defaultTranslations = {
		day: 'd',
		week: 'w',
		month: 'm',
		year: 'y'
	};

	const trans = translations || defaultTranslations;

	// Extract number prefix and period type
	const match = symbol.toLowerCase().match(/^(\d+)?([dwmy])$/);

	if (!match) {
		return symbol; // Return as-is if format doesn't match
	}

	const [, numberPrefix, periodType] = match;

	// Get the appropriate translation based on period type
	const periodSymbol = periodType === 'd' ? trans.day : periodType === 'w' ? trans.week : periodType === 'm' ? trans.month : trans.year;

	// If there's a number prefix, format it with locale
	if (numberPrefix) {
		const localizedNumber = formatLocalizedNumber(parseInt(numberPrefix, 10), currentLocale);
		return `${localizedNumber}${periodSymbol}`;
	}

	// Just return the period symbol if no number prefix
	return periodSymbol;
}
