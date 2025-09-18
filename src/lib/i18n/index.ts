import { init, locale, addMessages } from 'svelte-i18n';
import { locales } from './locales';

// Initialize i18n with browser locale detection
init({
	fallbackLocale: 'en',
	initialLocale: typeof window !== 'undefined' ? (navigator.language || 'en') : 'en',
	loadingDelay: 200
});

// Register all locales
Object.entries(locales).forEach(([localeCode, messages]) => {
	addMessages(localeCode, messages);
});

// Auto-detect and set browser locale on client side
if (typeof window !== 'undefined') {
	detectAndSetBrowserLocale();
}

// Function to get the best matching locale
export function getBestLocale(requestedLocale: string | undefined): string {
	if (!requestedLocale) return 'en';

	// Try exact match first (full locale)
	if (requestedLocale in locales) {
		return requestedLocale;
	}

	// Try language-region match and fall back to base language
	const languageCode = requestedLocale.substring(0, 2).toLowerCase();
	if (languageCode in locales) {
		return languageCode;
	}

	// Default fallback
	return 'en';
}

// Function to set locale based on paytoData language
export async function setLocaleFromPaytoData(language: string | undefined) {
	if (!language) return;

	const bestLocale = getBestLocale(language);
	await locale.set(bestLocale);
}

// Function to detect and set browser locale
export function detectAndSetBrowserLocale() {
	if (typeof window !== 'undefined') {
		const browserLocale = navigator.language || navigator.languages?.[0] || 'en';
		const bestLocale = getBestLocale(browserLocale);
		locale.set(bestLocale);
		return bestLocale;
	}
	return 'en';
}

// Export the locale instance for use in components
export { locale };
