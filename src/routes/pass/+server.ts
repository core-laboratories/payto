import { error, json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { getValidBackgroundColor } from '$lib/helpers/color-validation.helper';
import { getBasicLink, getFullLink, getExternalLink } from '$lib/helpers/get-link.helper';
import { getCurrency } from '$lib/helpers/get-currency.helper';
import { getExplorerUrl } from '$lib/helpers/tx-explorer.helper';
import { KV } from '$lib/helpers/kv.helper';
import { standardizeOrg } from '$lib/helpers/standardize.helper';
import {
	getImageUrls,
	getLocationCode,
	getTitleText,
	getPurposeText,
	getBarcodeConfig,
	generateToken,
	verifyToken,
	getFormattedDateTime,
	getFileId,
	formatter
} from '$lib/helpers/paypass-operator.helper';
import { buildGoogleWalletPayPassSaveLink } from '$lib/helpers/paypass-android.helper';
import { buildAppleWalletPayPass } from '$lib/helpers/paypass-ios.helper';
import { createClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import { PUBLIC_ENABLE_STATS } from '$env/static/public';

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
const passTypeIdentifier = env.PRIVATE_PASS_TYPE_IDENTIFIER;

const p12Base64 = env.PRIVATE_PASS_P12_BASE64;
const p12Password = env.PRIVATE_PASS_P12_PASSWORD;
const wwdrPem = env.PRIVATE_WWDR_PEM;

// Google Wallet
const gwIssuerId = env.PRIVATE_GW_ISSUER_ID;
const gwSaEmail = env.PRIVATE_GW_SA_EMAIL;
const gwSaKeyPem = env.PRIVATE_GW_SA_PRIVATE_KEY;
const isDev = process.env.NODE_ENV === 'development';
const devServerUrl = publicEnv.PUBLIC_DEV_SERVER_URL || 'http://localhost:5173';

// Optional
const proUrlLink = publicEnv.PUBLIC_PRO_URL || (isDev ? devServerUrl + '/activate/pro' : 'https://payto.money/activate/pro');
const enableStats = PUBLIC_ENABLE_STATS === 'true' ? true : false;
const apiTokenTimeout = parseInt(env.PRIVATE_API_TOKEN_TIMEOUT || '1', 10); // Default: 1 minute

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
				if (verifyToken(bearerToken, payload, kvData.api.secret, apiTokenTimeout)) {
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
		const bareLink = getBasicLink(hostname, props);
		const org = kvData?.name ? kvData.name : (design.org ? design.org : null);
		const originator = kvData?.id || 'payto';
		const originatorName = kvData?.name;
		const memberAddress = membership || props.destination;

		const serialId = getFileId([originator, memberAddress, props.destination, hostname, props.network]);
		const fileId = getFileId([originator, memberAddress, props.destination, hostname, props.network], '-', true, false);
		const explorerUrl = getExplorerUrl(props.network, { address: props.destination });
		const customCurrencyData = kvData?.customCurrency || {};
		const currency = getCurrency(props.network, hostname as ITransitionType);
		const proUrl = `${proUrlLink}?originator=${originator}&subscriber=${memberAddress}&destination=${props.destination}&network=${props.network}`;
		const expirationDate = props.params.dl?.value ? (props.params.dl?.value > 60 ? new Date(props.params.dl?.value).toISOString() : new Date(Date.now() + props.params.dl?.value * 60 * 1000).toISOString()) : null;
		const chainId = props.params.chainId?.value;

		if (hostname === 'void' && props.network === 'plus') {
			const plusCoordinates = getLocationCode(props.params.loc?.value || '');
			props.params.lat = { value: plusCoordinates[0] };
			props.params.lon = { value: plusCoordinates[1] };
		}

		/* ---------------- OS switch ---------------- */

		if (os === 'android') {
			// Amount & labels
			const amountText =
				(props.params.amount?.value && Number(props.params.amount.value) > 0)
					? formatter(currency, (kvData?.currencyLocale || undefined), customCurrencyData).format(Number(props.params.amount.value))
					: 'Custom Amount';

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
			const imageUrls = getImageUrls(kvData, memberAddress, isDev, devServerUrl);
			const titleText = getTitleText(hostname, props, currency);
			const donate = props.params.donate?.value === '1';
			const purposeText = getPurposeText(design, donate, true);

			const { saveUrl, classId: finalClassId, gwObject, gwClass } = await buildGoogleWalletPayPassSaveLink({
				issuerId: gwIssuerId,
				saEmail: gwSaEmail,
				saPrivateKeyPem: gwSaKeyPem,
				classId, // pass stable class id into builder
				logoUrl: imageUrls.google.logo,
				iconUrl: imageUrls.google.icon,
				heroUrl: imageUrls.google.hero,
				titleText,
				subheaderText: standardizeOrg(org) || 'Address',
				hexBackgroundColor: getValidBackgroundColor(design, kvData, '#2A3950'),
				barcode: getBarcodeConfig(design.barcode || 'qr', bareLink, purposeText).google,
				donate,
				payload: {
					id: objectId,
					companyName: kvData?.name,
					amountText,
					basicLink: getBasicLink(hostname, props),
					fullLink: getFullLink(hostname, props),
					externalLink: getExternalLink(hostname, props),
					explorerUrl: explorerUrl || undefined,
					proUrl,
					props,
					expirationDate,
					chainId
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
		} else if (os === 'ios') {
			// iOS: Build .pkpass with proper PKCS#7 signature
			const pkpassBlob = await buildAppleWalletPayPass({
				serialId,
				passTypeIdentifier,
				teamIdentifier,
				org,
				hostname,
				props,
				design,
				kvData,
				currency,
				bareLink,
				expirationDate,
				memberAddress,
				p12Base64,
				p12Password,
				wwdrPem,
				isDev,
				devServerUrl,
				explorerUrl,
				customCurrencyData,
				proUrl,
				fetch
			});

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

		} else {
			throw error(400, 'Invalid OS');
		}
	} catch (err: any) {
		console.error('Failed to generate pass:', err);
		if (err && typeof err === 'object' && 'status' in err && 'body' in err) {
			const httpErr = err as { status: number; body: { message?: string } };
			throw error(httpErr.status, httpErr.body?.message || 'Failed to generate pass');
		}
		throw error(500, err instanceof Error ? err.message : 'Failed to generate pass');
	}
}
