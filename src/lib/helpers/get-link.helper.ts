import { getWebLink } from './generate.helper';

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
