import JSZip from 'jszip';
import forge from 'node-forge';
import {
	getPaypassLocalizedValueForLocale as getPaypassLocalizedValue
} from './paypass-i18n.helper';
import { locales as availableLocales } from '$i18n/i18n-util';
import { formatAmount } from './paypass-operator.helper';

export interface AppleWalletPayPassConfig {
	serialId: string;
	passTypeIdentifier: string;
	teamIdentifier: string | undefined;
	p12Base64: string | undefined;
	p12Password: string | undefined;
	wwdrPem: string | undefined;
	companyName: string | null;
	orgName: string;
	logoUrl?: string;
	iconUrl?: string;
	beacons?: Array<{
		proximityUUID: string;
		relevantText?: string;
		major?: number;
		minor?: number;
		name?: string;
	}>;
	titleText?: string;
	amountType?: { recurring: boolean; donate: boolean };
	amountObject?: { value: string; recurrence?: { value?: string } };
	purposeText?: string;
	subheaderText?: string;
	hexBackgroundColor?: string;
	hexForegroundColor?: string;
	hexLabelColor?: string;
	barcode: any;
	donate?: boolean;
	rtl?: boolean;	// Right-to-left support (manual swap)
	locale?: string;
	payload: any;	// Full payload with all data (same shape as Android helper)
	fetch: typeof fetch;
}

/* ----------------------------------------------------------------
 * Apple localization config
 * ---------------------------------------------------------------- */

// All locales we support for Apple Wallet
const APPLE_LOCALES = Array.from(
	new Set(
		availableLocales
			.map((locale) => locale.replace(/_/g, '-'))
			.filter(Boolean)
	)
);

// All keys we want available in Apple pass.strings
const APPLE_I18N_KEYS = [
	'paypass.paypass',
	'paypass.pay',
	'paypass.address',
	'paypass.network',
	'paypass.cash',
	'paypass.chain',
	'paypass.amount',
	'paypass.purpose',
	'paypass.recurringDonation',
	'paypass.recurringPayment',
	'paypass.donation',
	'paypass.payment',
	'paypass.swapFor',
	'paypass.split',
	'paypass.iban',
	'paypass.bic',
	'paypass.beneficiary',
	'paypass.bicOroric',
	'paypass.accountNumber',
	'paypass.routingNumber',
	'paypass.accountAlias',
	'paypass.message',
	'paypass.id',
	'paypass.accountId',
	'paypass.paymentLocation',
	'paypass.navigateToLocation',
	'paypass.viewTransactions',
	'paypass.onlinePaypass',
	'paypass.topUpCryptoCard',
	'paypass.swapCurrency',
	'paypass.activatePro',
	'paypass.sendOfflineTransaction',
	'paypass.scanToDonate',
	'paypass.scanToPay'
];

/**
 * Escape a string for use in a .strings file.
 */
