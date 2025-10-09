import { redirect, error } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { calculateColorDistance } from '$lib/helpers/euclidean-distance.helper';
import { getWebLink } from '$lib/helpers/generate.helper';
import { getCurrency } from '$lib/helpers/get-currency.helper';
import { getExplorerUrl } from '$lib/helpers/tx-explorer.helper';
import { KV } from '$lib/helpers/kv.helper';
import ExchNumberFormat from 'exchange-rounding';
import JSZip from 'jszip';
import forge from 'node-forge';
// @ts-ignore
import OpenLocationCode from 'open-location-code/js/src/openlocationcode';
import { createClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import { PUBLIC_ENABLE_STATS } from '$env/static/public';

// Required environment variables
const teamIdentifier = env.PRIVATE_PASS_TEAM_IDENTIFIER;
if (!teamIdentifier) {
	throw new Error('PRIVATE_PASS_TEAM_IDENTIFIER is required');
}

const privateKey = env.PRIVATE_PASS_PRIVATE_KEY;
if (!privateKey) {
	throw new Error('PRIVATE_PASS_PRIVATE_KEY is required');
}

// Optional environment variables with defaults
const proUrl = publicEnv.PUBLIC_PRO_URL || 'https://payto.money/activate/pro';
const enableStats = PUBLIC_ENABLE_STATS === 'true' ? true : false;
const apiTokenTimeout = parseInt(env.PRIVATE_API_TOKEN_TIMEOUT || '1', 10); // Default: 1 minute

type Actions = {
	generatePass: (event: RequestEvent) => Promise<Response>;
};

function validColors(colorF: string, colorB: string) {
	const distance = calculateColorDistance(colorF, colorB);
	return distance >= 100;
}

function getLink(hostname: string, props: any) {
	return getWebLink({
		network: hostname as ITransitionType,
		networkData: props,
		design: false,
		transform: false
	});
}

function getLocationCode(plusCode: string): [number, number] {
	// @ts-ignore
	const codeArea = OpenLocationCode.decode(plusCode);
	return [codeArea.latitudeCenter, codeArea.longitudeCenter];
}

function getLogoText(hostname: string, props: any) {
	return `${(props.currency.value && props.currency.value.length < 6) ? props.currency.value.toUpperCase() : (props.network.toUpperCase() ? props.network.toUpperCase() : hostname.toUpperCase())} ${(props.destination.length > 8) ? props.destination.slice(0, 4).toUpperCase() + '…' + props.destination.slice(-4).toUpperCase() : props.destination.toUpperCase()}`;
}

function generateToken(payload: any, secret: string, expirationMinutes: number = apiTokenTimeout): string {
	const tokenData = {
		...payload,
		exp: Date.now() + (expirationMinutes * 60 * 1000)
	};
	const hmac = forge.hmac.create();
	hmac.start('sha256', secret);
	hmac.update(JSON.stringify(tokenData));
	return hmac.digest().toHex();
}

function verifyToken(token: string, payload: any, secret: string, expirationMinutes: number = apiTokenTimeout): boolean {
	const tokenData = {
		...payload,
		exp: Date.now() + (expirationMinutes * 60 * 1000)
	};
	const expectedToken = generateToken(payload, secret, expirationMinutes);

	// Check if token matches and is not expired
	if (token !== expectedToken) {
		return false;
	}

	// Check expiration (token includes timestamp in payload)
	if (tokenData.exp < Date.now()) {
		return false;
	}

	return true;
}

function getFormattedDateTime(includeTimezone: boolean = true) {
	const now = new Date();

	// Format date and time as YYYYMMDDHHmm
	const formattedDateTime = now.toISOString().replace(/[-T:]/g, '').slice(2, 12);

	// Get timezone offset in ±hhmm format
	if (includeTimezone) {
		const offsetMinutes = now.getTimezoneOffset();
		const hours = String(Math.abs(Math.floor(offsetMinutes / 60))).padStart(2, '0');
		const minutes = String(Math.abs(offsetMinutes % 60)).padStart(2, '0');
		const sign = offsetMinutes > 0 ? '-' : '+'; // JavaScript offset is opposite (- for ahead, + for behind UTC)

		const timezoneOffset = `${sign}${hours}${minutes}`;

		return `${formattedDateTime}${timezoneOffset}`;
	}

	return formattedDateTime;
}

function getFileId(arr: string[], delimiter: string = '_', includeDate: boolean = true, includeTimezone: boolean = true) {
	return arr.join(delimiter) + (includeDate ? (includeTimezone ? `${delimiter}${getFormattedDateTime()}` : `${delimiter}${getFormattedDateTime(false)}`) : '');
}

const formatter = (currency: string | undefined, format: string | undefined, customCurrencyData = {}) => {
	return new ExchNumberFormat(format, {
		style: 'currency',
		currency: currency || '',
		currencyDisplay: 'symbol',
		customCurrency: customCurrencyData,
	});
}

let supabase = null;
if (enableStats) {
	const supabaseUrl = env.PRIVATE_SUPABASE_URL;
	const supabaseKey = env.PRIVATE_SUPABASE_KEY;

	if (!supabaseUrl || !supabaseKey) {
		console.warn('Supabase credentials not found. Stats will be disabled.');
	} else {
		supabase = createClient(supabaseUrl, supabaseKey);
	}
}

export async function load({ url }) {
	const fullUrl = new URL(url.href);
	const authority = url.searchParams.get('authority') ?? undefined;
	const hasPass = url.searchParams.get('pass') === '1';

	if (fullUrl.hostname === 'payto.money') {
		const hasValidProtocol = fullUrl.protocol === 'payto.money:';
		const path = fullUrl.pathname.startsWith('/://') ? fullUrl.pathname.slice(3) : fullUrl.pathname;

		if (hasValidProtocol && path) {
			throw redirect(302, `/show?url=${encodeURIComponent(path)}`);
		}
	}

	return {
		authority,
		hasPass,
	};
}

export const actions = {
	generatePass: async ({ request, url }: RequestEvent) => {
		// Get authority first to load kvData
		const formData = await request.formData();
		const authorityField = (formData.get('authority') as string) || url.searchParams.get('authority');
		const authorityItem = authorityField ? authorityField.toLowerCase() : 'payto';
		let kvData = null;
		let authority = null;

		if (authorityField) {
			// Load KV values
			kvData = await KV.get(authorityItem);
			if (kvData && (!kvData.id || !kvData.identifier)) {
				throw error(400, `Invalid or missing configuration for authority: ${authorityItem}`);
			}
			authority = kvData.id;
		}

		const contentType = request.headers.get('content-type') || '';
		let data: any = {};

		// Authorization flow
		let isAuthorized = false;

		if (authority && kvData) {
			// Check if API is allowed
			if (kvData.api?.allowed === true) {
				const authHeader = request.headers.get('authorization');
				const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

				if (bearerToken && kvData.api?.secret) {
					// Verify bearer token
					const payload = { authority: authorityItem };
					if (verifyToken(bearerToken, payload, kvData.api.secret)) {
						isAuthorized = true;

						// Parse JSON body only if API is enabled and authorized
						if (contentType.includes('application/json')) {
							// Re-read the request body as JSON
							const clonedRequest = request.clone();
							data = await clonedRequest.json();
						} else {
							// Even with API enabled, support form data
							data.hostname = formData.get('hostname') as string;
							data.props = formData.get('props') ? JSON.parse(formData.get('props') as string) : null;
							data.design = formData.get('design') ? JSON.parse(formData.get('design') as string) : null;
							data.authority = formData.get('authority') as string;
							data.membership = formData.get('membership') as string;
						}
					} else {
						throw error(403, 'Invalid or expired API token');
					}
				} else if (!kvData.postForm) {
					throw error(403, 'API access requires bearer token');
				}
			}

			// Check if post form is allowed (can be allowed together with API)
			if (!isAuthorized && kvData.postForm === true) {
				isAuthorized = true;
			}
		}

		// If no authority or not authorized by API/form, check origin
		if (!isAuthorized) {
			const origin = request.headers.get('origin');
			if (origin !== url.origin) {
				throw error(403, 'Unauthorized request origin');
			}
		}

		// Parse form data for non-API requests or if not yet parsed
		if (Object.keys(data).length === 0) {
			data.hostname = formData.get('hostname') as string;
			data.props = formData.get('props') ? JSON.parse(formData.get('props') as string) : null;
			data.design = formData.get('design') ? JSON.parse(formData.get('design') as string) : null;
			data.authority = formData.get('authority') as string;
			data.membership = formData.get('membership') as string;
		}

		try {
			const props = data.props;
			const design = data.design || {};
			const hostname = data.hostname;
			const membership = data.membership;

			// Required fields validation
			if (!hostname) {
				throw error(400, 'Missing required field: hostname');
			}
			if (!props) {
				throw error(400, 'Missing required field: props');
			}

			// Required fields in props
			const requiredFieldsInProps = ['network', 'params', 'destination'];
			for (const field of requiredFieldsInProps) {
				if (!props[field]) {
					throw error(400, `Missing required field in props: ${field}`);
				}
			}

			// Basic pass data structure
			const bareLink = getLink(hostname, props);
			const org = kvData.name || (design.org || (authorityField?.toUpperCase()) || 'PayTo');
			const originator = kvData.id || 'payto';
			const originatorName = kvData.name || 'PayTo';
			const memberAddress = membership || props.destination;
			const serialId = getFileId([originator, memberAddress, props.destination, hostname, props.network]);
			const fileId = getFileId([originator, memberAddress, props.destination, hostname, props.network], '-', true, false);
			const explorerUrl = getExplorerUrl(props.network, { address: props.destination });
			const customCurrencyData = kvData.customCurrency || {};
			const currency = getCurrency(props.network, hostname as ITransitionType);

			if (hostname === 'void' && props.network === 'plus') {
				const plusCoordinates = getLocationCode(props.params.loc?.value || '');
				props.params.lat = { value: plusCoordinates[0] };
				props.params.lon = { value: plusCoordinates[1] };
			}

			const basicData = {
				serialNumber: serialId,
				passTypeIdentifier: kvData.identifier || 'pass.money.payto',
				organizationName: org,
				logoText: getLogoText(hostname, props),
				description: 'Wallet by ' + org,
				expirationDate: new Date((props.params.dl.value || (kvData.id ? (Date.now() + 2 * 365 * 24 * 60 * 60 * 1000) : (Date.now() + 365 * 24 * 60 * 60 * 1000)))).toISOString(),
				backgroundColor: validColors(design.colorB, design.colorF) ? design.colorB : (kvData.theme.colorB || '#2A3950'),
				foregroundColor: validColors(design.colorF, design.colorB) ? design.colorF : (kvData.theme.colorF || '#9AB1D6'),
				labelColor: validColors(design.colorF, design.colorB) ? design.colorF : (kvData.theme.colorTxt || '#9AB1D6'),
				url: bareLink,
				...(hostname === 'void' && (props.network === 'geo' || props.network === 'plus') ? {
					locations: [
						{
							latitude: props.params.lat?.value,
							longitude: props.params.lon?.value,
							relevantText: props.params.message?.value ? props.params.message.value : 'Payment location'
						}
					]
				} : {}),
				...(kvData.url ? {
					orgUrl: kvData.url
				} : {})
			};

			const passData = {
				...basicData,
				formatVersion: 1,
				teamIdentifier: teamIdentifier,

				// NFC configuration
				nfc: {
					message: bareLink
				},

				// Primary barcode (selected type)
				barcode: {
					format: design.barcode === 'aztec'
						? 'PKBarcodeFormatAztec'
						: design.barcode === 'code128'
							? 'PKBarcodeFormatCode128'
							: `PKBarcodeFormat${design.barcode.toUpperCase()}`,
					message: bareLink,
					messageEncoding: 'iso-8859-1'
				},

				// All supported barcodes
				barcodes: [
					{
						format: 'PKBarcodeFormatQR',
						message: bareLink,
						messageEncoding: 'iso-8859-1'
					},
					{
						format: 'PKBarcodeFormatPDF417',
						message: bareLink,
						messageEncoding: 'iso-8859-1'
					},
					{
						format: 'PKBarcodeFormatAztec',
						message: bareLink,
						messageEncoding: 'iso-8859-1'
					},
					{
						format: 'PKBarcodeFormatCode128',
						message: bareLink,
						messageEncoding: 'iso-8859-1'
					}
				],

				// Pass fields
				headerFields: [
					{
						key: 'payment',
						label: props.params.donate?.value !== 0 ? 'Donation' : 'Payment',
						value: hostname && hostname === 'void' ? 'CASH' : hostname.toUpperCase() + (props.network ? ': ' + props.network.toUpperCase() : '')
					}
				],
				primaryFields: [
					{
						key: 'amount',
						label: 'Amount',
						value:
							props.params.amount.value && Number(props.params.amount.value) > 0 ?
								formatter(currency, (kvData.currencyLocale || undefined), customCurrencyData).format(Number(props.params.amount.value)) :
								`Custom Amount`
					}
				],
				secondaryFields: [
					...(props.design.item ? [{
						key: 'item',
						label: 'Item',
						value: props.design.item
					}] : []),
					{
						key: 'type',
						label: 'Type',
						value: props.params.rc?.value ? `Recurring ${props.params.rc.value.toUpperCase()}` : 'One-time'
					},
					...(hostname === 'ican' ? [{
						key: 'received',
						label: 'Received',
						value: 'Click to view transactions',
						attributedValue: explorerUrl || '',
						dataDetectorTypes: ["PKDataDetectorTypeLink"]
					}] : []),
				],
				auxiliaryFields: [
					...(props.params.amount.value && Number(props.params.amount.value) > 0 && props.split?.value ? [{
						key: 'split',
						label: 'Split',
						value: props.split.isPercent ?
							`${Number(props.split.value)}%` :
							formatter(currency, (kvData.currencyLocale || undefined), customCurrencyData).format(Number(props.split.value))
					}] : []),
					...(props.params.message?.value ? [{
						key: 'message',
						label: 'Message',
						value: props.params.message.value
					}] : []),
					...(props.params.amount.value && Number(props.params.amount.value) > 0 && props.split?.value && props.split?.address ? [{
						key: 'split-address',
						label: 'Split Receiving Address',
						value: props.split.address
					}] : []),
					{
						key: 'pro',
						label: 'Pro',
						value: `Activate Pro`,
						attributedValue: `${proUrl}?originator=${originator}&subscriber=${memberAddress}&destination=${props.destination}&network=${props.network}`,
						dataDetectorTypes: ["PKDataDetectorTypeLink"]
					},
				],
				backFields: [
					...(hostname === 'ican' ? [{
						key: 'balance',
						label: `Balances`,
						value: 'Click to view',
						attributedValue: explorerUrl || '',
						dataDetectorTypes: ["PKDataDetectorTypeLink"]
					}] : []),
					{
						key: 'issuer',
						label: 'Issuer',
						value: `This Pass is issued by: ${originatorName}`,
						attributedValue: `${basicData.orgUrl ? basicData.orgUrl : (kvData.name ? '' : 'https://payto.money')}`,
						dataDetectorTypes: ["PKDataDetectorTypeLink"]
					},
				]
			};

			const zip = new JSZip();
			zip.file('pass.json', JSON.stringify(passData, null, 2));

			// Add default images (should be loaded from assets)
			const defaultImages: Record<string, ArrayBuffer> = {};

			await Promise.all([
				fetch(kvData.icons.icon)
					.then(res => res.ok ? res.arrayBuffer() : null)
					.then(buffer => { if (buffer) defaultImages['icon.png'] = buffer; })
					.catch(() => {}),
				fetch(kvData.icons.icon2x)
					.then(res => res.ok ? res.arrayBuffer() : null)
					.then(buffer => { if (buffer) defaultImages['icon@2x.png'] = buffer; })
					.catch(() => {}),
				fetch(kvData.icons.icon3x)
					.then(res => res.ok ? res.arrayBuffer() : null)
					.then(buffer => { if (buffer) defaultImages['icon@3x.png'] = buffer; })
					.catch(() => {}),
				fetch(kvData.icons.logo)
					.then(res => res.ok ? res.arrayBuffer() : null)
					.then(buffer => { if (buffer) defaultImages['logo.png'] = buffer; })
					.catch(() => {}),
				fetch(kvData.icons.logo2x)
					.then(res => res.ok ? res.arrayBuffer() : null)
					.then(buffer => { if (buffer) defaultImages['logo@2x.png'] = buffer; })
					.catch(() => {}),
				fetch(kvData.icons.logo3x)
					.then(res => res.ok ? res.arrayBuffer() : null)
					.then(buffer => { if (buffer) defaultImages['logo@3x.png'] = buffer; })
					.catch(() => {})
			]);

			// Add images to zip
			for (const [fileName, fileContent] of Object.entries(defaultImages)) {
				zip.file(fileName, fileContent);
			}

			// Create manifest
			const manifest: Record<string, string> = {};
			for (const fileName in zip.files) {
				const fileContent = await zip.files[fileName].async('arraybuffer');
				const hashBuffer = await crypto.subtle.digest('SHA-1', fileContent);
				const hashArray = Array.from(new Uint8Array(hashBuffer));
				const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
				manifest[fileName] = hashHex;
			}
			zip.file('manifest.json', JSON.stringify(manifest, null, 2));

			// Create signature using KV private key
			const privateKeyObj = forge.pki.privateKeyFromPem(privateKey);
			const manifestText = JSON.stringify(manifest, null, 2);
			const signature = forge.util.encode64(
				privateKeyObj.sign(forge.md.sha1.create().update(manifestText))
			);
			zip.file('signature', new Uint8Array(forge.util.binary.base64.decode(signature)));

			// Generate the .pkpass file
			const pkpassBlob = await zip.generateAsync({ type: 'blob' });

			if (pkpassBlob && enableStats) {
				// Send anonymized stats to Supabase
				// @ts-expect-error: Supabase client is not initialized
				await supabase
					.from('passes_stats')
					.insert([
						{
							hostname, // Type of payment (string)
							network: props.network, // Network used (string)
							currency: currency, // Currency used (string)
							...(props.params.amount.value ? { amount: props.params.amount.value } : {}), // Amount of payment (number)
							...(design.org ? { custom_org: true } : {}), // Custom organization name (boolean)
							...(props.params.donate?.value ? { donate: true } : {}), // Donation (boolean)
							...(props.params.rc?.value ? { recurring: true } : {}), // Recurring (boolean)
							...(design.colorF ? { color_f: design.colorF } : {}), // Foreground color (string)
							...(design.colorB ? { color_b: design.colorB } : {}), // Background color (string)
							...(props.params.split?.value ? { split: true } : {}), // Split (boolean)
							...(authority ? { authority } : {}), // Authority used (string)
						}
					])
					.select();
			}

			return new Response(pkpassBlob, {
				headers: {
					'Content-Type': 'application/vnd.apple.pkpass',
					'Content-Disposition': `attachment; filename="${fileId}.pkpass"`
				}
			});
		} catch (err) {
			console.error('Failed to generate pass:', err);
			throw error(500, 'Failed to generate pass');
		}
	}
} satisfies Actions;
