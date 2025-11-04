export interface VerifyWebsiteResult {
	isVerified: boolean;
}

/**
 * Validates if a string is a valid domain (with optional subdomain, no protocol, no path)
 * Examples: "example.com", "sub.example.org", "sub.sub.domain.net"
 * Invalid: "https://example.com", "example.com/path", "http://sub.example.com"
 */
function isValidDomain(domain: string): boolean {
	if (!domain || domain.trim() === '') {
		return false;
	}

	// Remove whitespace
	const trimmed = domain.trim();

	// Must not contain protocol
	if (/^https?:\/\//i.test(trimmed)) {
		return false;
	}

	// Must not contain path or query
	if (trimmed.includes('/') || trimmed.includes('?')) {
		return false;
	}

	// Domain regex: allows subdomains, alphanumeric and hyphens
	// Pattern: (subdomain(s).)?domain.tld
	const domainRegex = /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;

	return domainRegex.test(trimmed);
}

/**
 * Verify if a website's fintag.json matches a given address
 * @param org - Domain name to verify (e.g., "example.com", "sub.domain.org")
 * @param address - Address to match against
 * @param network - Network identifier (e.g., "xcb", "eth") to find the right mapping
 * @returns Verification result
 */
export async function verifyWebsite(org: string, address: string, network?: string): Promise<VerifyWebsiteResult> {
	const result: VerifyWebsiteResult = {
		isVerified: false
	};

	// Validate inputs
	if (!org || !address || address.trim() === '') {
		return result;
	}

	// Validate domain format
	if (!isValidDomain(org)) {
		return result;
	}

	// Normalize domain (trim and lowercase)
	const domain = org.trim().toLowerCase();

	// Build fintag.json URL
	const fintagUrl = `https://${domain}/.well-known/fintag.json`;

	try {
		// Fetch fintag.json
		const response = await fetch(fintagUrl, {
			method: 'GET',
			headers: {
				'Accept': 'application/json'
			}
		});

		if (!response.ok) {
			// File not found or error
			return result;
		}

		// Parse JSON
		const fintagData = await response.json();

		if (!fintagData || typeof fintagData !== 'object') {
			// Invalid JSON structure
			return result;
		}

		// Check if address matches any value in the fintag.json
		// If network is provided, check specific key first: "ican:network"
		// Otherwise, check all values
		const addressToMatch = address.toLowerCase().trim();

		if (network) {
			// Try network-specific key first (e.g., "ican:xcb")
			const networkKey = `ican:${network.toLowerCase()}`;
			if (fintagData[networkKey]) {
				const fintagAddress = String(fintagData[networkKey]).toLowerCase().trim();
				if (fintagAddress === addressToMatch) {
					result.isVerified = true;
					return result;
				}
			}
		}

		// Check all values in the JSON object
		for (const key in fintagData) {
			if (Object.prototype.hasOwnProperty.call(fintagData, key)) {
				const value = String(fintagData[key]).toLowerCase().trim();
				if (value === addressToMatch) {
					result.isVerified = true;
					return result;
				}
			}
		}
	} catch (error) {
		// Fetch or parse failed
		return result;
	}

	return result;
}
