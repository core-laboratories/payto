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
 * Pay button URI for wallet passes (Google Pay, etc.).
 * - ICAN + other: payto://{props.other}
 * - Void + transport other: payto://void/{props.other}
 * - Else: payto://{props.network}
 */
export function getPayButtonUri(props: {
	network?: string;
	other?: string;
	transport?: string;
}): string {
	if (!props?.network) return 'payto://';
	if (props.network === 'other') {
		const authority = props.other || props.network;
		return authority ? `payto://${authority}` : 'payto://';
	}
	if (props.network === 'void' && props.transport === 'other' && props.other) {
		return `payto://void/${props.other}`;
	}
	return `payto://${props.network}`;
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
