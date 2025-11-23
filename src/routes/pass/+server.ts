import { error, json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { getValidBackgroundColor, getValidForegroundColor, getAutoTextColor } from '$lib/helpers/color-validation.helper';
import { getLink } from '$lib/helpers/get-link.helper';
import { getCurrency } from '$lib/helpers/get-currency.helper';
import { getExplorerUrl } from '$lib/helpers/tx-explorer.helper';
import { KV } from '$lib/helpers/kv.helper';
import { standardizeOrg } from '$lib/helpers/standardize.helper';
import {
	getImageUrls,
	getLocationCode,
	getPurposeText,
	getBarcodeConfig,
	verifyToken,
	formatter,
	getCodeText,
	getVerifiedOrganizationName,
	getExpirationDate,
	base64ToUtf8
} from '$lib/helpers/paypass-operator.helper';
import { getTitleText } from '$lib/helpers/get-title-name.helper';
import { buildGoogleWalletPayPassSaveLink } from '$lib/helpers/paypass-android.helper';
import { buildAppleWalletPayPass } from '$lib/helpers/paypass-ios.helper';
import { createClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import { PUBLIC_ENABLE_STATS } from '$env/static/public';
import { getNetwork } from '$lib/helpers/get-network.helper';
import { getAddress } from '$lib/helpers/get-address.helper';

/* ----------------------------------------------------------------
 * Env vars
 * ---------------------------------------------------------------- */

// Apple Wallet
const teamIdentifier = env.PRIVATE_PASS_TEAM_IDENTIFIER;
const passTypeIdentifier = env.PRIVATE_PASS_TYPE_IDENTIFIER;
const p12Base64 = env.PRIVATE_PASS_P12_BASE64;
const p12Password = env.PRIVATE_PASS_P12_PASSWORD;
const wwdrPem_b64 = env.PRIVATE_WWDR_PEM;
const wwdrPem = base64ToUtf8(wwdrPem_b64);

// Google Wallet
const gwIssuerId = env.PRIVATE_GW_ISSUER_ID;
const gwSaEmail = env.PRIVATE_GW_SA_EMAIL;
const gwSaKeyPem_b64 = env.PRIVATE_GW_SA_PRIVATE_KEY;
const gwSaKeyPem = base64ToUtf8(gwSaKeyPem_b64);
const isDev = (import.meta.env.DEV || publicEnv.PUBLIC_ENV === 'preview')
const devServerUrl = publicEnv.PUBLIC_DEV_SERVER_URL || `http://localhost:${import.meta.env.VITE_DEV_SERVER_PORT || 5173}`;

// Base URL for links
const linkBaseUrl = isDev ? devServerUrl : 'https://payto.money';
const proUrlLink = `${linkBaseUrl}/activate/pro`;
const swapUrlLink = env.PUBLIC_SWAP_URL || `${linkBaseUrl}/swap`;

// Enable stats
const enableStats = PUBLIC_ENABLE_STATS === 'true';
const apiTokenTimeout = parseInt(env.PRIVATE_API_TOKEN_TIMEOUT || '1', 10);

/* ------------------ optional Supabase stats ------------------ */

let supabase: ReturnType<typeof createClient> | null = null;
if (enableStats) {
	const supabaseUrl = env.PRIVATE_SUPABASE_URL;
	const supabaseKey = env.PRIVATE_SUPABASE_KEY;
	if (!supabaseUrl || !supabaseKey) {
		console.warn('Supabase credentials not found. Stats disabled.');
	} else {
		supabase = createClient(supabaseUrl, supabaseKey);
	}
}

/* ----------------------------------------------------------------
 * Route handler
 * ---------------------------------------------------------------- */

export async function POST({ request, url, fetch }: RequestEvent) {
	const contentType = request.headers.get('content-type') || '';
	let data: any = {};

	/* ---------------- Parse payload ---------------- */

	let authorityField: string | null = null;
	let authorityItem = 'payto';
	let kvData: any = null;
	let authority: string | null = null;
	const baseOrigin = url.origin;

	if (contentType.includes('application/json')) {
		const jsonData = await request.json();
		authorityField = jsonData.authority || null;
		data = jsonData;
		data.os = data.os || '';
	} else {
		const form = await request.formData();
		authorityField = (form.get('authority') as string) || url.searchParams.get('authority');

		data.hostname = form.get('hostname') as string;
		data.props = form.get('props') ? JSON.parse(form.get('props') as string) : null;
		data.design = form.get('design') ? JSON.parse(form.get('design') as string) : null;
		data.authority = form.get('authority') as string;
		data.membership = form.get('membership') as string;
		data.os = (form.get('os') as string) || url.searchParams.get('os') || '';
		data.locale = (form.get('locale') as string) || url.searchParams.get('locale') || null;

		const dest = form.get('destination') as string;
		if (dest && data.props) data.props.destination = dest;
	}

	/* ---------------- Authority config ---------------- */

	if (authorityField) {
		authorityItem = authorityField.toLowerCase();
		kvData = await KV.get(authorityItem);
		if (!kvData?.id || !kvData?.identifier) {
			throw error(400, `Invalid authority: ${authorityItem}`);
		}
		authority = kvData.id;
	}

	/* ---------------- Authorization ---------------- */

	let isAuthorized = false;

	if (authority && kvData) {
		if (kvData.api?.allowed) {
			const authHeader = request.headers.get('authorization');
			const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

			if (token && kvData.api.secret) {
				const payload = { authority: authorityItem };
				if (verifyToken(token, payload, kvData.api.secret, apiTokenTimeout)) {
					isAuthorized = true;
				} else {
					throw error(403, 'Invalid or expired API token');
				}
			} else if (!kvData.postForm) {
				throw error(403, 'API access requires bearer token');
			}
		}

		if (!isAuthorized && kvData.postForm) isAuthorized = true;
	}

	if (!isAuthorized) {
		const origin = request.headers.get('origin');
		if (origin !== baseOrigin) throw error(403, 'Unauthorized origin');
	}

	/* ---------------- Begin generating pass ---------------- */

	try {
		const props = data.props;
		const design = data.design || {};
		const hostname = data.hostname;
		const membership = data.membership;
		const os = (data.os || '').toLowerCase();

		if (!hostname) throw error(400, 'Missing hostname');
		if (!props) throw error(400, 'Missing props');
		if (os !== 'ios' && os !== 'android') throw error(400, 'os must be "ios" or "android"');

		if (!props.network) throw error(400, 'Missing props.network');
		if (!props.params) throw error(400, 'Missing props.params');

		const network = getNetwork(props, hostname as ITransitionType);
		const destination = getAddress(props, hostname as ITransitionType);

		if (!network) throw error(400, 'Invalid network');
		if (!destination) throw error(400, 'Invalid destination');

		/* ---------------- Shared fields ---------------- */

		const bareLink = getLink(hostname, props);

		const originator = kvData?.id || 'payto';
		const originatorName = kvData?.name;
		const memberAddress = membership || destination;

		/* -------- Identifier (shared between Apple & Google) -------- */

		const originatorSafe = originator.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'payto';
		const randomComponent = crypto.randomUUID().replace(/[^a-zA-Z0-9]/g, '').slice(0, 24);

		// guaranteed <= 63 chars => valid Apple serialNumber
		const baseIdentifier = `${originatorSafe}.${randomComponent}`.slice(0, 63);
		const serialId = baseIdentifier;

		/* ------------------------------------------------------------- */

		const chainId = props.params.chainId?.value;
		const explorerUrl = getExplorerUrl(network, { address: destination, chain: chainId }, true, linkBaseUrl);
		const customCurrencyData = kvData?.customCurrency || {};
		const currency = getCurrency(props, network as ITransitionType, true);
		const expirationDate = getExpirationDate(props.params?.dl?.value);
		const isRecurring = !!props.params.rc?.value;
		const isRtl = String(props.params.rtl?.value || '') === '1';
		const isDonate = String(props.params.donate?.value || '') === '1';

		/* ---------------- Split payment ---------------- */

		const splitPayment =
			props.params.split?.value &&
			props.params.split.value > 0 &&
			props.params.amount?.value &&
			(props.params.split.isPercent ? Number(props.params.split.value) <= 100 : Number(props.params.split.value) <= Number(props.params.amount.value)) &&
			props.params.split.address &&
			destination &&
			props.params.split.address.toLowerCase() !== destination.toLowerCase()
				? {
						value: props.params.split.value,
						formattedValue: formatter(currency, kvData?.currencyLocale, customCurrencyData).format(Number(props.params.split.value)),
						isPercent: props.params.split.isPercent,
						address: props.params.split.address
				  }
				: null;

		const swap = props.params.swap?.value || null;

		const companyName = standardizeOrg(originatorName);
		const orgName = await getVerifiedOrganizationName({
			org: design.org || null,
			kvName: originatorName,
			address: destination,
			network
		});

		/* ---------------- pkpass file naming ---------------- */

		const filenameCompanyBase = (companyName && companyName.trim()) || 'PayPass';

		const safeCompany = filenameCompanyBase.replace(/[^a-zA-Z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
		const safeDestination = destination.replace(/[^a-zA-Z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

		const now = new Date();
		const dtPart =
			String(now.getFullYear()).slice(2) +
			String(now.getMonth() + 1).padStart(2, '0') +
			String(now.getDate()).padStart(2, '0') +
			String(now.getHours()).padStart(2, '0') +
			String(now.getMinutes()).padStart(2, '0');

		const pkpassFilename = `${safeCompany}-${safeDestination}-${dtPart}.pkpass`;

		/* ---------------- Location decode ---------------- */

		if (hostname === 'void' && network === 'plus') {
			const coords = getLocationCode(props.params.loc?.value || '');
			props.params.lat = { value: coords[0] };
			props.params.lon = { value: coords[1] };
		}

		/* ---------------- Amount formatting ---------------- */

		const amountValue =
			props.params.amount?.value && Number(props.params.amount.value) > 0
				? formatter(currency, kvData?.currencyLocale, customCurrencyData).format(Number(props.params.amount.value))
				: null;

		const finalAmount =
			amountValue
				? isRecurring
					? { value: amountValue, recurrence: { value: props.params.rc.value } }
					: { value: amountValue }
				: undefined;

		/* ---------------- Images, title, text ---------------- */

		const imageUrls = getImageUrls(kvData, destination, network, isDev, linkBaseUrl);

		const titleText = getTitleText(hostname, destination, props, currency, true);
		const purposeText = getPurposeText(design);
		const codeText = getCodeText(isDonate, 'scan');

		const fallbackLocale = data.locale || design.lang || 'en';
		const googleLocale = kvData?.data?.google?.locale || fallbackLocale;
		const appleLocale = kvData?.data?.apple?.locale || fallbackLocale;

		const appleBeacons = Array.isArray(kvData?.data?.apple?.beacons) ? kvData.data.apple.beacons : undefined;

		const backgroundColor = getValidBackgroundColor(design, kvData, '#2A3950');

		/* ---------------- OS switch ---------------- */

		if (os === 'android') {
			/* -------------------------------------------------------------
			 * Android / Google Wallet
			 * ------------------------------------------------------------- */

			const originatorSafeAndroid = originatorSafe;
			const classRandom =
				crypto.randomUUID().replace(/[^a-zA-Z0-9]/g, '').slice(0, 24) || `${Date.now()}`;
			const classId = `${gwIssuerId}.${originatorSafeAndroid}.${classRandom}`.slice(0, 255);
			const originId = crypto.randomUUID().replace(/[^a-zA-Z0-9]/g, '').slice(0, 32);

			// Google Wallet objectId must be issuerId + '.' + identifier, total length <= 64
			const maxObjectIdLength = 64;
			const issuerPrefix = `${gwIssuerId}.`;
			const maxIdentifierLength = maxObjectIdLength - issuerPrefix.length;
			const identifierPart = baseIdentifier.slice(0, Math.max(1, maxIdentifierLength));
			const objectId = `${issuerPrefix}${identifierPart}`;
			const proUrl = `${proUrlLink}?originid=${encodeURIComponent(originId)}&origin=${encodeURIComponent(originator)}&subscriber=${encodeURIComponent(memberAddress)}&destination=${encodeURIComponent(destination)}&network=${encodeURIComponent(network as string)}&os=android${googleLocale ? `&lang=${encodeURIComponent(googleLocale)}` : ''}`;
			const swapUrl = swapUrlLink;

			const { saveUrl, classId: finalClassId, gwObject, gwClass } =
				await buildGoogleWalletPayPassSaveLink({
					issuerId: gwIssuerId,
					saEmail: gwSaEmail,
					saPrivateKeyPem: gwSaKeyPem,
					classId,
					logoUrl: imageUrls.google.logo,
					iconUrl: imageUrls.google.icon,
					heroUrl: imageUrls.google.hero,
					companyName,
					orgName,
					titleText: titleText || undefined,
					amountType: { recurring: isRecurring, donate: isDonate },
					amountObject: finalAmount,
					purposeText,
					hexBackgroundColor: backgroundColor,
					barcode: getBarcodeConfig(design.barcode || 'qr', bareLink, codeText).google,
					donate: isDonate,
					rtl: isRtl,
					locale: googleLocale,
					payload: {
						id: objectId,
						basicLink: getLink(hostname, props),
						fullLink: getLink(hostname, props, design, false),
						externalLink: getLink(hostname, props, design, true),
						explorerUrl: explorerUrl || undefined,
						proUrl,
						swapUrl,
						linkBaseUrl,
						props,
						expirationDate,
						chainId,
						redemptionIssuers: kvData?.data?.google?.redemptionIssuers || [],
						enableSmartTap: kvData?.data?.google?.enableSmartTap ?? true,
						merchantLocations: kvData?.data?.google?.merchantLocation || [],
						splitPayment,
						swap
					}
				});

			// Optional stats logging
			if (enableStats && supabase) {
				try {
					// @ts-ignore
					await (supabase as any)
						.from('passes_stats')
						.insert([
							{
								hostname,
								network,
								...(currency && currency.length <= 5 ? { currency: currency.toLowerCase() } : {}),
								...(props.params.amount?.value
									? (() => {
										const numValue = Number(props.params.amount.value);
										if (Number.isFinite(numValue) && numValue > 0 && numValue <= Number.MAX_SAFE_INTEGER) {
											return { amount: numValue };
										}
										return {};
									})()
									: {}),
								...(design.org ? { custom_org: true } : {}),
								...(props.params.donate?.value ? { donate: true } : {}),
								...(props.params.rc?.value ? { recurring: true } : {}),
								os: 'android',
								...(authority ? { authority } : {})
							}
						])
						.select();
				} catch (e) {
					console.warn('Failed to insert stats (android):', e);
				}
			}

			return json({ saveUrl, id: objectId, classId: finalClassId, gwObject, gwClass });
		} else if (os === 'ios') {
			/* -------------------------------------------------------------
			 * iOS / Apple Wallet
			 * ------------------------------------------------------------- */

			const foregroundColor = getValidForegroundColor(design, kvData, '#9AB1D6');
			const originId = crypto.randomUUID().replace(/[^a-zA-Z0-9]/g, '').slice(0, 32);
			const proUrl = `${proUrlLink}?originid=${encodeURIComponent(originId)}&origin=${encodeURIComponent(originator)}&subscriber=${encodeURIComponent(memberAddress)}&destination=${encodeURIComponent(destination)}&network=${encodeURIComponent(network as string)}&os=ios${appleLocale ? `&lang=${encodeURIComponent(appleLocale)}` : ''}`;
			const swapUrl = swapUrlLink;

			const pkpassBlob = await buildAppleWalletPayPass({
				serialId,
				passTypeIdentifier,
				teamIdentifier,
				p12Base64,
				p12Password,
				wwdrPem,
				companyName,
				orgName,
				logoUrl: imageUrls.apple.logo,
				iconUrl: imageUrls.apple.icon,
				beacons: appleBeacons,
				titleText: titleText || undefined,
				purposeText,
				amountType: { recurring: isRecurring, donate: isDonate },
				amountObject: finalAmount,
				hexBackgroundColor: backgroundColor,
				hexForegroundColor: foregroundColor,
				hexLabelColor: getAutoTextColor(backgroundColor, foregroundColor),
				barcode: getBarcodeConfig(design.barcode || 'qr', bareLink, codeText).apple,
				donate: isDonate,
				rtl: isRtl,
				locale: appleLocale,
				payload: {
					basicLink: getLink(hostname, props),
					fullLink: getLink(hostname, props, design, false),
					externalLink: getLink(hostname, props, design, true),
					explorerUrl: explorerUrl || undefined,
					proUrl,
					swapUrl,
					linkBaseUrl,
					props,
					expirationDate,
					chainId,
					merchantLocations: kvData?.data?.apple?.merchantLocation || [],
					splitPayment,
					swap
				},
				fetch
			});

			if (enableStats && pkpassBlob && supabase) {
				try {
					// @ts-ignore
					await (supabase as any)
						.from('passes_stats')
						.insert([
							{
								hostname,
								network,
								...(currency && currency.length <= 5 ? { currency: currency.toLowerCase() } : {}),
								...(props.params.amount?.value
									? (() => {
										const numValue = Number(props.params.amount.value);
										if (Number.isFinite(numValue) && numValue > 0 && numValue <= Number.MAX_SAFE_INTEGER) {
											return { amount: numValue };
										}
										return {};
									})()
									: {}),
								...(design.org ? { custom_org: true } : {}),
								...(props.params.donate?.value ? { donate: true } : {}),
								...(props.params.rc?.value ? { recurring: true } : {}),
								os: 'ios',
								...(authority ? { authority } : {})
							}
						])
						.select();
				} catch (e) {
					console.warn('Failed to insert stats (ios):', e);
				}
			}

			return new Response(pkpassBlob, {
				headers: {
					'Content-Type': 'application/vnd.apple.pkpass',
					'Content-Disposition': `attachment; filename="${pkpassFilename}"; filename*=UTF-8''${encodeURIComponent(
						pkpassFilename
					)}`
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
