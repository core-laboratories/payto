import type { Locales } from '$i18n/i18n-types';
import { loadAllLocales } from '$i18n/i18n-util.sync';
import { loadedLocales, locales } from '$i18n/i18n-util';
import en from '$i18n/en/index';

type LocalizedText = {
	defaultValue: string;
	defaultLanguage: string;
	translatedValues?: Record<string, string>;
};

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
 * @param path - Dot-separated path (e.g., 'paypass.address')
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
 * Get Google Wallet LocalizedString-friendly shape from i18n translations
 *
 * This function loads all locale translations and collects values for the given key path.
 * It returns an object with:
 *  - defaultValue: the text in the default language (prefer English if available)
 *  - defaultLanguage: the language code (Google Wallet format) for defaultValue
 *  - translatedValues: a map of language -> value for all other locales that differ
 *
 * @param keyPath - Dot-separated path to the translation key (e.g., 'paypass.address')
 * @returns { defaultValue, defaultLanguage, translatedValues? } or undefined if key not found
 */
export function getPaypassLocalizedString(keyPath: string): LocalizedText | undefined {
	// Ensure all locales are loaded
	loadAllLocales();

	let defaultValue: string | undefined;
	let defaultLanguage: string | undefined;
	const translatedValues: Record<string, string> = {};

	// Prefer English as default if available
	const englishValue = getNestedValue(en, keyPath);
	if (englishValue) {
		defaultValue = englishValue;
		defaultLanguage = mapLocaleToGoogleWallet('en' as Locales);
	}

	for (const locale of locales) {
		const translation = loadedLocales[locale];
		if (!translation) continue;

		const value = getNestedValue(translation, keyPath);
		if (!value) continue;

		const googleLocale = mapLocaleToGoogleWallet(locale);

		// If we don't have a defaultValue yet, use the first found translation
		if (!defaultValue) {
			defaultValue = value;
			defaultLanguage = googleLocale;
			continue;
		}

		// If this is 'en' and we already set defaultValue from 'en', skip
		if (locale === 'en') continue;

		// Only include if different from defaultValue (avoid duplicates)
		if (value !== defaultValue) {
			translatedValues[googleLocale] = value;
		}
	}

	if (!defaultValue || !defaultLanguage) {
		return undefined;
	}

	return {
		defaultValue,
		defaultLanguage,
		...(Object.keys(translatedValues).length > 0 ? { translatedValues } : {})
	};
}
