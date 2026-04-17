/**
 * Identicons from @blockchainhub/blo are case-sensitive on the input string.
 * Core ICAN targets (xcb / xce / xab) use hex addresses that should not change
 * identicon when the same address appears with different casing in a payto URL.
 */

const CORE_ICAN_IDENTICON_NETWORKS = new Set(['xcb', 'xce', 'xab']);

/**
 * Lowercase destination for blo() when the payto network is Core ICAN (xcb, xce, xab).
 * Other networks (e.g. eth checksum) are left unchanged.
 */
export function normalizeAddressForIdenticon(
	address: string,
	network: string | undefined | null,
	hostname: string | undefined | null
): string {
	if (!address) return address;
	const n = (network || hostname || '').toLowerCase();
	if (CORE_ICAN_IDENTICON_NETWORKS.has(n)) {
		return address.toLowerCase();
	}
	return address;
}

/**
 * When network is unknown (e.g. GET /blo/[id]), normalize Core ICAN machine addresses:
 * mainnet `cb`, enterprise `ce`, testnet `ab`, each followed by 40 hex chars (CIP-10 / ICAN).
 */
export function normalizeBloPathId(id: string): string {
	if (/^(?:cb|ce|ab)[0-9a-f]{40}$/i.test(id)) {
		return id.toLowerCase();
	}
	return id;
}
