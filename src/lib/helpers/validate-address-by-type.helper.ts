import { validateWalletAddress } from 'blockchain-wallet-validator';
import { ibanSchema } from '$lib/validators/iban.validator';
import { bicSchema } from '$lib/validators/bic.validator';
import { pixSchema } from '$lib/validators/pix.validator';
import { upiSchema } from '$lib/validators/upi.validator';
import { achAccountSchema, achRoutingSchema } from '$lib/validators/ach.validator';
import { addressSchema } from '$lib/validators/address.validator';

const PUBLIC_ENABLE_TESTNET = import.meta.env.PUBLIC_ENABLE_TESTNET || 'true';
const isTestnetAllowed = PUBLIC_ENABLE_TESTNET === 'true';

const moneroRegex = /^4[0-9AB][1-9A-HJ-NP-Za-km-z]{93}$/;
const moneroTestnetRegex = /^[9A][12s-z][1-9A-HJ-NP-Za-km-z]{93}$/;
const BIC_REGEX = /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/i;

/**
 * Validates an address based on the hostname/type
 * Only validates if we know how to validate that type
 * @param address - The address to validate
 * @param hostname - The hostname/type (e.g., 'ican', 'iban', 'xcb', 'eth', 'btc', etc.)
 * @param network - Optional network within the type (e.g., 'xcb' for ICAN type)
 * @returns Object with isValid boolean and errorMessage string
 */
