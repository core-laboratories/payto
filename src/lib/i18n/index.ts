import { init, locale, addMessages } from 'svelte-i18n';
import { locales } from './locales';

// Initialize i18n with English as default (no browser detection)
init({
	fallbackLocale: 'en',
	initialLocale: 'en',
	loadingDelay: 200
});

// Register all locales
Object.entries(locales).forEach(([localeCode, messages]) => {
	addMessages(localeCode, messages);
});

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

// Export the locale instance for use in components
export { locale };
