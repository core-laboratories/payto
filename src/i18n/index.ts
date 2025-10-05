import { loadAllLocales } from './i18n-util.sync'
import { detectLocale, i18nObject } from './i18n-util'
import { setLocale } from './i18n-svelte'
import type { Locales } from './i18n-types'

// Load all locales synchronously
loadAllLocales()

// Language fallback logic: en_US -> en -> fallback to en
function getBestLocale(requestedLocale: string): Locales {
	// If exact match found, use it
	if (requestedLocale === 'en_US' || requestedLocale === 'en' || requestedLocale === 'sk' || requestedLocale === 'de') {
		return requestedLocale as Locales;
	}

	// Extract base language (e.g., 'en' from 'en_US')
	const baseLanguage = requestedLocale.split('_')[0];

	// Check if base language exists (e.g., 'en' from 'en_US')
	if (baseLanguage === 'en' || baseLanguage === 'sk' || baseLanguage === 'de') {
		return baseLanguage as Locales;
	}

	// Fallback to English
	return 'en';
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
	if (language) {
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
		detectAndSetBrowserLocale();
	} else {
		setLocale('en');
	}
}

// Export types and functions for use in components
export type { Locales } from './i18n-types';
export { LL, locale, setLocale } from './i18n-svelte';
