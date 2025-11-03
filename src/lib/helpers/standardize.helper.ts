/**
 * Standardize organization name by removing emojis
 * @param org - Organization name to standardize
 * @returns Organization name without emojis, or null if input is null/empty
 */
export function standardizeOrg(org: string | null): string | null {
	if (!org) return null;
	// Remove emojis using comprehensive Unicode ranges
	const withoutEmojis = org.replace(/[\u{1F600}-\u{1F64F}|\u{1F300}-\u{1F5FF}|\u{1F680}-\u{1F6FF}|\u{2600}-\u{26FF}|\u{2700}-\u{27BF}|\u{1F900}-\u{1F9FF}|\u{1FA00}-\u{1FAFF}]/gu, '');
	// Keep original string, just remove emojis
	return withoutEmojis || null;
}
