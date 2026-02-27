import { getWebLink } from './generate.helper';

/**
 * Resolve hostname for link generation. Only "other" (ICAN) is substituted with the custom value;
 * void stays "void" (custom transport goes in path as payto://void/other/...).
 */
export function getLinkHostname(hostname: string, props: { other?: string; transport?: string } | null): string {
	if (!props) return hostname;
	if (hostname === 'other' && props.other) return props.other;
	return hostname;
}

/**
 * Build asset query value for token code or smart contract: "ctn:" or "0x…:".
 */
function getAssetParam(currencyValue: string | undefined): string | undefined {
	if (!currencyValue?.trim()) return undefined;
	const isSmartContract = currencyValue.startsWith('0x') || currencyValue.length > 10;
	const value = isSmartContract ? currencyValue : currencyValue.toLowerCase();
	return `${value}:`;
}

/**
 * Pay button URI for wallet passes (Google Pay, etc.).
 * - ICAN + other: payto://{props.other}
 * - Void + transport other: payto://void/{props.other}
 * - Else: payto://{props.network}
 * - When token/currency is set, appends ?asset=ctn: or ?asset={smart_contract}:
 */
export function getPayButtonUri(props: {
	network?: string;
	other?: string;
	transport?: string;
	params?: { currency?: { value?: string } };
}): string {
	let base = 'payto://';
	if (!props?.network) return base;
	if (props.network === 'other') {
		const authority = props.other || props.network;
		base = authority ? `payto://${authority}` : base;
	} else if (props.network === 'void' && props.transport === 'other' && props.other) {
		base = `payto://void/${props.other}`;
	} else {
		base = `payto://${props.network}`;
	}
	const assetParam = getAssetParam(props?.params?.currency?.value);
	if (assetParam) {
		// Keep colon literal (no %3A); token/smart-contract values are safe for query
		base += '?asset=' + assetParam;
	}
	return base;
}

/**
 * Get external PayTo link with design parameters and transformation
 * @param hostname - Network hostname
 * @param props - Network data properties
 * @param design - Whether to include design parameters
 * @param transform - Whether to transform the link
 * @returns External PayTo link with design and transformation
 */
export function getLink(hostname: string, props: any, designData: any = null, transform: boolean = false): string {
	return getWebLink({
		network: hostname as ITransitionType,
		networkData: {
			...props,
			design: designData
		},
		design: !!designData,
		transform: transform
	});
}
