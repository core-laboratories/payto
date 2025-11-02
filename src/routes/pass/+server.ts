import { error, json } from '@sveltejs/kit';
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
import * as jose from 'jose';

/* ----------------------------------------------------------------
 * Env vars
 * ----------------------------------------------------------------
 * Apple (iOS)
 *   PRIVATE_PASS_TEAM_IDENTIFIER           -> Apple Team ID
 *   PRIVATE_PASS_P12_BASE64                -> base64-encoded Pass Type ID .p12
 *   PRIVATE_PASS_P12_PASSWORD              -> password for the .p12
 *   PRIVATE_WWDR_PEM                       -> Apple WWDR certificate (PEM text)
 *   PRIVATE_PASS_TYPE_IDENTIFIER           -> e.g., "pass.money.payto" (should match the certificate)
 *
 * Google Wallet (Android)
 *   PRIVATE_GW_ISSUER_ID                   -> your Google Wallet issuerId
 *   PRIVATE_GW_SA_EMAIL                    -> service account email
 *   PRIVATE_GW_SA_PRIVATE_KEY              -> service account private key (PEM)
 *   Note: Class is created dynamically, no PRIVATE_GW_CLASS_ID needed
 *
 * Optional
 *   PRIVATE_SUPABASE_URL
 *   PRIVATE_SUPABASE_KEY
 *   PRIVATE_API_TOKEN_TIMEOUT              -> default minutes (string int)
 *   PUBLIC_ENABLE_STATS                    -> enable stats (boolean)
 *   PUBLIC_PRO_URL                         -> public pro URL
 *   PUBLIC_DEV_SERVER_URL                  -> development server URL (default: http://localhost:5173)
 * ---------------------------------------------------------------- */

const teamIdentifier = env.PRIVATE_PASS_TEAM_IDENTIFIER;
if (!teamIdentifier) {
	throw new Error('Team identifier is required');
}

const passTypeIdentifier = env.PRIVATE_PASS_TYPE_IDENTIFIER || 'pass.money.payto';

const p12Base64 = env.PRIVATE_PASS_P12_BASE64;
const p12Password = env.PRIVATE_PASS_P12_PASSWORD;
const wwdrPem = env.PRIVATE_WWDR_PEM;

// Google Wallet
const gwIssuerId = env.PRIVATE_GW_ISSUER_ID || '';
const gwSaEmail = env.PRIVATE_GW_SA_EMAIL || '';
const gwSaKeyPem = env.PRIVATE_GW_SA_PRIVATE_KEY || '';
const isDev = process.env.NODE_ENV === 'development';
const devServerUrl = publicEnv.PUBLIC_DEV_SERVER_URL || 'http://localhost:5173';

// Optional
const proUrl = publicEnv.PUBLIC_PRO_URL || 'https://payto.money/activate/pro';
const enableStats = PUBLIC_ENABLE_STATS === 'true' ? true : false;
const apiTokenTimeout = parseInt(env.PRIVATE_API_TOKEN_TIMEOUT || '1', 10); // Default: 1 minute

/* ------------------ helpers ------------------ */

function getImageUrls(kvData: any, isDev: boolean, devServerUrl: string) {
	const baseUrl = isDev ? devServerUrl : 'https://payto.money';

	return {
		// Apple Wallet images (packed in zip)
		apple: {
			icon: kvData?.icons?.apple?.icon || `${baseUrl}/images/paypass/apple-wallet/icon.png`,
			icon2x: kvData?.icons?.apple?.icon2x || `${baseUrl}/images/paypass/apple-wallet/icon@2x.png`,
			icon3x: kvData?.icons?.apple?.icon3x || `${baseUrl}/images/paypass/apple-wallet/icon@3x.png`,
			logo: kvData?.icons?.apple?.logo || `${baseUrl}/images/paypass/apple-wallet/logo.png`,
			logo2x: kvData?.icons?.apple?.logo2x || `${baseUrl}/images/paypass/apple-wallet/logo@2x.png`,
			logo3x: kvData?.icons?.apple?.logo3x || `${baseUrl}/images/paypass/apple-wallet/logo@3x.png`
		},
		// Google Wallet images (URLs)
		google: {
			logo: kvData?.icons?.google?.logo || `${baseUrl}/images/paypass/google-wallet/logo.png`,
			icon: kvData?.icons?.google?.icon || `${baseUrl}/images/paypass/google-wallet/icon.png`,
			hero: kvData?.icons?.google?.hero || `${baseUrl}/images/paypass/google-wallet/hero.png`,
			fullWidth: kvData?.icons?.google?.fullWidth || `${baseUrl}/images/paypass/google-wallet/full-width.png`
		}
	};
}

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

