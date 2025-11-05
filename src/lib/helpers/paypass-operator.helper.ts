import ExchNumberFormat from 'exchange-rounding';
import forge from 'node-forge';
// @ts-ignore
import OpenLocationCode from 'open-location-code/js/src/openlocationcode';

/**
 * Get image URLs for Apple and Google Wallet passes
 * @param kvData - KV data with icon overrides
 * @param address - Address for generating identicon
 * @param isDev - Whether in development mode
 * @param devServerUrl - Development server URL
 * @returns Object with Apple and Google Wallet image URLs
 */
export function getImageUrls(kvData: any, address: string, isDev: boolean, devServerUrl: string) {
	const baseUrl = isDev ? devServerUrl : 'https://payto.money';

	return {
		// Apple Wallet images (packed in zip)
		apple: {
			icon: kvData?.icons?.apple?.icon || `${baseUrl}/images/paypass/apple-wallet/icon.png`,
			icon2x: kvData?.icons?.apple?.icon2x || `${baseUrl}/images/paypass/apple-wallet/icon@2x.png`,
			icon3x: kvData?.icons?.apple?.icon3x || `${baseUrl}/images/paypass/apple-wallet/icon@3x.png`,
			logo: kvData?.icons?.apple?.logo || `${baseUrl}/images/paypass/apple-wallet/logo.png`,
			logo2x: kvData?.icons?.apple?.logo2x || `${baseUrl}/images/paypass/apple-wallet/logo@2x.png`,
			logo3x: kvData?.icons?.apple?.logo3x || `${baseUrl}/images/paypass/apple-wallet/logo@3x.png`
		},
		// Google Wallet images (URLs)
		google: {
			logo: kvData?.icons?.google?.logo || (address && !isDev ? `${baseUrl}/blo/${address}` : `${baseUrl}/images/paypass/google-wallet/logo.png`), //logo beside the title text
			...(kvData?.icons?.google?.icon && { icon: kvData?.icons?.google?.icon }), // icon - additional decorative image in the top left corner
			hero: kvData?.icons?.google?.hero || `${baseUrl}/images/paypass/google-wallet/hero.png`, // hero image
			fullWidth: kvData?.icons?.google?.fullWidth || `${baseUrl}/images/paypass/google-wallet/full-width.png` // full-width image - displayed at the top of the card
		}
	};
}

/**
 * Decode Plus Code (Open Location Code) to latitude and longitude
 * @param plusCode - Plus Code string
 * @returns Tuple of [latitude, longitude]
 */
export function getLocationCode(plusCode: string): [number, number] {
	// @ts-ignore
	const codeArea = OpenLocationCode.decode(plusCode);
	return [codeArea.latitudeCenter, codeArea.longitudeCenter];
}

/**
 * Get title text for PayPass
 * @param hostname - Network hostname
 * @param props - Network data properties
 * @param currency - Optional currency override
 * @returns Formatted title text
 */
export function getTitleText(hostname: string, props: any, currency?: string): string {
	const currencyValue = props.currency?.value || currency || '';
	const currencyText =
		currencyValue && currencyValue.length < 6
			? currencyValue.toUpperCase()
			: (props.network?.toUpperCase() || hostname.toUpperCase());
	const destinationText =
		props.destination?.length > 8
			? props.destination.slice(0, 4).toUpperCase() + '…' + props.destination.slice(-4).toUpperCase()
			: (props.destination?.toUpperCase() || '');
	return `${currencyText} ${destinationText}`;
}

/**
 * Get purpose text for PayPass (Pay/Donate)
 * @param design - Design object with item property
 * @param donate - Whether this is a donation
 * @returns Purpose text or undefined if no item is provided
 */
export function getPurposeText(design: any): string | undefined {
	if (design?.item) {
		return `${design.item}`;
	}
	return undefined;
}

/**
 * Get code text for PayPass (Scan/Tap)
 * @param donate - Whether this is a donation
 * @param type - Type of code (scan/nfc)
 * @returns Code text
 */
export function getCodeText(donate: boolean, type: string): string {
	const purpose = donate ? 'Donate' : 'Pay';
	if (type === 'scan') {
		return `Scan to ${purpose.toLowerCase()}`;
	} else if (type === 'nfc') {
		return `Tap to ${purpose.toLowerCase()}`;
	}
	return purpose;
}


/**
 * Get barcode configuration for Apple and Google Wallet based on selected type
 * Maps user selection to wallet-specific format requirements
 * For Google-only formats, falls back to QR Code for Apple
 * @param barcodeType - Selected barcode type
 * @param message - Barcode message/value
 * @param alternateText - Alternate text for barcode
 * @returns Barcode configuration for Apple and Google Wallet
 */
