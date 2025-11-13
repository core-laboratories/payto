import type { Locales } from '$i18n/i18n-types';
import { loadAllLocales } from '$i18n/i18n-util.sync';
import { loadedLocales, locales } from '$i18n/i18n-util';
import en from '$i18n/en/index';

export type LocalizedText = {
	/**
	 * Text to use when no locale-specific override matches.
	 * Usually the English string, but can be any language if
	 * English is missing for the key.
	 */
	defaultValue: string;

	/**
	 * BCP-47 (Google Wallet style) language tag for defaultValue.
	 * Example: "en", "en-US", "sk", "cs-CZ"
	 */
	defaultLanguage: string;

	/**
	 * Language → string overrides for all other locales that differ
	 * from defaultValue.
	 */
	translatedValues?: Record<string, string>;
};

/**
 * Map locale codes from typesafe-i18n to Google Wallet style.
 *
 * - typesafe-i18n: "en", "en_US", "sk", "cs_CZ"
 * - Google Wallet: "en", "en-US", "sk", "cs-CZ"
 */
function mapLocaleToGoogleWallet(locale: Locales): string {
	return locale.replace(/_/g, '-');
}

/**
 * Safely read a nested property using a dot-separated path.
 *
 * Example:
 *   getNestedValue(obj, "paypass.network")
 */
function getNestedValue(obj: unknown, path: string): string | undefined {
	if (!obj) return undefined;

	const keys = path.split('.');
	let current: unknown = obj;

	for (const key of keys) {
		if (current && typeof current === 'object' && key in (current as Record<string, unknown>)) {
			current = (current as Record<string, unknown>)[key];
		} else {
            // Key not found on this branch
			return undefined;
		}
	}

	return typeof current === 'string' ? current : undefined;
}

/**
 * Build a LocalizedText structure for a given i18n key path.
 *
 * - Prefer English as the default language if it exists.
 * - Otherwise, use the first locale that has a translation.
 * - translatedValues contains only entries that actually differ
 *   from defaultValue (so we don’t duplicate English).
 */
export function getPaypassLocalizedString(keyPath: string): LocalizedText | undefined {
	// Ensure all locales are loaded
	loadAllLocales();

	let defaultValue: string | undefined;
	let defaultLanguage: string | undefined;
	const translatedValues: Record<string, string> = {};

	// 1) Prefer English as the default, if it exists
	const englishValue = getNestedValue(en, keyPath);
	if (englishValue) {
		defaultValue = englishValue;
		defaultLanguage = mapLocaleToGoogleWallet('en' as Locales);
	}

	// 2) Collect values for all locales
	for (const locale of locales) {
		const translationRoot = loadedLocales[locale];
		if (!translationRoot) continue;

		const value = getNestedValue(translationRoot, keyPath);
		if (!value) continue;

		const gwLocale = mapLocaleToGoogleWallet(locale);

		// If we don’t yet have a default, take the first non-empty one
		if (!defaultValue) {
			defaultValue = value;
			defaultLanguage = gwLocale;
			continue;
		}

		// Skip English, since it’s our default
		if (locale === 'en') continue;

		// Only store if it actually differs from the default text
		if (value !== defaultValue) {
			translatedValues[gwLocale] = value;
		}
	}

	if (!defaultValue || !defaultLanguage) {
		// Key doesn’t exist in any loaded locale
		return undefined;
	}

	return {
		defaultValue,
		defaultLanguage,
		...(Object.keys(translatedValues).length > 0 ? { translatedValues } : {})
	};
}
