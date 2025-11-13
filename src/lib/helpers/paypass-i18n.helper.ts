import type { Locales } from '$i18n/i18n-types';
import { loadAllLocales } from '$i18n/i18n-util.sync';
import { loadedLocales, locales } from '$i18n/i18n-util';
import en from '$i18n/en/index';

/**
 * Map locale codes from typesafe-i18n format to Google Wallet format
 * Google Wallet uses ISO 639-1 language codes with ISO 3166-1 country codes (e.g., 'en-US', 'de', 'cs-CZ')
 */
function mapLocaleToGoogleWallet(locale: Locales): string {
	// Convert underscore to hyphen for Google Wallet format
	return locale.replace(/_/g, '-');
}

/**
 * Get nested value from an object using a dot-separated path
 * @param obj - Object to traverse
 * @param path - Dot-separated path (e.g., 'paypass.welcome.header')
 * @returns The value at the path, or undefined if not found
 */
function getNestedValue(obj: any, path: string): string | undefined {
	const keys = path.split('.');
	let current = obj;

	for (const key of keys) {
		if (current && typeof current === 'object' && key in current) {
			current = current[key];
		} else {
			return undefined;
		}
	}

	return typeof current === 'string' ? current : undefined;
}

/**
 * Get Google Wallet LocalizedString from i18n translations
 *
 * This function loads all locale translations and collects values for the given key path.
 * It returns a LocalizedString object with defaultValue (string) and translatedValues
 * for all languages that have the translation.
 *
 * @param keyPath - Dot-separated path to the translation key (e.g., 'paypass.address')
 * @returns LocalizedString object with defaultValue (string) and translatedValues, or undefined if key not found
 *
 * @example
 * // Returns format for textModulesData:
 * // {
 * //   defaultValue: "Welcome",
 * //   translatedValues: {
 * //     "de": "Willkommen",
 * //     "fr": "Bienvenue"
 * //   }
 * // }
 */
export function getPaypassLocalizedString(keyPath: string): {
	defaultValue: string;
	translatedValues?: Record<string, string>;
} | undefined {
	// Ensure all locales are loaded
	loadAllLocales();

	// Find the first available translation (prefer English, but use any if English doesn't have it)
	let defaultValue: string | undefined;
	const translatedValues: Record<string, string> = {};

	// First, try to get English as defaultValue
	const englishValue = getNestedValue(en, keyPath);
	if (englishValue) {
		defaultValue = englishValue;
	}

	// Collect translations from all locales
	for (const locale of locales) {
		const translation = loadedLocales[locale];
		if (!translation) continue;

		const value = getNestedValue(translation, keyPath);
		if (!value) continue; // Skip locales that don't have this translation

		const googleLocale = mapLocaleToGoogleWallet(locale);

		// If we don't have a defaultValue yet, use this as the first available
		if (!defaultValue) {
			defaultValue = value;
		} else {
			// If this is English and we already have a defaultValue, skip it
			if (locale === 'en') continue;

			// Only include if different from defaultValue (avoid duplicates)
			if (value !== defaultValue) {
				translatedValues[googleLocale] = value;
			}
		}
	}

	// Return undefined if no translation found at all
	if (!defaultValue) {
		return undefined;
	}

	return {
		defaultValue,
		...(Object.keys(translatedValues).length > 0 ? { translatedValues } : {})
	};
}
