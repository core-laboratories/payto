/**
 * Get title name
 * @param hostname - Network hostname
 * @param props - Network data properties
 * @param currency - Optional currency override
 * @param prefixed - Whether to prefix the title with the hostname
 * @returns Formatted title text
 */
export function getTitleText(hostname: string, destination: string, props: any, currency?: string, prefixed: boolean = false): string | null {
	if (hostname === 'ican') {
		const currencyValue = currency || props.currency;
		const currencyText = currencyValue && currencyValue.length < 6
			? currencyValue.toUpperCase()
			: (currencyValue ? shortenTitle(currencyValue) : shortenTitle(hostname));
		return prefixed ? currencyText + ' ' + shortenTitle(destination) : shortenTitle(destination);
	} else if (hostname === 'iban' || hostname === 'ach' || hostname === 'bic') {
		return prefixed ? hostname.toUpperCase() + ' ' + shortenTitle(destination) : shortenTitle(destination);
	} else if (hostname === 'upi' || hostname === 'pix') {
		return prefixed ? hostname.toUpperCase() + ' ' + splitAddress(destination, '@', 1).toLowerCase() : splitAddress(destination, '@', 1).toLowerCase();
	} else if (hostname === 'intra') {
		return prefixed ? hostname.toUpperCase() + ' ' + shortenTitle(destination) : shortenTitle(destination);
	} else if (hostname === 'void') {
		if (props.transport === 'geo') {
			const lat = props.params?.loc?.lat;
			const lon = props.params?.loc?.lon;
			if (lat && lon) {
				return prefixed ? `${props.transport.toUpperCase()} ${truncateTitle(Number(lat), 4)},${truncateTitle(Number(lon), 4)}` : `${truncateTitle(Number(lat), 4)},${truncateTitle(Number(lon), 4)}`;
			} else {
				return prefixed ? hostname.toUpperCase() + ' ' + shortenTitle(destination) : shortenTitle(destination);
			}
		} else if (props.transport === 'plus') {
			const plus = props.params?.loc?.plus;
			if (plus) {
				return prefixed ? props.transport.toUpperCase() + ' ' + cutFromBeginning(plus.toString(), 4) : cutFromBeginning(plus.toString(), 4);
			} else {
				return prefixed ? hostname.toUpperCase() + ' ' + shortenTitle(destination) : shortenTitle(destination);
			}
		} else {
			return prefixed ? hostname.toUpperCase() + ' ' + shortenTitle(destination) : shortenTitle(destination);
		}
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
	if (!props.address) return null;
	if (hostname === 'iban' || hostname === 'ach' || hostname === 'intra' || hostname === 'ican') {
		return shortenTitle(props.address);
	} else if (hostname === 'upi' || hostname === 'pix') {
		return splitAddress(props.address, '@', 1).toLowerCase();
	} else if (hostname === 'bic') {
		return props.address.toUpperCase();
	} else if (hostname === 'void') {
		if (props.transport === 'geo') {
			const [lat, lon] = props.address.toString().split(',');
			return `${truncateTitle(Number(lat), 4)},${truncateTitle(Number(lon), 4)}`;
		} else if (props.transport === 'plus') {
			return cutFromBeginning(props.address.toString(), 4);
		} else {
			return shortenTitle(props.address);
		}
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

function cutFromBeginning(title?: string | number | null, length: number = 4): string {
	const normalized = title === undefined || title === null
		? ''
		: typeof title === 'string'
			? title
			: String(title);

	return normalized.length > length
		? normalized.slice(0, length)
		: normalized;
}
