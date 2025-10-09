import { loadAllLocales } from './i18n-util.sync'
import { detectLocale, i18nObject, locales } from './i18n-util'
import { setLocale as setLocaleSvelte } from './i18n-svelte'
import type { Locales } from './i18n-types'

// Load all locales synchronously (only on client side to avoid SSR issues)
if (typeof window !== 'undefined') {
	loadAllLocales()
}

// Language fallback logic: en-US -> en_US -> en -> fallback to en
function getBestLocale(requestedLocale: string): Locales {
	// Normalize all hyphens to underscores for internal use
	const normalizedLocale = requestedLocale.replace(/-/g, '_');

	// If exact match found, use it
	if (locales.includes(normalizedLocale as any)) {
		return normalizedLocale as Locales;
	}

	// Extract base language (e.g., 'en' from 'en-US' or 'en_US')
	const baseLanguage = requestedLocale.split(/[-_]/)[0];

	// Check if base language exists (e.g., 'en' from 'en-US')
	if (locales.includes(baseLanguage as any)) {
		return baseLanguage as Locales;
	}

	// Fallback to English
	return 'en';
}

// Wrapper for setLocale that converts underscore locales to hyphen format for Intl APIs
function setLocale(locale: Locales): void {
	// Convert all underscores to hyphens for Intl.PluralRules compatibility
	const intlLocale = (locale as string).replace(/_/g, '-') as Locales;
	setLocaleSvelte(intlLocale);
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

// Initialize i18n
export function init(): void {
	// Set initial locale based on browser language or default to English
	if (typeof window !== 'undefined') {
		// For browser compatibility, always start with 'en' to avoid Intl.PluralRules errors
		// Then detect and set the proper locale
		setLocale('en');
		// Small delay to ensure the initial locale is set before detecting browser locale
		setTimeout(() => {
			detectAndSetBrowserLocale();
		}, 0);
	} else {
		setLocale('en');
	}
}

// Export types and functions for use in components
export type { Locales } from './i18n-types';
export { LL, locale } from './i18n-svelte';
export { setLocale };