function getTitleText(hostname: string, props: any, currency?: string) {
	const currencyValue = props.currency?.value || currency || '';
	const currencyText =
		currencyValue && currencyValue.length < 6
			? currencyValue.toUpperCase()
			: (props.network?.toUpperCase() || hostname.toUpperCase());
	const destinationText =
		props.destination?.length > 8
			? props.destination.slice(0, 4).toUpperCase() + '…' + props.destination.slice(-4).toUpperCase()
			: (props.destination?.toUpperCase() || '');
	return `${currencyText} ${destinationText}`;
}

/**
 * Get barcode configuration for Apple and Google Wallet based on selected type
 * Maps user selection to wallet-specific format requirements
 * For Google-only formats, falls back to QR Code for Apple
 */
function getBarcodeConfig(barcodeType: string, message: string) {
	const appleFormatMap: Record<string, string> = {
		'qr': 'PKBarcodeFormatQR',
		'pdf417': 'PKBarcodeFormatPDF417',
		'aztec': 'PKBarcodeFormatAztec',
		'code128': 'PKBarcodeFormatCode128'
	};

	const googleTypeMap: Record<string, string> = {
		'qr': 'qrCode',
		'pdf417': 'pdf417',
		'aztec': 'aztec',
		'code128': 'code128',
		'upca': 'upcA',
		'ean13': 'ean13',
		'code39': 'code39'
	};

	const normalizedType = barcodeType?.toLowerCase() || 'qr';

	// For Apple, fallback to QR if barcode not supported
	const appleFormat = appleFormatMap[normalizedType] || 'PKBarcodeFormatQR';

	return {
		apple: {
			format: appleFormat,
			message,
			messageEncoding: 'iso-8859-1'
		},
		google: {
			type: googleTypeMap[normalizedType] || 'qrCode',
			value: message,
			alternateText: 'Scan to pay'
		}
	};
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

	if (token !== expectedToken) return false;
	if (tokenData.exp < Date.now()) return false;

	return true;
}

function getFormattedDateTime(includeTimezone: boolean = true) {
	const now = new Date();
	const formattedDateTime = now.toISOString().replace(/[-T:]/g, '').slice(2, 12);
	if (includeTimezone) {
		const offsetMinutes = now.getTimezoneOffset();
		const hours = String(Math.abs(Math.floor(offsetMinutes / 60))).padStart(2, '0');
		const minutes = String(Math.abs(offsetMinutes % 60)).padStart(2, '0');
		const sign = offsetMinutes > 0 ? '-' : '+';
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
		customCurrency: customCurrencyData
	});
};

/* ------------------ optional Supabase stats ------------------ */

let supabase: ReturnType<typeof createClient> | null = null;
if (enableStats) {
	const supabaseUrl = env.PRIVATE_SUPABASE_URL;
	const supabaseKey = env.PRIVATE_SUPABASE_KEY;
	if (!supabaseUrl || !supabaseKey) {
		console.warn('Supabase credentials not found. Stats will be disabled.');
	} else {
		supabase = createClient(supabaseUrl, supabaseKey);
	}
}

/* ----------------------------------------------------------------
 * Apple: manifest (SHA-1) + PKCS#7 (CMS) detached signature helpers
 * ---------------------------------------------------------------- */

async function buildAppleManifest(files: Record<string, ArrayBuffer>): Promise<string> {
	const manifest: Record<string, string> = {};
	for (const [name, content] of Object.entries(files)) {
		const u8 = new Uint8Array(content);
		const b = forge.util.createBuffer(u8 as unknown as string);
		const md = forge.md.sha1.create();
		md.update(b.getBytes());
		manifest[name] = md.digest().toHex();
	}
	return JSON.stringify(manifest, null, 2);
}

