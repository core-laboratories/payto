import { error, json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { getValidBackgroundColor } from '$lib/helpers/color-validation.helper';
import { getLink } from '$lib/helpers/get-link.helper';
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
	formatter,
	getCodeText,
	getVerifiedOrganizationName,
	getExpirationDate
} from '$lib/helpers/paypass-operator.helper';
import { buildGoogleWalletPayPassSaveLink } from '$lib/helpers/paypass-android.helper';
import { buildAppleWalletPayPass } from '$lib/helpers/paypass-ios.helper';
import { createClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import { PUBLIC_ENABLE_STATS } from '$env/static/public';

/* ----------------------------------------------------------------
 * Env vars
 * ---------------------------------------------------------------- */

// Apple Wallet
const teamIdentifier = env.PRIVATE_PASS_TEAM_IDENTIFIER;
const passTypeIdentifier = env.PRIVATE_PASS_TYPE_IDENTIFIER;
const p12Base64 = env.PRIVATE_PASS_P12_BASE64;
const p12Password = env.PRIVATE_PASS_P12_PASSWORD;
const wwdrPem = env.PRIVATE_WWDR_PEM;

// Google Wallet
const gwIssuerId = env.PRIVATE_GW_ISSUER_ID;
const gwSaEmail = env.PRIVATE_GW_SA_EMAIL;
const gwSaKeyPem = env.PRIVATE_GW_SA_PRIVATE_KEY;
const isDev = import.meta.env.DEV;
const devServerUrl = publicEnv.PUBLIC_DEV_SERVER_URL || `http://localhost:${import.meta.env.VITE_DEV_SERVER_PORT || 5173}`;

// Base URL for links
const linkBaseUrl = isDev ? devServerUrl : 'https://payto.money';
const proUrlLink = `${linkBaseUrl}/activate/pro`;
const swapUrlLink = env.PUBLIC_SWAP_URL || `${linkBaseUrl}/swap`;

// Enable stats
const enableStats = PUBLIC_ENABLE_STATS === 'true' ? true : false;
const apiTokenTimeout = parseInt(env.PRIVATE_API_TOKEN_TIMEOUT || '1', 10);

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
		const bareLink = getLink(hostname, props);
		const designOrg = design.org ? design.org : null;
		const originator = kvData?.id || 'payto';
		const originatorName = kvData?.name;
		const memberAddress = membership || props.destination;

		const serialId = getFileId([originator, memberAddress, props.destination, hostname, props.network]);
		const fileId = getFileId([originator, memberAddress, props.destination, hostname, props.network], '-', true, false);
		const explorerUrl = getExplorerUrl(props.network, { address: props.destination }, true, linkBaseUrl);
		const customCurrencyData = kvData?.customCurrency || {};
		const currency = getCurrency(props, hostname as ITransitionType);
		const proUrl = `${proUrlLink}?origin=${originator}&subscriber=${memberAddress}&destination=${props.destination}&network=${props.network}`;
		const expirationDate = getExpirationDate(props.params?.dl?.value);
		const chainId = props.params.chainId?.value;
		const isRecurring = !!props.params.rc?.value;
		const isRtl = String(props.params.rtl?.value || '') === '1';
		const isDonate = String(props.params.donate?.value || '') === '1';
		const splitPayment = (
			!!props.params.split?.value &&
			props.params.split?.value > 0 &&
			props.params.split?.value < props.params.amount?.value &&
			props.params.split?.address &&
			props.destination &&
			props.params.split.address.toLowerCase() !== props.destination.toLowerCase()
		)
			? {
				value: props.params.split.value,
				formattedValue: formatter(currency, (kvData?.currencyLocale || undefined), customCurrencyData).format(Number(props.params.split.value)),
				isPercent: props.params.split.isPercent,
				address: props.params.split.address
			}
			: null;

		const companyName = standardizeOrg(originatorName);
		const orgName = await getVerifiedOrganizationName({
			org: designOrg,
			kvName: originatorName,
			address: props.destination,
			network: props.network
		});

		if (hostname === 'void' && props.network === 'plus') {
			const plusCoordinates = getLocationCode(props.params.loc?.value || '');
			props.params.lat = { value: plusCoordinates[0] };
			props.params.lon = { value: plusCoordinates[1] };
		}

		const amountValue =
			(props.params.amount?.value && Number(props.params.amount.value) > 0)
				? formatter(currency, (kvData?.currencyLocale || undefined), customCurrencyData).format(Number(props.params.amount.value))
				: null;
		const finalAmount = isRecurring && props.params.rc?.value && amountValue ? `🔁 ${amountValue} / ${props.params.rc.value}` : amountValue;

		/* ---------------- OS switch ---------------- */

		if (os === 'android') {

			/* -------------------------------------------------------------
			 * Class & Object ID generation
			 * -------------------------------------------------------------
			 * Use stable prefix per originator (authority) for classId
			 * and generate unique objectId for each pass instance.
			 * ------------------------------------------------------------- */

			const originatorSafe = originator.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

			// Make classId unique per pass so each template is honored
			const classSuffix = `${originatorSafe}.${serialId}`.replace(/[^a-zA-Z0-9._-]/g, '').slice(0, 40);
			const classId = `${gwIssuerId}.paypass.${classSuffix}`.slice(0, 255);

			const base = `${gwIssuerId}.paypass.${originatorSafe}`;
			const uniquePart = `${serialId}`.replace(/[^a-zA-Z0-9]/g, '').slice(0, 16);
			const ts = Math.floor(Date.now() / 1000);
			const nonce = crypto.randomUUID().split('-')[0];
			const objectId = `${base}.${uniquePart}-${ts}-${nonce}`.replace(/[^a-zA-Z0-9._-]/g, '').slice(0, 64);

			const imageUrls = getImageUrls(kvData, memberAddress, isDev, devServerUrl);
			const titleText = getTitleText(hostname, props, currency);
			const purposeText = getPurposeText(design);
			const codeText = getCodeText(isDonate, 'scan');

			const { saveUrl, classId: finalClassId, gwObject, gwClass } = await buildGoogleWalletPayPassSaveLink({
				issuerId: gwIssuerId,
				saEmail: gwSaEmail,
				saPrivateKeyPem: gwSaKeyPem,
				classId,
				logoUrl: imageUrls.google.logo,
				iconUrl: imageUrls.google.icon,
				heroUrl: imageUrls.google.hero,
				companyName,
				orgName,
				titleText,
				purposeLabel: 'Item',
				purposeText: purposeText,
				amountLabel: isRecurring ? (isDonate ? 'Recurring Donation' : 'Recurring Payment') : (isDonate ? 'Donation' : 'Payment'),
				amountText: finalAmount,
				//subheaderText: standardizeOrg(org) || 'Address',
				hexBackgroundColor: getValidBackgroundColor(design, kvData, '#2A3950'),
				barcode: getBarcodeConfig(design.barcode || 'qr', bareLink, codeText).google,
				donate: isDonate,
				rtl: isRtl,
				payload: {
					id: objectId,
					basicLink: getLink(hostname, props),
					fullLink: getLink(hostname, props, true, false),
					externalLink: getLink(hostname, props, true, true),
					explorerUrl: explorerUrl || undefined,
					proUrl,
					swapUrl: swapUrlLink,
					linkBaseUrl,
					props,
					expirationDate,
					chainId,
					redemptionIssuers: kvData?.data?.google?.redemptionIssuers || [],
					enableSmartTap: kvData?.data?.google?.enableSmartTap || true,
					splitPayment
				},
			});

			// Optional stats logging
			if (enableStats && supabase) {
				try {
					// @ts-ignore
					await (supabase as any).from('passes_stats')
						.insert([{
							hostname,
							network: props.network,
							currency,
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

			const pkpassBlob = await buildAppleWalletPayPass({
				serialId,
				passTypeIdentifier,
				teamIdentifier,
				org: orgName,
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

			if (enableStats && pkpassBlob && supabase) {
				try {
					// @ts-ignore
					await (supabase as any).from('passes_stats')
						.insert([{
							hostname,
							network: props.network,
							currency,
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
