import { bicSchema } from '$lib/validators/bic.validator';
import { KV } from './kv.helper';

export interface VerifyOrganizationResult {
	isVerified: boolean;
	orgName: string | null;
	orgIcon: string | null;
}

/**
 * Verify if an organization code (ORIC/BIC) matches a given address
 * @param org - Organization code to verify
 * @param address - Address to match against
 * @returns Verification result with organization details
 */
export async function verifyOrganization(org: string, address: string): Promise<VerifyOrganizationResult> {
	const result: VerifyOrganizationResult = {
		isVerified: false,
		orgName: null,
		orgIcon: null
	};

	// Validate inputs
	if (!org || !address || address.trim() === '') {
		return result;
	}

	// Validate BIC format first
	const validation = bicSchema.safeParse({ bic: org });
	if (!validation.success) {
		// BIC is invalid, don't proceed
		return result;
	}

	// Verify ORIC matches the address
	try {
		const oricResponse = await fetch(`https://oric.payto.onl/${org.toUpperCase()}`);
		if (!oricResponse.ok) {
			// ORIC not found
			return result;
		}

		const oricData = await oricResponse.json();
		if (!oricData || !oricData.address) {
			// Invalid ORIC response
			return result;
		}

		// Check if ORIC address matches the payment address
		if (oricData.address.toLowerCase() !== address.toLowerCase()) {
			// Address mismatch - not verified
			return result;
		}

		// Authority exists as ORIC, mark as verified
		result.isVerified = true;

		// ORIC verified, now load KV data
		const kvData = await KV.get(org.toLowerCase());
		if (kvData && kvData.name) {
			// Authority exists with a name
			result.orgName = kvData.name;

			// Try to load the icon2x if available
			if (kvData.icons?.icon2x) {
				try {
					const response = await fetch(kvData.icons.icon2x);
					if (response.ok) {
						result.orgIcon = kvData.icons.icon2x;
					}
				} catch (iconError) {
					// Icon fetch failed, keep it null (will use identicon)
				}
			}
		}
		// If KV doesn't exist or has no name, keep verification false
	} catch (error) {
		// ORIC or KV fetch failed, keep verification false
	}

	return result;
}

