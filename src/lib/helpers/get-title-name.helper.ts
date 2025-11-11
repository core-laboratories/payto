/**
 * Get title name
 * @param hostname - Network hostname
 * @param props - Network data properties
 * @param currency - Optional currency override
 * @returns Formatted title text
 */
export function getTitleText(hostname: string, props: any, currency?: string, prefixed: boolean = false): string | null {
	if (hostname === 'iban') {
		if (props.iban) {
			return prefixed ? 'IBAN ' + shortenTitle(props.iban) : shortenTitle(props.iban);
		} else {
			return null;
		}
	} else if (hostname === 'upi' || hostname === 'pix') {
		if (props.accountAlias) {
			return prefixed ? hostname.toUpperCase() + ' ' + shortenTitle(props.accountAlias) : shortenTitle(props.accountAlias);
		} else {
			return null;
		}
	} else if (hostname === 'ach') {
		if (props.accountNumber) {
			return prefixed ? 'ACH ' + shortenTitle(props.accountNumber) : shortenTitle(props.accountNumber);
		} else {
			return null;
		}
	} else if (hostname === 'bic') {
		if (props.bic) {
			return prefixed ? hostname.toUpperCase() + ' ' + props.bic : props.bic;
		} else {
			return null;
		}
	} else if (hostname === 'intra') {
		if (props.id) {
			return prefixed ? 'Intra-bank ' + shortenTitle(props.id) : shortenTitle(props.id);
		} else {
			return null;
		}
	} else if (hostname === 'void') {
		if (props.network === 'geo') {
			return prefixed ? 'Geo ' + props.params.lat.value.toFixed(4) + ',' + props.params.lon.value.toFixed(4) : props.params.lat.value.toFixed(4) + ',' + props.params.lon.value.toFixed(4);
		} else if (props.network === 'plus') {
			return prefixed ? 'Plus ' + truncateTitle(props.params.plus.value) : truncateTitle(props.params.plus.value);
		} else {
			return prefixed ? shortenTitle(props.network).toUpperCase() + ' ' + truncateTitle(props.other) : truncateTitle(props.other);
		}
	} else if (hostname === 'ican') {
		const currencyValue = props.currency || currency;
		const currencyText = currencyValue && currencyValue.length < 6
			? currencyValue.toUpperCase()
			: (currencyValue ? shortenTitle(currencyValue) : shortenTitle(hostname));
		return prefixed ? currencyText + ' ' + shortenTitle(props.address) : shortenTitle(props.address);
	}
	return prefixed ? shortenTitle(hostname).toUpperCase() + ' ' + shortenTitle(props.destination) : shortenTitle(props.destination);
}

/**
 * Get title text for barcode
 * @param hostname - Network hostname
 * @param props - Network data properties
 * @returns Formatted title text
 */
export function getTitleTextBarcode(hostname: string, props: any): string | null {
	if (hostname === 'iban' || hostname === 'ach' || hostname === 'intra' || hostname === 'ican') {
		return shortenTitle(props.address);
	} else if (hostname === 'upi' || hostname === 'pix') {
		return splitAddress(props.address, '@', 1).toLowerCase();
	} else if (hostname === 'bic') {
		return props.address.toUpperCase();
	} else if (hostname === 'void') {
		return props.address;
	}
	return shortenTitle(props.address);
}

function shortenTitle(title?: string | number | null, delimiter: string = '…'): string {
	const normalized = title === undefined || title === null
		? ''
		: typeof title === 'string'
			? title
			: String(title);

	return normalized.length > 8
		? `${normalized.slice(0, 4).toUpperCase()}${delimiter}${normalized.slice(-4).toUpperCase()}`
		: normalized.toUpperCase();
}

function truncateTitle(title?: string | number | null, length: number = 8): string {
	const normalized = title === undefined || title === null
		? ''
		: typeof title === 'string'
			? title
			: String(title);

	return normalized.length > length
		? normalized.slice(0, length)
		: normalized;
}

function splitAddress(address?: string | number | null, delimiter: string = '@', partNumber: number = 1): string {
	const normalized = address === undefined || address === null
		? ''
		: typeof address === 'string'
			? address
			: String(address);

	const index = Math.max(0, partNumber - 1);
	const parts = normalized.split(delimiter);

	return parts[index] ?? normalized;
}
