import { z } from 'zod';
import { validateWalletAddress } from 'blockchain-wallet-validator';
import { constructor } from '$lib/store/constructor.store';

const PUBLIC_ENABLE_TESTNET = import.meta.env.PUBLIC_ENABLE_TESTNET || 'true'; // Default to true if not set
const isTestnetAllowed = PUBLIC_ENABLE_TESTNET === 'true';
const PUBLIC_ENABLE_ENTERPRISE = import.meta.env.PUBLIC_ENABLE_ENTERPRISE || 'true'; // Default to true if not set
const isEnterpriseAllowed = PUBLIC_ENABLE_ENTERPRISE === 'true';
const isDebug = import.meta.env.MODE === 'development';

const moneroRegex = /^4[0-9AB][1-9A-HJ-NP-Za-km-z]{93}$/;
const moneroTestnetRegex = /^[9A][12s-z][1-9A-HJ-NP-Za-km-z]{93}$/;

export const addressSchema = z.object({
	network: z.string(),
	destination: z.string()
}).check((ctx) => {

	if (!ctx.value.network) {
		ctx.issues.push({
			code: 'custom',
			message: isDebug ? `Network (${ctx.value.network}) is required` : 'Network is required',
			path: ['wallet'],
			input: ctx.value,
			params: { errorType: 'no_network' }
		});
		return;
	}

	switch (ctx.value.network) {
		case 'xcb':
		case 'xce':
		case 'xab':
			const icanResult = validateWalletAddress(
				ctx.value.destination,
				{
					network: ['ican', 'ns'],
					nsDomains: ['card'],
					testnet: isTestnetAllowed
				}
			);
			if (!icanResult.isValid) {
				ctx.issues.push({
					code: 'custom',
					message: 'Invalid CORE address format',
					path: ['wallet'],
					input: ctx.value,
					params: { errorType: 'invalid_address' }
				});
				constructor.update(state => {
					state.networks.ican.network = 'xcb';
					return state;
				});
			} else if (icanResult.metadata?.isTestnet) {
				ctx.issues.push({
					code: 'custom',
					message: 'CORE testnet address detected',
					path: ['wallet', 'testnet'],
					input: ctx.value,
					params: {
						errorType: 'testnet_warning',
						allowed: isTestnetAllowed
					}
				});
				constructor.update(state => {
					state.networks.ican.network = icanResult.network || 'xab';
					return state;
				});
			} else if (icanResult.network === 'xce') {
				ctx.issues.push({
					code: 'custom',
					message: 'CORE enterprise address detected',
					path: ['wallet', 'enterprise'],
					input: ctx.value,
					params: {
						errorType: 'enterprise_warning',
						allowed: isEnterpriseAllowed
					}
				});
				constructor.update(state => {
					state.networks.ican.network = 'xce';
					return state;
				});
			} else if (icanResult.network !== 'ns' && icanResult.network !== ctx.value.network) {
				ctx.issues.push({
					code: 'custom',
					message: 'Different CORE network detected',
					path: ['wallet'],
					input: ctx.value,
					params: { errorType: 'different_network' }
				});
			}
			break;

		// ETH - Ethereum
		case 'eth':
			const ethResult = validateWalletAddress(ctx.value.destination, {
				network: ['evm'],
				nsDomains: ['eth'],
				testnet: isTestnetAllowed
			});
			if (!ethResult.isValid) {
				ctx.issues.push({
					code: 'custom',
					message: 'Invalid ETH address format',
					path: ['wallet'],
					input: ctx.value,
					params: { errorType: 'invalid_address' }
				});
			} else if (ethResult.metadata?.isTestnet) {
				ctx.issues.push({
					code: 'custom',
					message: 'ETH testnet address detected',
					path: ['wallet', 'testnet'],
					input: ctx.value,
					params: {
						errorType: 'testnet_warning',
						allowed: isTestnetAllowed
					}
				});
			}
			break;

		// BTC - Bitcoin
		case 'btc':
			const btcResult = validateWalletAddress(ctx.value.destination, { network: ['btc'], testnet: isTestnetAllowed });
			if (!btcResult.isValid) {
				ctx.issues.push({
					code: 'custom',
					message: 'Invalid BTC address format',
					path: ['wallet'],
					input: ctx.value,
					params: { errorType: 'invalid_address' }
				});
			} else if (btcResult.metadata?.isTestnet) {
				ctx.issues.push({
					code: 'custom',
					message: 'BTC testnet address detected',
					path: ['wallet', 'testnet'],
					input: ctx.value,
					params: {
						errorType: 'testnet_warning',
						allowed: isTestnetAllowed
					}
				});
			}
			break;

		// LTC - Litecoin
		case 'ltc':
			const ltcResult = validateWalletAddress(ctx.value.destination, { network: ['ltc'], testnet: isTestnetAllowed });
			if (!ltcResult.isValid) {
				ctx.issues.push({
					code: 'custom',
					message: 'Invalid LTC address format',
					path: ['wallet'],
					input: ctx.value,
					params: { errorType: 'invalid_address' }
				});
			} else if (ltcResult.metadata?.isTestnet) {
				ctx.issues.push({
					code: 'custom',
					message: 'LTC testnet address detected',
					path: ['wallet', 'testnet'],
					input: ctx.value,
					params: {
						errorType: 'testnet_warning',
						allowed: isTestnetAllowed
					}
				});
			}
			break;

		// SOL - Solana
		case 'sol':
			const solResult = validateWalletAddress(ctx.value.destination, { network: ['sol'], testnet: isTestnetAllowed });
			if (!solResult.isValid) {
				ctx.issues.push({
					code: 'custom',
					message: 'Invalid SOL address format',
					path: ['wallet'],
					input: ctx.value,
					params: { errorType: 'invalid_address' }
				});
			} else if (solResult.metadata?.isTestnet) {
				ctx.issues.push({
					code: 'custom',
					message: 'SOL testnet address detected',
					path: ['wallet', 'testnet'],
					input: ctx.value,
					params: {
						errorType: 'testnet_warning',
						allowed: isTestnetAllowed
					}
				});
			}
			break;

		// XLM - Stellar
		case 'xlm':
			const xlmResult = validateWalletAddress(ctx.value.destination, { network: ['xlm'], testnet: isTestnetAllowed });
			if (!xlmResult.isValid) {
				ctx.issues.push({
					code: 'custom',
					message: 'Invalid XLM address format',
					path: ['wallet'],
					input: ctx.value,
					params: { errorType: 'invalid_address' }
				});
			}
			break;

		// XRP - Ripple
		case 'xrp':
			const xrpResult = validateWalletAddress(ctx.value.destination, { network: ['xrp'], testnet: isTestnetAllowed });
			if (!xrpResult.isValid) {
				ctx.issues.push({
					code: 'custom',
					message: 'Invalid XRP address format',
					path: ['wallet'],
					input: ctx.value,
					params: { errorType: 'invalid_address' }
				});
			}
			break;

		// DOT - Polkadot
		case 'dot':
			const dotResult = validateWalletAddress(ctx.value.destination, { network: ['dot'], testnet: isTestnetAllowed });
			if (!dotResult.isValid) {
				ctx.issues.push({
					code: 'custom',
					message: 'Invalid DOT address format',
					path: ['wallet'],
					input: ctx.value,
					params: { errorType: 'invalid_address' }
				});
			} else if (dotResult.metadata?.isTestnet) {
				ctx.issues.push({
					code: 'custom',
					message: 'DOT testnet address detected',
					path: ['wallet', 'testnet'],
					input: ctx.value,
					params: {
						errorType: 'testnet_warning',
						allowed: isTestnetAllowed
					}
				});
			}
			break;

		// BCH - Bitcoin Cash
		case 'bch':
			const bchResult = validateWalletAddress(ctx.value.destination, { network: ['bch'], testnet: isTestnetAllowed });
			if (!bchResult.isValid) {
				ctx.issues.push({
					code: 'custom',
					message: 'Invalid BCH address format',
					path: ['wallet'],
					input: ctx.value,
					params: { errorType: 'invalid_address' }
				});
			}
			break;

		// XMR - Monero
		case 'xmr':
			const xmrResult = moneroRegex.test(ctx.value.destination);
			const xmrTestnetResult = moneroTestnetRegex.test(ctx.value.destination);
			if (!xmrResult && !xmrTestnetResult) {
				ctx.issues.push({
					code: 'custom',
					message: 'Invalid XMR address format',
					path: ['wallet'],
					input: ctx.value,
					params: { errorType: 'invalid_address' }
				});
			} else if (xmrTestnetResult) {
				ctx.issues.push({
					code: 'custom',
					message: 'XMR testnet address detected',
					path: ['wallet', 'testnet'],
					input: ctx.value,
					params: {
						errorType: 'testnet_warning',
						allowed: isTestnetAllowed
					}
				});
			}
			break;
	}
});