function signAppleManifestPKCS7({
	manifestText,
	p12Base64,
	p12Password,
	wwdrPem
}: {
	manifestText: string;
	p12Base64: string;
	p12Password: string;
	wwdrPem: string;
}): Uint8Array {
	const p12Der = forge.util.decode64(p12Base64);
	const p12Asn1 = forge.asn1.fromDer(p12Der);
	const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, p12Password);

	let privateKey: forge.pki.PrivateKey | null = null;
	let cert: forge.pki.Certificate | null = null;

	for (const safeContent of p12.safeContents) {
		for (const safeBag of safeContent.safeBags) {
			if (safeBag.type === forge.pki.oids.pkcs8ShroudedKeyBag) {
				privateKey = safeBag.key || null;
			} else if (safeBag.type === forge.pki.oids.certBag) {
				cert = safeBag.cert || cert;
			}
		}
	}
	if (!privateKey || !cert) throw new Error('Failed to extract key/cert from P12');

	const wwdrCert = forge.pki.certificateFromPem(wwdrPem);

	const p7 = forge.pkcs7.createSignedData();
	p7.content = forge.util.createBuffer(manifestText, 'utf8');
	p7.addCertificate(cert);
	p7.addCertificate(wwdrCert);
	p7.addSigner({
		key: privateKey,
		certificate: cert,
		digestAlgorithm: forge.pki.oids.sha256,
		authenticatedAttributes: [
			{ type: forge.pki.oids.contentType, value: forge.pki.oids.data },
			{ type: forge.pki.oids.messageDigest },
			{ type: forge.pki.oids.signingTime, value: new Date().toISOString() }
		]
	});
	p7.sign({ detached: true });

	const derBytes = forge.asn1.toDer(p7.toAsn1()).getBytes();
	const out = new Uint8Array(derBytes.length);
	for (let i = 0; i < derBytes.length; i++) out[i] = derBytes.charCodeAt(i);
	return out;
}

/* ----------------------------------------------------------------
 * Google Wallet: build Generic Object + sign JWT (Save link)
 *	Minimal-change version that:
 *	- Uses a STABLE classId (do not create a random class each time)
 *	- Uses a UNIQUE objectId per issuance to get a fresh pass every time
 * ---------------------------------------------------------------- */

async function buildGoogleWalletSaveLink({
	issuerId,
	saEmail,
	saPrivateKeyPem,
	classId, // <- new: stable class id injected from caller
	logoUrl,
	iconUrl,
	heroUrl,
	subheaderText,
	hexBackgroundColor,
	barcode,
	payload
}: {
	issuerId: string;
	saEmail: string;
	saPrivateKeyPem: string;
	classId: string;
	logoUrl: string;
	iconUrl: string;
	heroUrl?: string;
	subheaderText?: string;
	hexBackgroundColor?: string;
	barcode: any;
	payload: {
		id: string;              // unique object id (<=64 chars): `${issuerId}.paypass.<...>`
		title: string;           // title at the top
		qrValue: string;         // QR payload
		amountText?: string;     // "Amount ..." (text, already formatted)
		typeText?: string;       // e.g., "One-time" / "Recurring"
		explorerUrl?: string;
		proUrl?: string;
		extraBlocks?: Array<{ header: string; body: string }>;
	}
}): Promise<{ saveUrl: string; classId: string; gwObject: any; gwClass: any }> {
	// Reuse a stable class (create once; reuse forever). If it doesn't exist,
	// Google will auto-create it via the Save-to-Wallet JWT.
	const gwClass: any = {
		id: classId,
		issuerName: payload.title || 'PayPass',
		...(hexBackgroundColor ? { hexBackgroundColor } : {})
	};

	let textModules: Array<{ header: string; body: string }> = [
		...(payload.amountText ? [{ header: 'Amount', body: payload.amountText }] : []),
		...(payload.typeText ? [{ header: 'Type', body: payload.typeText }] : []),
		...(payload.extraBlocks || [])
	];

	// Normalize text modules
	textModules = textModules
		.map(m => ({
			header: (m.header && String(m.header).trim()) || 'Details',
			body: (m.body && String(m.body).trim()) || (payload.title || 'PayPass')
		}))
		.filter(m => m.header.length > 0 && m.body.length > 0);

	textModules.unshift({ header: 'PayPass', body: payload.title || 'PayPass' });

	const gwObject: any = {
		id: payload.id,
		classId: classId,
		state: 'active',

		cardTitle: { defaultValue: { language: 'en-US', value: payload.title || 'PayPass' } },
		header:    { defaultValue: { language: 'en-US', value: 'Pay' } },
		...(subheaderText
			? { subheader: { defaultValue: { language: 'en-US', value: subheaderText } } }
			: {}),

		logo: { sourceUri: { uri: logoUrl } },
		...(heroUrl ? { heroImage: { sourceUri: { uri: heroUrl } } } : {}),

		barcode: barcode || {
			type: 'qrCode',
			value: payload.qrValue,
			alternateText: 'Scan to pay'
		},

		smartTapRedemptionValue: payload.qrValue,

		textModulesData: textModules.map(m => ({ header: m.header, body: m.body })),

		linksModuleData: {
			uris: [
				{ kind: 'walletobjects#uri', uri: payload.qrValue, description: 'Online PayPass' },
				...(payload.explorerUrl ? [{ kind: 'walletobjects#uri', uri: payload.explorerUrl, description: 'View transactions' }] : []),
				...(payload.proUrl ? [{ kind: 'walletobjects#uri', uri: payload.proUrl, description: 'Activate Pro' }] : [])
			]
		},

		imageModulesData: [
			{
				id: 'icon',
				mainImage: {
					sourceUri: { uri: iconUrl },
					contentDescription: { defaultValue: { language: 'en-US', value: 'Icon' } }
				}
			}
		]
	};

	// Build Save to Google Wallet JWT
	const now = Math.floor(Date.now() / 1000);
	const jwtPayload = {
		iss: saEmail,
		aud: 'google',
		typ: 'savetowallet',
		iat: now,
		payload: {
			genericClasses: [gwClass],
			genericObjects: [gwObject]
		}
	};

	console.log('Google Wallet Debug:', {
		classId: classId,
		objectId: gwObject.id,
		gwClass,
		gwObject: JSON.stringify(gwObject, null, 2)
	});

	const alg = 'RS256';
	const privateKey = await jose.importPKCS8(saPrivateKeyPem, alg);
	const jwt = await new jose.SignJWT(jwtPayload as any)
		.setProtectedHeader({ alg, typ: 'JWT' })
		.sign(privateKey);

	return { saveUrl: `https://pay.google.com/gp/v/save/${jwt}`, classId, gwObject, gwClass };
}