function escapeStringsValue(value: string): string {
	return value
		.replace(/\\/g, '\\\\')
		.replace(/"/g, '\\"')
		.replace(/\r?\n/g, '\\n');
}

/**
 * Build contents of pass.strings for a given locale using existing paypass i18n keys.
 * Keys are kept as-is (e.g. "paypass.payment") so we can reuse them across platforms.
 */
function buildApplePassStringsForLocale(locale: string): string {
	const lines: string[] = [];

	for (const key of APPLE_I18N_KEYS) {
		const value =
			getPaypassLocalizedValue(key, locale) ||
			getPaypassLocalizedValue(key, 'en') ||
			key;
		lines.push(`"${key}" = "${escapeStringsValue(value)}";`);
	}

	return lines.join('\n') + '\n';
}

/* ----------------------------------------------------------------
 * Manifest + signature helpers
 * ---------------------------------------------------------------- */

/**
 * Build Apple Wallet manifest (SHA-1 hashes of all files)
 * @param files - Record of filename to ArrayBuffer
 * @returns JSON string of manifest
 */
export async function buildAppleManifest(files: Record<string, ArrayBuffer>): Promise<string> {
	const manifest: Record<string, string> = {};

	for (const [name, content] of Object.entries(files)) {
		const u8 = new Uint8Array(content);

		// Properly convert bytes for forge
		const buffer = forge.util.createBuffer();
		for (let i = 0; i < u8.length; i++) {
			buffer.putByte(u8[i]);
		}

		const md = forge.md.sha1.create();
		md.update(buffer.getBytes());
		manifest[name] = md.digest().toHex();
	}

	return JSON.stringify(manifest, null, 2);
}

/**
 * Sign Apple Wallet manifest with PKCS#7 (CMS) detached signature
 * @param config - Signing configuration
 * @returns Uint8Array of signature bytes
 */
export function signAppleManifestPKCS7({
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
				// @ts-ignore forge types
				privateKey = safeBag.key || null;
			} else if (safeBag.type === forge.pki.oids.certBag) {
				// @ts-ignore forge types
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
 * Helpers shared
 * ---------------------------------------------------------------- */

/**
 * Format destination address the same way as Android helper (grouping, casing).
 */
function formatAddressText(payload: any): string | null {
	const props = payload?.props || {};
	const addr = props.destination;
	if (!addr || typeof addr !== 'string') return null;

	if (['xcb', 'xce'].includes(props.network)) {
		return addr.match(/.{1,4}/g)?.join(' ').toUpperCase() || addr.toUpperCase();
	} else if (props.network === 'other' && ['xab'].includes(props.other)) {
		return addr.match(/.{1,4}/g)?.join(' ').toUpperCase() || addr.toUpperCase();
	}
	return addr.match(/.{1,4}/g)?.join(' ') || addr;
}

/**
 * Build localized “amount + recurrence” text.
 */
function buildAmountText(
	amountObject: { value: string; recurrence?: { value?: string } } | undefined,
	locale: string,
	rtl: boolean | undefined
): string | undefined {
	if (!amountObject || !amountObject.value) return undefined;

	const translations = {
		day: getPaypassLocalizedValue('common.recurring.day', locale) || 'd',
		week: getPaypassLocalizedValue('common.recurring.week', locale) || 'w',
		month: getPaypassLocalizedValue('common.recurring.month', locale) || 'm',
		year: getPaypassLocalizedValue('common.recurring.year', locale) || 'y'
	};

	return formatAmount(amountObject, translations, !!rtl);
}

/**
 * Build the "network" text similar to Android text module.
 */
function buildNetworkText(payload: any, locale: string): string | undefined {
	const props = payload?.props || {};
	const network = props.network;

	if (!network) return undefined;

	if (network === 'void') {
		const cashText = getPaypassLocalizedValue('paypass.cash', locale) || 'Cash';
		const transportText = props.transport ? String(props.transport).toUpperCase() : '';
		return transportText ? `${cashText} / ${transportText}` : cashText;
	}

	const chainWord = getPaypassLocalizedValue('paypass.chain', locale) || 'Chain';
	const chainPart = payload.chainId ? ` / ${chainWord}: ${payload.chainId}` : '';
	const baseNetwork = (network === 'other' ? props.other : network) || '';
	if (!baseNetwork) return undefined;

	return String(baseNetwork).toUpperCase() + chainPart;
}

/* ----------------------------------------------------------------
 * Main builder
 * ---------------------------------------------------------------- */

/**
 * Build Apple Wallet PayPass (.pkpass file) with proper PKCS#7 signature
 * and Apple-style localization (.lproj/pass.strings).
 */
export async function buildAppleWalletPayPass(config: AppleWalletPayPassConfig): Promise<Blob> {
	const {
		serialId,
		passTypeIdentifier,
		teamIdentifier,
		p12Base64,
		p12Password,
		wwdrPem,
		companyName,
		orgName,
		logoUrl,
		iconUrl,
		titleText,
		beacons,
		amountType,
		amountObject,
		purposeText,
		subheaderText, // not directly supported on Apple card front
		hexBackgroundColor,
		hexForegroundColor,
		hexLabelColor,
		barcode,
		donate,
		rtl,
		locale,
		payload,
		fetch: fetchFn
	} = config;

	// Validate Apple signing configuration
	if (!teamIdentifier) {
		throw new Error('Apple signing configuration missing: Team identifier is required');
	}
	if (!p12Base64 || !p12Password || !wwdrPem) {
		throw new Error('Apple signing configuration missing (P12/WWDR).');
	}

	const passLocale = (locale || 'en').replace(/_/g, '-');
	const props = payload?.props || {};
	const params = props.params || {};
	const isDonate = !!(amountType?.donate || donate);
	const isRecurring = !!(amountType?.recurring || amountObject?.recurrence?.value);

	// Decide header key like Google: payment / donation / recurring*
	let paymentHeaderKey = 'paypass.payment';
	if (isRecurring && isDonate) paymentHeaderKey = 'paypass.recurringDonation';
	else if (isRecurring) paymentHeaderKey = 'paypass.recurringPayment';
	else if (isDonate) paymentHeaderKey = 'paypass.donation';

	const paymentLabelKey = paymentHeaderKey;
	const amountLabelKey = 'paypass.amount';
	const purposeLabelKey = 'paypass.purpose';
	const networkLabelKey = 'paypass.network';
	const addressLabelKey = 'paypass.address';
	const splitLabelKey = 'paypass.split';
	const messageLabelKey = 'paypass.message';
	const beneficiaryLabelKey = 'paypass.beneficiary';
	const ibanLabelKey = 'paypass.iban';
	const bicLabelKey = 'paypass.bic';
	const bicOroricLabelKey = 'paypass.bicOroric';
	const accountNumberLabelKey = 'paypass.accountNumber';
	const routingNumberLabelKey = 'paypass.routingNumber';
	const accountAliasLabelKey = 'paypass.accountAlias';
	const idLabelKey = 'paypass.id';
	const accountIdLabelKey = 'paypass.accountId';
	const paymentLocationKey = 'paypass.paymentLocation';
	const viewTransactionsKey = 'paypass.viewTransactions';
	const onlinePaypassKey = 'paypass.onlinePaypass';
	const topUpCryptoCardKey = 'paypass.topUpCryptoCard';
	const swapCurrencyKey = 'paypass.swapCurrency';
	const activateProKey = 'paypass.activatePro';
	const sendOfflineTxKey = 'paypass.sendOfflineTransaction';

	const addressText = formatAddressText(payload);
	const networkText = buildNetworkText(payload, passLocale);
	const amountText = buildAmountText(amountObject, passLocale, rtl);

	const logoText =
		(titleText && titleText.trim().length > 0
			? titleText.trim()
			: orgName && orgName.trim().length > 0
			? orgName.trim()
			: companyName || 'PayPass');

	const description =
		companyName && companyName.trim().length > 0
			? `PayPass by ${companyName}`
			: 'PayPass';

	const backgroundColor = hexBackgroundColor || '#2A3950';
	const foregroundColor = hexForegroundColor || '#9AB1D6';
	const labelColor = hexLabelColor || '#FFFFFF';

	const basicData: any = {
		formatVersion: 1,
		serialNumber: serialId.slice(0, 64),
		passTypeIdentifier,
		teamIdentifier,
		organizationName: orgName,
		logoText,
		description,
		backgroundColor,
		foregroundColor,
		labelColor,
		appLaunchURL: payload.fullLink || payload.basicLink
	};

	// Optional expiration
	if (payload.expirationDate) {
		basicData.expirationDate = payload.expirationDate;
	}

	// Optional location
	if (params.loc?.lat && params.loc.lon) {
		basicData.locations = [
			{
				latitude: Number(params.loc.lat),
				longitude: Number(params.loc.lon),
				relevantText: params.message?.value || paymentLocationKey
			}
		];
	} else if (Array.isArray(payload.merchantLocations) && payload.merchantLocations.length > 0) {
		basicData.locations = payload.merchantLocations
			.filter(
				(loc: any) =>
					typeof loc?.latitude === 'number' &&
					typeof loc?.longitude === 'number'
			)
			.map((loc: any) => ({
				latitude: loc.latitude,
				longitude: loc.longitude,
				relevantText: loc.relevantText || paymentLocationKey
			}));
	}

	// Attach beacons (iBeacon proximity triggers)
	if (Array.isArray(beacons) && beacons.length > 0) {
		const normalizedBeacons = beacons
			.filter(
				(b) => b && typeof b.proximityUUID === 'string' && b.proximityUUID.trim().length > 0
			)
			.slice(0, 10)
			.map((b) => {
				const beacon: any = {
					proximityUUID: b.proximityUUID.trim()
				};
				if (b.relevantText) beacon.relevantText = b.relevantText;
				if (typeof b.major === 'number' && Number.isFinite(b.major)) beacon.major = Math.trunc(b.major);
				if (typeof b.minor === 'number' && Number.isFinite(b.minor)) beacon.minor = Math.trunc(b.minor);
				if (b.name) beacon.name = b.name;
				return beacon;
			})
			.filter((b) => !!b.proximityUUID);

		if (normalizedBeacons.length > 0) {
			basicData.beacons = normalizedBeacons;
		}
	}

	// StoreCard structure (front of the pass)
	const storeCard: any = {
		headerFields: [] as any[],
		primaryFields: [] as any[],
		secondaryFields: [] as any[],
		auxiliaryFields: [] as any[],
		backFields: [] as any[]
	};

	// Header: payment type + network
	if (networkText) {
		storeCard.headerFields.push({
			key: 'network',
			label: networkLabelKey,
			value: networkText
		});
	} else {
		storeCard.headerFields.push({
			key: 'payment',
			label: paymentLabelKey,
			value: getPaypassLocalizedValue('paypass.paypass', passLocale) || 'PayPass'
		});
	}

	// Secondary: Purpose + Address
	if (purposeText && purposeText.trim().length > 0) {
		storeCard.secondaryFields.push({
			key: 'purpose',
			label: purposeLabelKey,
			value: purposeText.trim()
		});
	}

	if (addressText) {
		storeCard.secondaryFields.push({
			key: 'address',
			label: addressLabelKey,
			value: addressText
		});
	}

	// Auxiliary: split payment, message, pro/swap/explorer links, etc.
	const splitPayment = payload.splitPayment;
	if (splitPayment && splitPayment.value > 0) {
		const splitValue = splitPayment.isPercent
			? `${splitPayment.value}%`
			: splitPayment.formattedValue || String(splitPayment.value);
		storeCard.auxiliaryFields.push({
			key: 'split',
			label: splitLabelKey,
			value: splitValue
		});

		if (splitPayment.address) {
			storeCard.auxiliaryFields.push({
				key: 'split-address',
				label: addressLabelKey,
				value: splitPayment.address
			});
		}
	}

	if (params.message?.value) {
		storeCard.auxiliaryFields.push({
			key: 'message',
			label: messageLabelKey,
			value: params.message.value
		});
	}

	// Links: explorer, external, pro, swap (as "tap to open" via dataDetectorTypes)
	if (payload.explorerUrl) {
		storeCard.auxiliaryFields.push({
			key: 'explorer',
			label: viewTransactionsKey,
			value: viewTransactionsKey,
			attributedValue: payload.explorerUrl,
			dataDetectorTypes: ['PKDataDetectorTypeLink']
		});
	}

	if (payload.externalLink) {
		storeCard.auxiliaryFields.push({
			key: 'online',
			label: onlinePaypassKey,
			value: onlinePaypassKey,
			attributedValue: payload.externalLink,
			dataDetectorTypes: ['PKDataDetectorTypeLink']
		});
	}

	if (props.network === 'xcb' && payload.proUrl) {
		storeCard.auxiliaryFields.push({
			key: 'pro',
			label: activateProKey,
			value: activateProKey,
			attributedValue: payload.proUrl,
			dataDetectorTypes: ['PKDataDetectorTypeLink']
		});
	}

	if (payload.swapUrl) {
		storeCard.auxiliaryFields.push({
			key: 'swap',
			label: swapCurrencyKey,
			value: swapCurrencyKey,
			attributedValue: payload.swapUrl,
			dataDetectorTypes: ['PKDataDetectorTypeLink']
		});
	}

	if (props.network === 'xcb') {
		storeCard.auxiliaryFields.push({
			key: 'offline',
			label: sendOfflineTxKey,
			value: sendOfflineTxKey,
			attributedValue: 'sms:+12019715152',
			dataDetectorTypes: ['PKDataDetectorTypeLink']
		});
	}

	// Back fields: issuer + network-specific details (IBAN, ACH, UPI, PIX, INTRA, VOID, etc.)
	storeCard.backFields.push({
		key: 'issuer',
		label: beneficiaryLabelKey,
		value:
			getPaypassLocalizedValue('paypass.beneficiary', passLocale) ||
			'Beneficiary',
		attributedValue: payload.linkBaseUrl || 'https://payto.money',
		dataDetectorTypes: ['PKDataDetectorTypeLink']
	});

	// Network specific
	if (props.network === 'iban') {
		const iban = props.iban?.match(/.{1,4}/g)?.join(' ').toUpperCase() || props.iban?.toUpperCase();
		if (iban) {
			storeCard.backFields.push({
				key: 'iban',
				label: ibanLabelKey,
				value: iban
			});
		}
		const bic = props.bic?.toUpperCase();
		if (bic) {
			storeCard.backFields.push({
				key: 'bic',
				label: bicLabelKey,
				value: bic
			});
		}
		if (params.receiverName?.value) {
			storeCard.backFields.push({
				key: 'beneficiary',
				label: beneficiaryLabelKey,
				value: params.receiverName.value
			});
		}
		if (params.message?.value) {
			storeCard.backFields.push({
				key: 'message-iban',
				label: messageLabelKey,
				value: params.message.value
			});
		}
	} else if (props.network === 'ach') {
		if (props.accountNumber) {
			storeCard.backFields.push({
				key: 'accountNumber',
				label: accountNumberLabelKey,
				value: props.accountNumber
			});
		}
		const routingNumber = props.routingNumber?.toUpperCase();
		if (routingNumber) {
			storeCard.backFields.push({
				key: 'routingNumber',
				label: routingNumberLabelKey,
				value: routingNumber
			});
		}
		if (params.receiverName?.value) {
			storeCard.backFields.push({
				key: 'beneficiary',
				label: beneficiaryLabelKey,
				value: params.receiverName.value
			});
		}
	} else if (props.network === 'upi') {
		if (props.accountAlias) {
			storeCard.backFields.push({
				key: 'accountAlias',
				label: accountAliasLabelKey,
				value: props.accountAlias
			});
		}
		if (params.receiverName?.value) {
			storeCard.backFields.push({
				key: 'beneficiary',
				label: beneficiaryLabelKey,
				value: params.receiverName.value
			});
		}
		if (params.message?.value) {
			storeCard.backFields.push({
				key: 'message-upi',
				label: messageLabelKey,
				value: params.message.value
			});
		}
	} else if (props.network === 'pix') {
		if (props.accountAlias) {
			storeCard.backFields.push({
				key: 'accountAlias',
				label: accountAliasLabelKey,
				value: props.accountAlias
			});
		}
		if (params.receiverName?.value) {
			storeCard.backFields.push({
				key: 'beneficiary',
				label: beneficiaryLabelKey,
				value: params.receiverName.value
			});
		}
		if (params.id?.value) {
			storeCard.backFields.push({
				key: 'id',
				label: idLabelKey,
				value: params.id.value
			});
		}
		if (params.message?.value) {
			storeCard.backFields.push({
				key: 'message-pix',
				label: messageLabelKey,
				value: params.message.value
			});
		}
	} else if (props.network === 'bic') {
		const bic = props.bic?.toUpperCase();
		if (bic) {
			storeCard.backFields.push({
				key: 'bic',
				label: bicOroricLabelKey,
				value: bic
			});
		}
	} else if (props.network === 'intra') {
		const bic = props.bic?.toUpperCase();
		if (bic) {
			storeCard.backFields.push({
				key: 'bic',
				label: bicOroricLabelKey,
				value: bic
			});
		}
		if (props.id) {
			storeCard.backFields.push({
				key: 'accountId',
				label: accountIdLabelKey,
				value: props.id
			});
		}
		if (params.receiverName?.value) {
			storeCard.backFields.push({
				key: 'beneficiary',
				label: beneficiaryLabelKey,
				value: params.receiverName.value
			});
		}
		if (params.message?.value) {
			storeCard.backFields.push({
				key: 'message-intra',
				label: messageLabelKey,
				value: params.message.value
			});
		}
	} else if (props.network === 'void') {
		if (params.receiverName?.value) {
			storeCard.backFields.push({
				key: 'beneficiary',
				label: beneficiaryLabelKey,
				value: params.receiverName.value
			});
		}
		if (params.message?.value) {
			storeCard.backFields.push({
				key: 'message-void',
				label: messageLabelKey,
				value: params.message.value
			});
		}
	}

	/* ----------------------------------------------------------------
	 * Primary fields
	 * ---------------------------------------------------------------- */

	const hasPurposePrimary = !!(purposeText && purposeText.trim().length > 0);
	const hasAmountPrimary = !!(amountText || amountObject?.value);

	const pushAmountPrimary = () => {
		if (!hasAmountPrimary) return;
		const value = amountText || amountObject!.value;
		const label = amountText ? paymentLabelKey : amountLabelKey;
		storeCard.primaryFields.push({
			key: 'amount',
			label,
			value
		});
	};

	const pushPurposePrimary = () => {
		if (!hasPurposePrimary) return;
		storeCard.primaryFields.push({
			key: 'purpose-primary',
			label: purposeLabelKey,
			value: purposeText!.trim()
		});
	};

	if (hasPurposePrimary || hasAmountPrimary) {
		if (!rtl) {
			// LTR: Purpose on the left, Amount on the right
			if (hasPurposePrimary) pushPurposePrimary();
			if (hasAmountPrimary) pushAmountPrimary();
		} else {
			// RTL: Amount on the left, Purpose on the right
			if (hasAmountPrimary) pushAmountPrimary();
			if (hasPurposePrimary) pushPurposePrimary();
		}
	}

	// Final fallback: ensure at least one primary field
	if (!storeCard.primaryFields || storeCard.primaryFields.length === 0) {
		if (addressText) {
			storeCard.primaryFields.push({
				key: 'address-primary',
				label: addressLabelKey,
				value: addressText
			});
		} else {
			storeCard.primaryFields.push({
				key: 'paypass-primary',
				label: paymentLabelKey,
				value: getPaypassLocalizedValue('paypass.paypass', passLocale) || 'PayPass'
			});
		}
	}

	// NFC
	const passData: any = {
		...basicData,
		storeCard,
		/*nfc: {
			message: payload.basicLink,
			requiresAuthentication: true
		}*/
	};

	// Barcode
	const barcodeAltText = isDonate
		? getPaypassLocalizedValue('paypass.scanToDonate', passLocale) || 'Scan to donate'
		: getPaypassLocalizedValue('paypass.scanToPay', passLocale) || 'Scan to pay';

	const baseBarcode =
		barcode && typeof barcode === 'object'
			? barcode
			: {
					format: 'PKBarcodeFormatQR',
					message: payload.basicLink,
					messageEncoding: 'iso-8859-1'
			  };

	const appleBarcode = {
		...baseBarcode,
		altText: barcodeAltText
	};

	passData.barcodes = [appleBarcode];

	/* ----------------------------------------------------------------
	 * 1) pass.json
	 * ---------------------------------------------------------------- */

	const files: Record<string, ArrayBuffer> = {};
	files['pass.json'] = new TextEncoder().encode(JSON.stringify(passData, null, 2)).buffer;

	/* ----------------------------------------------------------------
	 * 2) Localization: one pass.strings per supported locale
	 * ---------------------------------------------------------------- */

	for (const loc of APPLE_LOCALES) {
		const stringsContent = buildApplePassStringsForLocale(loc);
		const path = `${loc}.lproj/pass.strings`;
		files[path] = new TextEncoder().encode(stringsContent).buffer;
	}

	/* ----------------------------------------------------------------
	 * 3) Images: icon + logo from config
	 * ---------------------------------------------------------------- */

	const imageFetches: Promise<void>[] = [];

	if (iconUrl) {
		imageFetches.push(
			fetchFn(iconUrl)
				.then((r) => (r.ok ? r.arrayBuffer() : null))
				.then((buf) => {
					if (buf) files['icon.png'] = buf;
				})
				.catch(() => {})
		);
	}

	if (logoUrl) {
		imageFetches.push(
			fetchFn(logoUrl)
				.then((r) => (r.ok ? r.arrayBuffer() : null))
				.then((buf) => {
					if (buf) files['logo.png'] = buf;
				})
				.catch(() => {})
		);
	}

	await Promise.all(imageFetches);

	/* ----------------------------------------------------------------
	 * 4) manifest.json (SHA-1)
	 * ---------------------------------------------------------------- */

	const manifestText = await buildAppleManifest(files);

	/* ----------------------------------------------------------------
	 * 5) signature (PKCS#7 DER detached)
	 * ---------------------------------------------------------------- */

	const signatureBytes = signAppleManifestPKCS7({
		manifestText,
		p12Base64,
		p12Password,
		wwdrPem
	});

	/* ----------------------------------------------------------------
	 * 6) Package zip (.pkpass)
	 * ---------------------------------------------------------------- */

	const zip = new JSZip();
	for (const [name, ab] of Object.entries(files)) zip.file(name, ab);
	zip.file('manifest.json', manifestText);
	zip.file('signature', signatureBytes);

	const pkpassBlob = await zip.generateAsync({ type: 'blob' });

	return pkpassBlob;
}
