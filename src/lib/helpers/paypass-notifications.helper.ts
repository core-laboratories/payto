/**
 * Calculate notification period based on expiration date
 *
 * Logic:
 * - If expiration from now is longer than 3 days → notify 24 hours before
 * - If expiration from now is longer than 1 day → notify 2 hours before
 * - If expiration from now is longer than 6 hours → notify 1 hour before
 * - If expiration from now is longer than 1 hour → notify 30 min before
 * - If expiration from now is longer than 30 min → notify 10 min before
 * - If expiration from now is longer than 10 min → notify 5 min before
 * - If expiration from now is less than 10 min → notify 1 min before
 * - If less than 1 minute → no notification
 *
 * @param expirationDate - ISO 8601 date string or Date object
 * @returns Object with notification period in minutes, or null if no notification
 */
export function calculateNotificationPeriod(expirationDate: string | Date | null | undefined): { periodMinutes: number } | null {
	if (!expirationDate) return null;

	const expiration = new Date(expirationDate);
	if (Number.isNaN(expiration.getTime())) return null;

	const now = new Date();
	const timeUntilExpiration = expiration.getTime() - now.getTime();

	// Convert to minutes for easier comparison
	const minutesUntilExpiration = timeUntilExpiration / (1000 * 60);

	// Less than 1 minute remaining - no notification
	if (minutesUntilExpiration < 1) {
		return null;
	}

	// Less than 10 minutes - notify 1 min before
	if (minutesUntilExpiration < 10) {
		return { periodMinutes: 1 };
	}

	// Less than 30 minutes - notify 5 min before
	if (minutesUntilExpiration < 30) {
		return { periodMinutes: 5 };
	}

	// Less than 1 hour - notify 10 min before
	if (minutesUntilExpiration < 60) {
		return { periodMinutes: 10 };
	}

	// Less than 6 hours - notify 30 min before
	if (minutesUntilExpiration < 6 * 60) {
		return { periodMinutes: 30 };
	}

	// Less than 1 day - notify 1 hour before
	if (minutesUntilExpiration < 24 * 60) {
		return { periodMinutes: 60 };
	}

	// Less than 3 days - notify 2 hours before
	if (minutesUntilExpiration < 3 * 24 * 60) {
		return { periodMinutes: 2 * 60 };
	}

	// 3 days or more - notify 24 hours before
	return { periodMinutes: 24 * 60 };
}

/**
 * Calculate notification settings for Google Wallet API
 *
 * Note: Google Wallet API only supports fixed notification times:
 * - expiryNotification: sends notification 2 days before expiration
 * - upcomingNotification: sends notification 1 day before validity
 *
 * This function uses calculateNotificationPeriod to determine ideal notification time,
 * then maps it to API-supported options. We enable expiryNotification if:
 * - The calculated period would trigger within the 2-day window, OR
 * - There's at least 2 days remaining (so the 2-day notification will trigger)
 *
 * @param expirationDate - ISO 8601 date string or Date object
 * @returns Notifications object or undefined if no notification should be sent
 */
export function calculateNotifications(expirationDate: string | Date | null | undefined): { expiryNotification?: { enableNotification: boolean } } | undefined {
	if (!expirationDate) return undefined;

	const expiration = new Date(expirationDate);
	if (Number.isNaN(expiration.getTime())) return undefined;

	const now = new Date();
	const timeUntilExpiration = expiration.getTime() - now.getTime();
	const minutesUntilExpiration = timeUntilExpiration / (1000 * 60);

	// Less than 1 minute remaining - no notification
	if (minutesUntilExpiration < 1) {
		return undefined;
	}

	// Calculate ideal notification period
	const notificationPeriod = calculateNotificationPeriod(expirationDate);
	if (!notificationPeriod) {
		return undefined;
	}

	// Google Wallet API only supports expiryNotification at 2 days before expiration
	// Enable it if:
	// 1. There's at least 2 days remaining (so the notification will trigger), OR
	// 2. The ideal notification time is close to 2 days (within reasonable range)
	const twoDaysInMinutes = 2 * 24 * 60; // 2880 minutes
	const idealPeriod = notificationPeriod.periodMinutes;

	// If expiration is at least 2 days away, enable notification
	// (The API will send notification 2 days before, which is the closest we can get)
	if (minutesUntilExpiration >= twoDaysInMinutes) {
		return { expiryNotification: { enableNotification: true } };
	}

	// If ideal period is 24 hours (1440 min) and we have at least 1.5 days remaining,
	// enable notification (2-day notification will be close enough)
	if (idealPeriod === 24 * 60 && minutesUntilExpiration >= 1.5 * 24 * 60) {
		return { expiryNotification: { enableNotification: true } };
	}

	// For shorter periods, the API's 2-day notification won't work well
	// So we don't enable it
	return undefined;
}
