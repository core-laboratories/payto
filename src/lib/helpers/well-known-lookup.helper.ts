/**
 * Well-known token registry lookup: https://github.com/bchainhub/well-known
 * API: GET https://coreblockchain.net/.well-known/tokens/lookup/:network/:identifier
 */

const WELL_KNOWN_LOOKUP_BASE = 'https://coreblockchain.net/.well-known/tokens/lookup';

/** Network identifiers treated as testnet (include testnet tokens when lookup runs for these). */
export const WELL_KNOWN_TESTNET_NETWORKS = [
	'xab',
	'tbtc',
	'tltc',
	'bchtest',
	'teth',
	'tsol',
	'txmr',
	'tdot',
	'testnet'
];

export interface WellKnownLookupResult {
	exists: boolean;
}

/**
 * Check if a token exists in the well-known registry.
 * @param identifier - Token name (ticker) or token address
 * @param network - Network id (e.g. xcb, xab, eth)
 * @param includeTestnet - If true, appends ?testnet=1 to include testnet tokens
 * @returns { exists: true } if found, { exists: false } if not or on error
 */
export async function lookupWellKnownToken(
	identifier: string,
	network: string,
	includeTestnet: boolean
): Promise<WellKnownLookupResult> {
	if (!identifier?.trim() || !network?.trim()) {
		return { exists: false };
	}
	const encodedNetwork = encodeURIComponent(network.toLowerCase());
	const encodedId = encodeURIComponent(identifier.trim());
	const query = includeTestnet ? '?testnet=1' : '';
	const url = `${WELL_KNOWN_LOOKUP_BASE}/${encodedNetwork}/${encodedId}${query}`;
	try {
		const res = await fetch(url);
		const data = await res.json().catch(() => ({}));
		return { exists: data?.exists === true };
	} catch {
		return { exists: false };
	}
}
