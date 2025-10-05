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