export function validateAddressByType(
	address: string | undefined,
	hostname: string | undefined,
	network?: string,
	additionalData?: any
): { isValid: boolean; errorMessage: string | null, additionalData?: any } {
	if (!address || !address.trim()) {
		return { isValid: false, errorMessage: null, additionalData: null };
	}

	if (!hostname) {
		return { isValid: false, errorMessage: null };
	}

	const trimmedAddress = address.trim();
	const normalizedHostname = hostname.toLowerCase();
	const uppercaseHostname = hostname.toUpperCase();
	const normalizedNetwork = network?.toLowerCase();
	const normalizedAdditionalData = typeof additionalData === 'string' ? additionalData?.toLowerCase() : null;

	// Handle IBAN
	if (normalizedHostname === 'iban') {
		const result = ibanSchema.safeParse({ iban: trimmedAddress });
		if (!result.success) {
			return { isValid: false, errorMessage: `Address is not valid for type ${uppercaseHostname}` };
		}
		return { isValid: true, errorMessage: null };
	}

	// Handle BIC / ORIC
	if (normalizedHostname === 'bic') {
		const result = bicSchema.safeParse({ bic: trimmedAddress });
		if (!result.success) {
			return { isValid: false, errorMessage: `Address is not valid for type ${uppercaseHostname}` };
		}
		return { isValid: true, errorMessage: null };
	}

	// Handle Intra-bank transfer addresses
	if (normalizedHostname === 'intra') {
		// For intra, we might have a CORE address in the ID field, but we validate BIC separately
		// If this is being called for BIC validation, validate it
		if (normalizedAdditionalData && BIC_REGEX.test(normalizedAdditionalData)) {
			const result = bicSchema.safeParse({ bic: normalizedAdditionalData });
			if (!result.success) {
				return { isValid: false, errorMessage: `Address is not valid for type ${uppercaseHostname}` };
			}
			return { isValid: true, errorMessage: null };
		}
		// For intra, if it looks like a CORE address, validate as ICAN
		if (/^c[be]\d{2}[0-9a-f]{40}$/i.test(trimmedAddress)) {
			const result = addressSchema.safeParse({
				network: trimmedAddress.toLowerCase().startsWith('ce') ? 'xce' : 'xcb',
				destination: trimmedAddress
			});
			if (!result.success) {
				return { isValid: false, errorMessage: `Address is not valid for type ${uppercaseHostname}` };
			}
			return { isValid: true, errorMessage: null };
		}
	}

	// Handle UPI (email format)
	if (normalizedHostname === 'upi') {
		const result = upiSchema.safeParse({ accountAlias: trimmedAddress });
		if (!result.success) {
			return { isValid: false, errorMessage: `Address is not valid for type ${uppercaseHostname}` };
		}
		return { isValid: true, errorMessage: null };
	}

	// Handle PIX (email format)
	if (normalizedHostname === 'pix') {
		const result = pixSchema.safeParse({ accountAlias: trimmedAddress });
		if (!result.success) {
			return { isValid: false, errorMessage: `Address is not valid for type ${uppercaseHostname}` };
		}
		return { isValid: true, errorMessage: null };
	}

	// Handle ACH (account number: 7-14 digits, routing: 9 digits)
	if (normalizedHostname === 'ach') {
		// ACH can be either account number or routing number
		const isAccountNumber = /^\d{7,14}$/.test(trimmedAddress);
		const isRoutingNumber = /^\d{9}$/.test(trimmedAddress);

		if (isAccountNumber) {
			const result = achAccountSchema.safeParse({ accountNumber: trimmedAddress });
			if (!result.success) {
				return { isValid: false, errorMessage: `Address is not valid for type ${uppercaseHostname}` };
			}
		} else if (isRoutingNumber) {
			const result = achRoutingSchema.safeParse({ routingNumber: trimmedAddress });
			if (!result.success) {
				return { isValid: false, errorMessage: `Address is not valid for type ${uppercaseHostname}` };
			}
		} else {
			return { isValid: false, errorMessage: `Address is not valid for type ${uppercaseHostname}` };
		}
		return { isValid: true, errorMessage: null };
	}

	// Handle ICAN (CORE) addresses
	if (normalizedNetwork === 'xcb' || normalizedNetwork === 'xce' || normalizedNetwork === 'xab') {
		const result = validateWalletAddress(trimmedAddress, {
			network: ['ican', 'ns'],
			nsDomains: [{ domain: 'card', maxLabelLength: 64, emojiAllowed: false }],
			testnet: isTestnetAllowed
		});

		if (!result.isValid) {
			return { isValid: false, errorMessage: `Address is not valid for type ${uppercaseHostname}` };
		}

		return { isValid: true, errorMessage: null };
	}

	// Handle Ethereum addresses
	if (normalizedHostname === 'eth' || normalizedNetwork === 'eth') {
		const result = validateWalletAddress(trimmedAddress, {
			network: ['evm'],
			nsDomains: ['eth'],
			testnet: isTestnetAllowed
		});

		if (!result.isValid) {
			return { isValid: false, errorMessage: `Address is not valid for type ${uppercaseHostname}` };
		}

		return { isValid: true, errorMessage: null };
	}

	// Handle Bitcoin addresses
	if (normalizedHostname === 'btc' || normalizedNetwork === 'btc') {
		const result = validateWalletAddress(trimmedAddress, {
			network: ['btc'],
			testnet: isTestnetAllowed
		});

		if (!result.isValid) {
			return { isValid: false, errorMessage: `Address is not valid for type ${uppercaseHostname}` };
		}

		return { isValid: true, errorMessage: null };
	}

	// Handle Litecoin addresses
	if (normalizedHostname === 'ltc' || normalizedNetwork === 'ltc') {
		const result = validateWalletAddress(trimmedAddress, {
			network: ['ltc'],
			testnet: isTestnetAllowed
		});

		if (!result.isValid) {
			return { isValid: false, errorMessage: `Address is not valid for type ${uppercaseHostname}` };
		}

		return { isValid: true, errorMessage: null };
	}

	// Handle Solana addresses
	if (normalizedHostname === 'sol' || normalizedNetwork === 'sol') {
		const result = validateWalletAddress(trimmedAddress, {
			network: ['sol'],
			testnet: isTestnetAllowed
		});

		if (!result.isValid) {
			return { isValid: false, errorMessage: `Address is not valid for type ${uppercaseHostname}` };
		}

		return { isValid: true, errorMessage: null };
	}

	// Handle Stellar addresses
	if (normalizedHostname === 'xlm' || normalizedNetwork === 'xlm') {
		const result = validateWalletAddress(trimmedAddress, {
			network: ['xlm'],
			testnet: isTestnetAllowed
		});

		if (!result.isValid) {
			return { isValid: false, errorMessage: `Address is not valid for type ${uppercaseHostname}` };
		}

		return { isValid: true, errorMessage: null };
	}

	// Handle Ripple addresses
	if (normalizedHostname === 'xrp' || normalizedNetwork === 'xrp') {
		const result = validateWalletAddress(trimmedAddress, {
			network: ['xrp'],
			testnet: isTestnetAllowed
		});

		if (!result.isValid) {
			return { isValid: false, errorMessage: `Address is not valid for type ${uppercaseHostname}` };
		}

		return { isValid: true, errorMessage: null };
	}

	// Handle Polkadot addresses
	if (normalizedHostname === 'dot' || normalizedNetwork === 'dot') {
		const result = validateWalletAddress(trimmedAddress, {
			network: ['dot'],
			testnet: isTestnetAllowed
		});

		if (!result.isValid) {
			return { isValid: false, errorMessage: `Address is not valid for type ${uppercaseHostname}` };
		}

		return { isValid: true, errorMessage: null };
	}

	// Handle Bitcoin Cash addresses
	if (normalizedHostname === 'bch' || normalizedNetwork === 'bch') {
		const result = validateWalletAddress(trimmedAddress, {
			network: ['bch'],
			testnet: isTestnetAllowed
		});

		if (!result.isValid) {
			return { isValid: false, errorMessage: `Address is not valid for type ${uppercaseHostname}` };
		}

		return { isValid: true, errorMessage: null };
	}

	// Handle Monero addresses
	if (normalizedHostname === 'xmr' || normalizedNetwork === 'xmr') {
		const isMainnet = moneroRegex.test(trimmedAddress);
		const isTestnet = moneroTestnetRegex.test(trimmedAddress);

		if (!isMainnet && !isTestnet) {
			return { isValid: false, errorMessage: `Address is not valid for type ${uppercaseHostname}` };
		}

		return { isValid: true, errorMessage: null };
	}

	// For void type (cash, geo, plus), we don't validate
	if (normalizedHostname === 'void') {
		return { isValid: true, errorMessage: null };
	}

	// For unknown types, assume valid (we don't know how to validate them)
	return { isValid: true, errorMessage: null };
}

