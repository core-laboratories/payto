import { getWebLink } from './generate.helper';

/**
 * Get basic PayTo link without design parameters and without transformation
 * @param hostname - Network hostname
 * @param props - Network data properties
 * @returns Basic PayTo link
 */
export function getBasicLink(hostname: string, props: any): string {
	return getWebLink({
		network: hostname as ITransitionType,
		networkData: props,
		design: false,
		transform: false
	});
}

/**
 * Get full PayTo link with design parameters but without transformation
 * @param hostname - Network hostname
 * @param props - Network data properties
 * @returns Full PayTo link with design
 */
export function getFullLink(hostname: string, props: any): string {
	return getWebLink({
		network: hostname as ITransitionType,
		networkData: props,
		design: true,
		transform: false
	});
}

/**
 * Get external PayTo link with design parameters and transformation
 * @param hostname - Network hostname
 * @param props - Network data properties
 * @returns External PayTo link with design and transformation
 */
export function getExternalLink(hostname: string, props: any): string {
	return getWebLink({
		network: hostname as ITransitionType,
		networkData: props,
		design: true,
		transform: true
	});
}
