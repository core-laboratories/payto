import { loadAllLocales } from './i18n-util.sync'
import { detectLocale, i18nObject, locales } from './i18n-util'
import { setLocale as setLocaleSvelte } from './i18n-svelte'
import type { Locales } from './i18n-types'

// Monkey-patch Intl.PluralRules to accept underscore locales (only on client side)
if (typeof window !== 'undefined' && typeof Intl !== 'undefined') {
	const OriginalPluralRules = Intl.PluralRules;
	(Intl as any).PluralRules = class extends OriginalPluralRules {
		constructor(locales?: string | string[], options?: Intl.PluralRulesOptions) {
			// Convert underscores to hyphens for locale tags
			const normalizedLocales = locales
				? (typeof locales === 'string' ? locales.replace(/_/g, '-') : locales.map(l => l.replace(/_/g, '-')))
				: locales;
			super(normalizedLocales, options);
		}
	};
	// Preserve static methods
	(Intl.PluralRules as any).supportedLocalesOf = OriginalPluralRules.supportedLocalesOf.bind(OriginalPluralRules);
}

// Load all locales synchronously (only on client side to avoid SSR issues)
if (typeof window !== 'undefined') {
	loadAllLocales()
}

// Language fallback logic: ko-KR -> ko_KR -> ko -> en (fallback)
function getBestLocale(requestedLocale: string): Locales {
	// Convert hyphens to underscores for internal locale lookup
	const normalizedLocale = requestedLocale.replace(/-/g, '_');

	// If exact match found, use it (e.g., ko_KR, zh_CN)
	if (locales.includes(normalizedLocale as any)) {
		return normalizedLocale as Locales;
	}

	// Extract base language (e.g., 'ko' from 'ko-KR' or 'ko_KR')
	const baseLanguage = normalizedLocale.split('_')[0];

	// Check if base language exists (e.g., 'ko')
	if (locales.includes(baseLanguage as any)) {
		return baseLanguage as Locales;
	}

	// Fallback to English
	return 'en';
}

// Wrapper for setLocale
function setLocale(locale: Locales): void {
	setLocaleSvelte(locale);
}

// Function to get translation with fallback to English
export function getTranslationWithFallback<T extends keyof any>(
	locale: Locales,
	key: T,
	translationFunction: () => string
): string {
	const translation = translationFunction();

	// If translation is missing (returns the key itself), fallback to English
	if (locale !== 'en' && translation === String(key)) {
		const englishLL = i18nObject('en');
		// Get the English translation by accessing the same path
		const englishTranslation = (englishLL as any)[key]?.();
		return englishTranslation || translation;
	}

	return translation;
}

// Set locale from paytoData
export function setLocaleFromPaytoData(language?: string): void {
	localeExplicitlySet = true; // Mark that locale was explicitly set
	if (language && language !== '') {
		const bestLocale = getBestLocale(language);
		setLocale(bestLocale);
	} else {
		setLocale('en');
	}
}

// Detect browser locale and set it
export function detectAndSetBrowserLocale(): void {
	if (typeof window !== 'undefined' && navigator.language) {
		const browserLocale = navigator.language;
		const bestLocale = getBestLocale(browserLocale);
		setLocale(bestLocale);
	} else {
		setLocale('en');
	}
}

// Track if a locale was explicitly set (don't override with browser locale)
let localeExplicitlySet = false;

// Initialize i18n
export function init(): void {
	// Set initial locale based on browser language or default to English
	if (typeof window !== 'undefined') {
		// Only set default locale if one wasn't explicitly set
		if (!localeExplicitlySet) {
			// For browser compatibility, always start with 'en' to avoid Intl.PluralRules errors
			// Then detect and set the proper locale
			setLocale('en');
			// Small delay to ensure the initial locale is set before detecting browser locale
			setTimeout(() => {
				if (!localeExplicitlySet) {
					detectAndSetBrowserLocale();
				}
			}, 0);
		}
	} else {
		if (!localeExplicitlySet) {
			setLocale('en');
		}
	}
}

// Export types and functions for use in components
export type { Locales } from './i18n-types';
export { LL, locale } from './i18n-svelte';
export { setLocale };