export function getBarcodeConfig(barcodeType: string, message: string, alternateText: string = 'Scan to pay') {
	const appleFormatMap: Record<string, string> = {
		'qr': 'PKBarcodeFormatQR',
		'pdf417': 'PKBarcodeFormatPDF417',
		'aztec': 'PKBarcodeFormatAztec',
		'code128': 'PKBarcodeFormatCode128'
	};

	const googleTypeMap: Record<string, string> = {
		'qr': 'qrCode',
		'pdf417': 'pdf417',
		'aztec': 'aztec',
		'code128': 'code128'
	};

	const normalizedType = barcodeType?.toLowerCase() || 'qr';

	// For Apple, fallback to QR if barcode not supported
	const appleFormat = appleFormatMap[normalizedType] || 'PKBarcodeFormatQR';

	return {
		apple: {
			format: appleFormat,
			message,
			messageEncoding: 'iso-8859-1'
		},
		google: {
			type: googleTypeMap[normalizedType] || 'qrCode',
			value: message,
			alternateText: alternateText
		}
	};
}

/**
 * Generate a token with expiration time using HMAC-SHA256
 * @param payload - Data to include in token
 * @param secret - Secret key for HMAC
 * @param expirationMinutes - Token expiration time in minutes (default: 1)
 * @returns Generated token as hex string
 */
export function generateToken(payload: any, secret: string, expirationMinutes: number = 1): string {
	const tokenData = {
		...payload,
		exp: Date.now() + (expirationMinutes * 60 * 1000)
	};
	const hmac = forge.hmac.create();
	hmac.start('sha256', secret);
	hmac.update(JSON.stringify(tokenData));
	return hmac.digest().toHex();
}

/**
 * Verify a token against payload and check expiration
 * @param token - Token to verify
 * @param payload - Expected payload data
 * @param secret - Secret key for HMAC
 * @param expirationMinutes - Token expiration time in minutes (default: 1)
 * @returns True if token is valid and not expired
 */
export function verifyToken(token: string, payload: any, secret: string, expirationMinutes: number = 1): boolean {
	const tokenData = {
		...payload,
		exp: Date.now() + (expirationMinutes * 60 * 1000)
	};
	const expectedToken = generateToken(payload, secret, expirationMinutes);

	if (token !== expectedToken) return false;
	if (tokenData.exp < Date.now()) return false;

	return true;
}

/**
 * Get formatted date/time string for file naming
 * @param includeTimezone - Whether to include timezone offset
 * @returns Formatted date/time string (e.g., "2401011230+0000")
 */
export function getFormattedDateTime(includeTimezone: boolean = true): string {
	const now = new Date();
	const formattedDateTime = now.toISOString().replace(/[-T:]/g, '').slice(2, 12);
	if (includeTimezone) {
		const offsetMinutes = now.getTimezoneOffset();
		const hours = String(Math.abs(Math.floor(offsetMinutes / 60))).padStart(2, '0');
		const minutes = String(Math.abs(offsetMinutes % 60)).padStart(2, '0');
		const sign = offsetMinutes > 0 ? '-' : '+';
		const timezoneOffset = `${sign}${hours}${minutes}`;
		return `${formattedDateTime}${timezoneOffset}`;
	}
	return formattedDateTime;
}

/**
 * Generate a file ID from array of strings with optional date/time
 * @param arr - Array of strings to join
 * @param delimiter - Delimiter for joining (default: '_')
 * @param includeDate - Whether to include date/time (default: true)
 * @param includeTimezone - Whether to include timezone in date/time (default: true)
 * @returns Formatted file ID string
 */
export function getFileId(arr: string[], delimiter: string = '_', includeDate: boolean = true, includeTimezone: boolean = true): string {
	return arr.join(delimiter) + (includeDate ? (includeTimezone ? `${delimiter}${getFormattedDateTime()}` : `${delimiter}${getFormattedDateTime(false)}`) : '');
}

/**
 * Create a currency formatter
 * @param currency - Currency code
 * @param format - Locale format string
 * @param customCurrencyData - Custom currency data
 * @returns ExchNumberFormat instance
 */
export function formatter(currency: string | undefined, format: string | undefined, customCurrencyData = {}) {
	return new ExchNumberFormat(format, {
		style: 'currency',
		currency: currency || '',
		currencyDisplay: 'symbol',
		customCurrency: customCurrencyData
	});
}
