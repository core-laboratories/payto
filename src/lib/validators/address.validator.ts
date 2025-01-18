import { z } from 'zod';
import { validateWalletAddress } from 'blockchain-wallet-validator';

const moneroRegex = /^4[0-9AB][1-9A-HJ-NP-Za-km-z]{93}$/;

export const addressSchema = z.object({
	network: z.string(),
	destination: z.string().refine((val: string) => {
		const network = val.split(':')[0];

		switch (network) {
			case 'xcb':
				const icanResult = validateWalletAddress(val, { network: ['ican'] });
				return icanResult.isValid;

			case 'eth':
				const ethResult = validateWalletAddress(val, {
					network: ['evm'],
					nsDomains: ['eth']
				});
				return ethResult.isValid;

			case 'btc':
				const btcResult = validateWalletAddress(val, { network: ['btc'] });
				return btcResult.isValid;

			case 'ltc':
				const ltcResult = validateWalletAddress(val, { network: ['ltc'] });
				return ltcResult.isValid;

			case 'xmr':
				return moneroRegex.test(val);

			default:
				return null;
		}
	}, "Invalid address format")
});
