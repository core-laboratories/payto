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
 * Resolve a relative or absolute URL to a full URL
 * @param url - URL to resolve (can be relative or absolute)
 * @param baseUrl - Base URL for resolving relative URLs
 * @returns Full resolved URL
 */
function resolveUrl(url: string, baseUrl: string): string {
	if (!url) return '';

	// Already absolute URL
	if (/^https?:\/\//i.test(url)) {
		return url;
	}

	// Protocol-relative URL (//example.com/path)
	if (url.startsWith('//')) {
		return `https:${url}`;
	}

	// Absolute path (/path)
	if (url.startsWith('/')) {
		return `${baseUrl}${url}`;
	}

	// Relative path (path or ./path)
	return `${baseUrl}/${url}`;
}

/**
 * Extract icon URLs from HTML meta tags
 * @param html - HTML content
 * @param baseUrl - Base URL for resolving relative URLs
 * @returns Array of icon URLs in order of preference
 */
function extractIconUrlsFromHtml(html: string, baseUrl: string): string[] {
	const iconUrls: string[] = [];

	// Match link tags with rel attributes for icons
	// Matches: <link rel="icon" href="...">, <link rel="apple-touch-icon" href="...">, etc.
	const linkRegex = /<link[^>]+rel=["']([^"']+)["'][^>]+href=["']([^"']+)["'][^>]*>/gi;
	let match;

	while ((match = linkRegex.exec(html)) !== null) {
		const rel = match[1].toLowerCase();
		const href = match[2];

		// Prioritize icon types
		if (rel.includes('apple-touch-icon') || rel.includes('apple-touch-icon-precomposed')) {
			iconUrls.unshift(resolveUrl(href, baseUrl)); // Highest priority
		} else if (rel.includes('icon') || rel.includes('shortcut icon')) {
			// Check for sizes attribute for preference
			const sizesMatch = match[0].match(/sizes=["']([^"']+)["']/i);
			if (sizesMatch) {
				const sizes = sizesMatch[1];
				// Prefer larger icons (192x192, 180x180, etc.)
				if (/\d{3,}/.test(sizes)) {
					iconUrls.unshift(resolveUrl(href, baseUrl));
				} else {
					iconUrls.push(resolveUrl(href, baseUrl));
				}
			} else {
				iconUrls.push(resolveUrl(href, baseUrl));
			}
		}
	}

	return iconUrls;
}

/**
 * Verify if an image URL is accessible and valid
 * @param imageUrl - URL to check
 * @returns Promise that resolves to true if image is valid
 */
async function verifyImageExists(imageUrl: string): Promise<boolean> {
	return new Promise<boolean>((resolve) => {
		const img = new Image();
		let resolved = false;

		const cleanup = () => {
			if (!resolved) {
				resolved = true;
				img.onload = null;
				img.onerror = null;
			}
		};

		img.onload = () => {
			cleanup();
			resolve(true);
		};
		img.onerror = () => {
			cleanup();
			resolve(false);
		};

		img.src = imageUrl;
		// Timeout after 3 seconds
		setTimeout(() => {
			if (!resolved) {
				cleanup();
				resolve(false);
			}
		}, 3000);
	});
}

/**
 * Try to fetch favicon from a verified website domain
 * Fetches the HTML page and extracts icon URLs from meta tags
 * Kept for future use - not currently used in website verification
 * @param domain - Validated domain (no protocol, no path)
 * @returns Favicon URL if found, null otherwise
 */
export async function getWebsiteFavicon(domain: string): Promise<string | null> {
	if (!domain || !isValidDomain(domain)) {
		return null;
	}

	const baseUrl = `https://${domain.trim().toLowerCase()}`;

	try {
		// Fetch the main page HTML
		const response = await fetch(baseUrl, {
			method: 'GET',
			headers: {
				'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
			}
		});

		if (!response.ok) {
			return null;
		}

		// Get HTML content
		const html = await response.text();
		if (!html) {
			return null;
		}

		// Extract icon URLs from meta tags
		const iconUrls = extractIconUrlsFromHtml(html, baseUrl);

		if (iconUrls.length === 0) {
			// Fallback to common favicon.ico if no meta tags found
			iconUrls.push(`${baseUrl}/favicon.ico`);
		}

		// Try each icon URL until one works
		for (const iconUrl of iconUrls) {
			const exists = await verifyImageExists(iconUrl);
			if (exists) {
				return iconUrl;
			}
		}
	} catch (error) {
		// Fetch or parse failed
		return null;
	}

	return null;
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