/* ----------------------------------------------------------------
 * Route
 * ---------------------------------------------------------------- */

export async function POST({ request, url, fetch }: RequestEvent) {
	const contentType = request.headers.get('content-type') || '';
	let data: any = {};

	// Authority bootstrap
	let authorityField: string | null = null;
	let authorityItem: string = 'payto';
	let kvData: any = null;
	let authority: string | null = null;

	// Accept JSON or multipart/form-data
	if (contentType.includes('application/json')) {
		const jsonData = await request.json();
		authorityField = jsonData.authority || null;
		data = jsonData;
		data.os = data.os || '';
	} else {
		const formData = await request.formData();
		authorityField = (formData.get('authority') as string) || url.searchParams.get('authority');
		data.hostname = formData.get('hostname') as string;
		data.props = formData.get('props') ? JSON.parse(formData.get('props') as string) : null;
		data.design = formData.get('design') ? JSON.parse(formData.get('design') as string) : null;
		data.authority = formData.get('authority') as string;
		data.membership = formData.get('membership') as string;
		data.os = (formData.get('os') as string) || url.searchParams.get('os') || '';

		const formDestination = formData.get('destination') as string;
		if (formDestination && data.props) data.props.destination = formDestination;
	}

	// Load authority KV
	if (authorityField) {
		authorityItem = authorityField.toLowerCase();
		kvData = await KV.get(authorityItem);
		if (kvData && (!kvData.id || !kvData.identifier)) {
			throw error(400, `Invalid or missing configuration for authority: ${authorityItem}`);
		}
		authority = kvData.id;
	}

	// Authorization flow
	let isAuthorized = false;
	if (authority && kvData) {
		if (kvData.api?.allowed === true) {
			const authHeader = request.headers.get('authorization');
			const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
			if (bearerToken && kvData.api?.secret) {
				const payload = { authority: authorityItem };
				if (verifyToken(bearerToken, payload, kvData.api.secret)) {
					isAuthorized = true;
				} else {
					throw error(403, 'Invalid or expired API token');
				}
			} else if (!kvData.postForm) {
				throw error(403, 'API access requires bearer token');
			}
		}
		if (!isAuthorized && kvData.postForm === true) isAuthorized = true;
	}
	if (!isAuthorized) {
		const origin = request.headers.get('origin');
		if (origin !== url.origin) throw error(403, 'Unauthorized request origin');
	}

	try {
		const props = data.props;
		const design = data.design || {};
		const hostname = data.hostname;
		const membership = data.membership;
		const os = (data.os || url.searchParams.get('os') || '').toLowerCase();

		if (!hostname) throw error(400, 'Missing required field: hostname');
		if (!props) throw error(400, 'Missing required field: props');
		if (!os || (os !== 'ios' && os !== 'android')) throw error(400, 'Missing or invalid required field: os (must be "ios" or "android")');

		for (const field of ['network', 'params', 'destination']) {
			if (!props[field]) throw error(400, `Missing required field in props: ${field}`);
		}

		// Build shared business data
		const bareLink = getLink(hostname, props);
		const org = kvData?.name ? 'PayPass FF1 · ' + kvData.name : (design.org ? 'PayPass FF2 · ' + design.org : 'PayPass FF3');
		const originator = kvData?.id || 'payto';
		const originatorName = kvData?.name || 'PayTo';
		const memberAddress = membership || props.destination;

		const serialId = getFileId([originator, memberAddress, props.destination, hostname, props.network]);
		const fileId = getFileId([originator, memberAddress, props.destination, hostname, props.network], '-', true, false);
		const explorerUrl = getExplorerUrl(props.network, { address: props.destination });
		const customCurrencyData = kvData?.customCurrency || {};
		const currency = getCurrency(props.network, hostname as ITransitionType);

		if (hostname === 'void' && props.network === 'plus') {
			const plusCoordinates = getLocationCode(props.params.loc?.value || '');
			props.params.lat = { value: plusCoordinates[0] };
			props.params.lon = { value: plusCoordinates[1] };
		}

		const selectedBarcode = getBarcodeConfig(design.barcode || 'qr', bareLink);

		/* ---------------- OS switch ---------------- */

		if (os === 'android') {
			if (!gwIssuerId || !gwSaEmail || !gwSaKeyPem) {
				throw error(500, 'Google signing configuration missing (issuer/service account).');
			}

			// Amount & labels
			const amountText =
				(props.params.amount?.value && Number(props.params.amount.value) > 0)
					? formatter(currency, (kvData?.currencyLocale || undefined), customCurrencyData).format(Number(props.params.amount.value))
					: 'Custom Amount';

			const typeText = props.params.rc?.value ? `Recurring ${props.params.rc.value.toUpperCase()}` : 'One-time';
			const subheaderText = `${typeText} · ${amountText}`;

			// ---------- MINIMAL CHANGES FOR "NEW COPY EACH TIME" ----------
			// Use a STABLE class id and a UNIQUE object id (<= 64 chars)
			const classId = `${gwIssuerId}.paypass`; // stable class (create once, then reuse)
			const base = `${gwIssuerId}.paypass`;
			const ts = Math.floor(Date.now() / 1000);
			const nonce = crypto.randomUUID().split('-')[0]; // short 8-12 chars
			const uniquePart = `${serialId}`.replace(/[^a-zA-Z0-9]/g, '').slice(0, 16);
			const objectId = `${base}.${uniquePart}-${ts}-${nonce}`.replace(/[^a-zA-Z0-9._-]/g, '').slice(0, 64);
			// --------------------------------------------------------------

			// Get unified image URLs
			const imageUrls = getImageUrls(kvData, isDev, devServerUrl);
			const titleText = getTitleText(hostname, props, currency);

			const { saveUrl, classId: finalClassId, gwObject, gwClass } = await buildGoogleWalletSaveLink({
				issuerId: gwIssuerId,
				saEmail: gwSaEmail,
				saPrivateKeyPem: gwSaKeyPem,
				classId, // pass stable class id into builder
				logoUrl: imageUrls.google.logo,
				iconUrl: imageUrls.google.icon,
				heroUrl: imageUrls.google.hero,
				subheaderText,
				hexBackgroundColor: (kvData?.theme?.colorB || '#2A3950'),
				barcode: selectedBarcode.google,
				payload: {
					id: objectId,
					title: titleText,
					qrValue: getLink(hostname, props),
					amountText,
					typeText,
					explorerUrl: explorerUrl || undefined,
					proUrl: `${proUrl}?originator=${originator}&subscriber=${memberAddress}&destination=${props.destination}&network=${props.network}`,
					extraBlocks: (design.item ? [{ header: 'Item', body: design.item }] : [])
				}
			});

			// Optionally log stats (non-blocking)
			if (enableStats && supabase) {
				try {
					// @ts-ignore
					await (supabase as any).from('passes_stats')
						.insert([{
							hostname, network: props.network, currency,
							...(props.params.amount?.value ? { amount: props.params.amount.value } : {}),
							...(design.org ? { custom_org: true } : {}),
							...(props.params.donate?.value ? { donate: true } : {}),
							...(props.params.rc?.value ? { recurring: true } : {}),
							os: 'android',
							...(authority ? { authority } : {})
						}])
						.select();
				} catch (e) {
					console.warn('Failed to insert stats:', e);
				}
			}

			return json({ saveUrl, id: objectId, classId: finalClassId, gwObject, gwClass });
		}

		// iOS: Build .pkpass with proper PKCS#7 signature
		if (!p12Base64 || !p12Password || !wwdrPem) {
			throw error(500, 'Apple signing configuration missing (P12/WWDR).');
		}

		const basicData = {
			serialNumber: serialId,
			passTypeIdentifier,           // fixed value from env
			organizationName: org,
			logoText: getTitleText(hostname, props, currency),
			description: 'PayPass GG by ' + org,
			expirationDate: new Date(
				props.params.dl?.value || (kvData?.id ? (Date.now() + 2 * 365 * 24 * 60 * 60 * 1000) : (Date.now() + 365 * 24 * 60 * 60 * 1000))
			).toISOString(),
			backgroundColor: validColors(design.colorB, design.colorF) ? design.colorB : (kvData?.theme?.colorB || '#2A3950'),
			foregroundColor: validColors(design.colorF, design.colorB) ? design.colorF : (kvData?.theme?.colorF || '#9AB1D6'),
			labelColor: validColors(design.colorF, design.colorB) ? design.colorF : (kvData?.theme?.colorTxt || '#9AB1D6'),
			appLaunchURL: bareLink,
			...(hostname === 'void' && (props.network === 'geo' || props.network === 'plus') ? {
				locations: [
					{
						latitude: props.params.lat?.value,
						longitude: props.params.lon?.value,
						relevantText: props.params.message?.value ? props.params.message.value : 'Payment location'
					}
				]
			} : {})
		};

		const passData = {
			...basicData,
			formatVersion: 1,
			teamIdentifier: teamIdentifier,
			storeCard: {},  // Apple Wallet requires top-level style
			nfc: {
				message: bareLink,
				requiresAuthentication: true
			},
			barcodes: [selectedBarcode.apple],
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
						props.params.amount?.value && Number(props.params.amount.value) > 0
							? formatter(currency, (kvData?.currencyLocale || undefined), customCurrencyData).format(Number(props.params.amount.value))
							: 'Custom Amount'
				}
			],
			secondaryFields: [
				...(design.item ? [{ key: 'item', label: 'Item', value: design.item }] : []),
				{ key: 'type', label: 'Type', value: props.params.rc?.value ? `Recurring ${props.params.rc.value.toUpperCase()}` : 'One-time' },
				...(hostname === 'ican' ? [{
					key: 'received',
					label: 'Received',
					value: 'Click to view transactions',
					attributedValue: explorerUrl || '',
					dataDetectorTypes: ['PKDataDetectorTypeLink']
				}] : [])
			],
			auxiliaryFields: [
				...(props.params.amount?.value && Number(props.params.amount.value) > 0 && props.split?.value ? [{
					key: 'split',
					label: 'Split',
					value: props.split.isPercent
						? `${Number(props.split.value)}%`
						: formatter(currency, (kvData?.currencyLocale || undefined), customCurrencyData).format(Number(props.split.value))
				}] : []),
				...(props.params.message?.value ? [{ key: 'message', label: 'Message', value: props.params.message.value }] : []),
				...(props.params.amount?.value && Number(props.params.amount.value) > 0 && props.split?.value && props.split?.address ? [{
					key: 'split-address',
					label: 'Split Receiving Address',
					value: props.split.address
				}] : []),
				{
					key: 'pro',
					label: 'Pro',
					value: `Activate Pro`,
					attributedValue: `${proUrl}?originator=${originator}&subscriber=${memberAddress}&destination=${props.destination}&network=${props.network}`,
					dataDetectorTypes: ['PKDataDetectorTypeLink']
				}
			],
			backFields: [
				...(hostname === 'ican' ? [{
					key: 'balance',
					label: 'Balances',
					value: 'Click to view',
					attributedValue: explorerUrl || '',
					dataDetectorTypes: ['PKDataDetectorTypeLink']
				}] : []),
				{
					key: 'issuer',
					label: 'Issuer',
					value: `This PayPass HH is issued by: ${originatorName}`,
					attributedValue: `${kvData?.url || (kvData?.name ? '' : 'https://payto.money')}`,
					dataDetectorTypes: ['PKDataDetectorTypeLink']
				}
			],
			...(kvData?.beacons ? { beacons: kvData.beacons } : {})
		};

		// 1) Prepare files: pass.json + images
		const files: Record<string, ArrayBuffer> = {};
		files['pass.json'] = new TextEncoder().encode(JSON.stringify(passData, null, 2)).buffer;

		// Load images using unified image URLs
		const imageUrls = getImageUrls(kvData, isDev, devServerUrl);
		const defaultImages: Record<string, ArrayBuffer> = {};

		await Promise.all([
			fetch(imageUrls.apple.icon).then(r => r.ok ? r.arrayBuffer() : null).then(b => { if (b) defaultImages['icon.png'] = b; }).catch(() => {}),
			fetch(imageUrls.apple.icon2x).then(r => r.ok ? r.arrayBuffer() : null).then(b => { if (b) defaultImages['icon@2x.png'] = b; }).catch(() => {}),
			fetch(imageUrls.apple.icon3x).then(r => r.ok ? r.arrayBuffer() : null).then(b => { if (b) defaultImages['icon@3x.png'] = b; }).catch(() => {}),
			fetch(imageUrls.apple.logo).then(r => r.ok ? r.arrayBuffer() : null).then(b => { if (b) defaultImages['logo.png'] = b; }).catch(() => {}),
			fetch(imageUrls.apple.logo2x).then(r => r.ok ? r.arrayBuffer() : null).then(b => { if (b) defaultImages['logo@2x.png'] = b; }).catch(() => {}),
			fetch(imageUrls.apple.logo3x).then(r => r.ok ? r.arrayBuffer() : null).then(b => { if (b) defaultImages['logo@3x.png'] = b; }).catch(() => {})
		]);
		for (const [name, ab] of Object.entries(defaultImages)) files[name] = ab;

		// 2) manifest.json (SHA-1)
		const manifestText = await buildAppleManifest(files);

		// 3) signature (PKCS#7 DER detached)
		const signatureBytes = signAppleManifestPKCS7({
			manifestText,
			p12Base64,
			p12Password,
			wwdrPem
		});

		// 4) package zip
		const zip = new JSZip();
		for (const [name, ab] of Object.entries(files)) zip.file(name, ab);
		zip.file('manifest.json', manifestText);
		zip.file('signature', signatureBytes);

		const pkpassBlob = await zip.generateAsync({ type: 'blob' });

		// Optional stats
		if (enableStats && pkpassBlob && supabase) {
			try {
				// @ts-ignore
				await (supabase as any).from('passes_stats')
					.insert([{
						hostname, network: props.network, currency,
						...(props.params.amount?.value ? { amount: props.params.amount.value } : {}),
						...(design.org ? { custom_org: true } : {}),
						...(props.params.donate?.value ? { donate: true } : {}),
						...(props.params.rc?.value ? { recurring: true } : {}),
						os: 'ios',
						...(authority ? { authority } : {})
					}])
					.select();
			} catch (e) {
				console.warn('Failed to insert stats:', e);
			}
		}

		return new Response(pkpassBlob, {
			headers: {
				'Content-Type': 'application/vnd.apple.pkpass',
				'Content-Disposition': `attachment; filename="${fileId}.pkpass"`
			}
		});
	} catch (err: any) {
		console.error('Failed to generate pass:', err);
		if (err && typeof err === 'object' && 'status' in err && 'body' in err) {
			const httpErr = err as { status: number; body: { message?: string } };
			throw error(httpErr.status, httpErr.body?.message || 'Failed to generate pass');
		}
		throw error(500, err instanceof Error ? err.message : 'Failed to generate pass');
	}
}
