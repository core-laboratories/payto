import type { Locales } from '$i18n/i18n-types';
import type { BaseTranslation } from '$i18n/i18n-types';

import en from '$i18n/en/index';
import ar from '$i18n/ar/index';
import cs_CZ from '$i18n/cs_CZ/index';
import de from '$i18n/de/index';
import es from '$i18n/es/index';
import fa_IR from '$i18n/fa_IR/index';
import fr from '$i18n/fr/index';
import hi_IN from '$i18n/hi_IN/index';
import hu from '$i18n/hu/index';
import it from '$i18n/it/index';
import ja from '$i18n/ja/index';
import ko_KR from '$i18n/ko_KR/index';
import pl from '$i18n/pl/index';
import pt_BR from '$i18n/pt_BR/index';
import ru from '$i18n/ru/index';
import sk from '$i18n/sk/index';
import th from '$i18n/th/index';
import tl_PH from '$i18n/tl_PH/index';
import tr from '$i18n/tr/index';
import vi_VN from '$i18n/vi_VN/index';
import zh_CN from '$i18n/zh_CN/index';

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

function mapGoogleWalletToLocale(locale: string): Locales | undefined {
	const normalized = locale.replace(/-/g, '_') as Locales;
	return translationsByLocale[normalized] ? normalized : undefined;
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
const translationsByLocale: Record<Locales, BaseTranslation> = {
	en,
	ar,
	cs_CZ,
	de,
	es,
	fa_IR,
	fr,
	hi_IN,
	hu,
	it,
	ja,
	ko_KR,
	pl,
	pt_BR,
	ru,
	sk,
	th,
	tl_PH,
	tr,
	vi_VN,
	zh_CN
};

export function getPaypassLocalizedString(keyPath: string): LocalizedText | undefined {
	let defaultValue: string | undefined;
	let defaultLanguage: string | undefined;
	const translatedValues: Record<string, string> = {};

	// 1) Prefer English as the default, if it exists
	const englishValue = getNestedValue(en, keyPath);
	if (englishValue) {
		defaultValue = englishValue;
		defaultLanguage = mapLocaleToGoogleWallet('en' as Locales);
	}

	// 2) Collect values for all locales (including English to ensure coverage)
	for (const [locale, translationRoot] of Object.entries(translationsByLocale) as [Locales, BaseTranslation][]) {
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

export function getPaypassLocalizedValueForLocale(keyPath: string, locale: string): string | null {
	const localesToTry: Locales[] = [];

	const mapped = mapGoogleWalletToLocale(locale);
	if (mapped) {
		localesToTry.push(mapped);
	}

	if (!localesToTry.includes('en')) {
		localesToTry.push('en');
	}

	for (const loc of localesToTry) {
		const translationRoot = translationsByLocale[loc];
		const value = getNestedValue(translationRoot, keyPath);
		if (value) {
			return value;
		}
	}

	return null;
}
