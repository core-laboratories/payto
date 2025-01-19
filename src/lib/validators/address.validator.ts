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
}).superRefine((data, ctx) => {

	if (!data.network) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			message: isDebug ? `Network (${data.network}) is required` : 'Network is required',
			path: ['wallet'],
			fatal: true
		});
		return;
	}

	switch (data.network) {
		case 'xcb':
		case 'xce':
		case 'xab':
			const icanResult = validateWalletAddress(data.destination, { network: ['ican'], testnet: isTestnetAllowed });
			if (!icanResult.isValid) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'Invalid CORE address format',
					path: ['wallet'],
					fatal: true
				});
				constructor.update(state => {
					state.networks.ican.network = 'xcb';
					return state;
				});
			} else if (icanResult.metadata?.isTestnet && icanResult.network === 'xab') {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'CORE testnet address detected',
					path: ['wallet', 'testnet'],
					fatal: !isTestnetAllowed
				});
				constructor.update(state => {
					state.networks.ican.network = 'xab';
					return state;
				});
			} else if (icanResult.network === 'xce') {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'CORE enterprise address detected',
					path: ['wallet', 'enterprise'],
					fatal: !isEnterpriseAllowed
				});
				constructor.update(state => {
					state.networks.ican.network = 'xce';
					return state;
				});
			} else if (icanResult.network !== data.network) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'Different CORE network detected',
					path: ['wallet'],
					fatal: true
				});
			}
			break;

		// ETH - Ethereum
		case 'eth':
			const ethResult = validateWalletAddress(data.destination, {
				network: ['evm'],
				nsDomains: ['eth'],
				testnet: isTestnetAllowed
			});
			if (!ethResult.isValid) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'Invalid ETH address format',
					path: ['wallet'],
					fatal: true
				});
			} else if (ethResult.metadata?.isTestnet) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'ETH testnet address detected',
					path: ['wallet', 'testnet'],
					fatal: !isTestnetAllowed
				});
			}
			break;

		// BTC - Bitcoin
		case 'btc':
			const btcResult = validateWalletAddress(data.destination, { network: ['btc'], testnet: isTestnetAllowed });
			if (!btcResult.isValid) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'Invalid BTC address format',
					path: ['wallet'],
					fatal: true
				});
			} else if (btcResult.metadata?.isTestnet) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'BTC testnet address detected',
					path: ['wallet', 'testnet'],
					fatal: !isTestnetAllowed
				});
			}
			break;

		// LTC - Litecoin
		case 'ltc':
			const ltcResult = validateWalletAddress(data.destination, { network: ['ltc'], testnet: isTestnetAllowed });
			if (!ltcResult.isValid) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'Invalid LTC address format',
					path: ['wallet'],
					fatal: true
				});
			} else if (ltcResult.metadata?.isTestnet) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'LTC testnet address detected',
					path: ['wallet', 'testnet'],
					fatal: !isTestnetAllowed
				});
			}
			break;

		// SOL - Solana
		case 'sol':
			const solResult = validateWalletAddress(data.destination, { network: ['sol'], testnet: isTestnetAllowed });
			if (!solResult.isValid) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'Invalid SOL address format',
					path: ['wallet'],
					fatal: true
				});
			} else if (solResult.metadata?.isTestnet) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'SOL testnet address detected',
					path: ['wallet', 'testnet'],
					fatal: !isTestnetAllowed
				});
			}
			break;

		// XLM - Stellar
		case 'xlm':
			const xlmResult = validateWalletAddress(data.destination, { network: ['xlm'], testnet: isTestnetAllowed });
			if (!xlmResult.isValid) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'Invalid XLM address format',
					path: ['wallet'],
					fatal: true
				});
			}
			break;

		// XRP - Ripple
		case 'xrp':
			const xrpResult = validateWalletAddress(data.destination, { network: ['xrp'], testnet: isTestnetAllowed });
			if (!xrpResult.isValid) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'Invalid XRP address format',
					path: ['wallet'],
					fatal: true
				});
			}
			break;

		// DOT - Polkadot
		case 'dot':
			const dotResult = validateWalletAddress(data.destination, { network: ['dot'], testnet: isTestnetAllowed });
			if (!dotResult.isValid) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'Invalid DOT address format',
					path: ['wallet'],
					fatal: true
				});
			} else if (dotResult.metadata?.isTestnet) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'DOT testnet address detected',
					path: ['wallet', 'testnet'],
					fatal: !isTestnetAllowed
				});
			}
			break;

		// BCH - Bitcoin Cash
		case 'bch':
			const bchResult = validateWalletAddress(data.destination, { network: ['bch'], testnet: isTestnetAllowed });
			if (!bchResult.isValid) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'Invalid BCH address format',
					path: ['wallet'],
					fatal: true
				});
			}
			break;

		// XMR - Monero
		case 'xmr':
			const xmrResult = moneroRegex.test(data.destination);
			const xmrTestnetResult = moneroTestnetRegex.test(data.destination);
			if (!xmrResult && !xmrTestnetResult) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'Invalid XMR address format',
					path: ['wallet'],
					fatal: true
				});
			} else if (xmrTestnetResult) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'XMR testnet address detected',
					path: ['wallet', 'testnet'],
					fatal: !isTestnetAllowed
				});
			}
			break;
	}
});

