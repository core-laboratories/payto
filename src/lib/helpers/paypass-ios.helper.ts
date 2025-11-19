import JSZip from 'jszip';
import forge from 'node-forge';
import {
	getPaypassLocalizedValueForLocale as getPaypassLocalizedValue
} from './paypass-i18n.helper';
import { locales as availableLocales } from '$i18n/i18n-util';
import { formatAmount, formatAddressText } from './paypass-operator.helper';

const isDebug = false;

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
	rtl?: boolean;
	locale?: string;
	payload: any;
	fetch: typeof fetch;
}

/* ----------------------------------------------------------------
 * Apple localization config
 * ---------------------------------------------------------------- */

const APPLE_LOCALES = Array.from(
	new Set(
		availableLocales
			.map((locale) => locale.replace(/_/g, '-'))
			.filter(Boolean)
	)
);

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

function escapeStringsValue(value: string): string {
	return value
		.replace(/\\/g, '\\\\')
		.replace(/"/g, '\\"')
		.replace(/\r?\n/g, '\\n');
}

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

export async function buildAppleManifest(files: Record<string, ArrayBuffer>): Promise<string> {
	const manifest: Record<string, string> = {};

	for (const [name, content] of Object.entries(files)) {
		const u8 = new Uint8Array(content);

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
				privateKey = safeBag.key || null;
			} else if (safeBag.type === forge.pki.oids.certBag) {
				cert = safeBag.cert || cert;
			}
		}
	}

	if (!privateKey || !cert) {
		throw new Error('Failed to extract key/cert from P12');
	}

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
 * Helpers
 * ---------------------------------------------------------------- */
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

function buildAmountLabel(amountType: { recurring: boolean; donate: boolean } | undefined): string | undefined {
	let headerI18nKey: string | undefined = undefined;
	if (amountType?.recurring && amountType?.donate) {
		headerI18nKey = 'paypass.recurringDonation';
	} else if (amountType?.recurring) {
		headerI18nKey = 'paypass.recurringPayment';
	} else if (amountType?.donate) {
		headerI18nKey = 'paypass.donation';
	} else {
		headerI18nKey = 'paypass.payment';
	}

	return headerI18nKey;
}

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

	return String(baseNetwork).toUpperCase() + chainPart;
}

/* ----------------------------------------------------------------
 * Main builder
 * ---------------------------------------------------------------- */

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
		subheaderText,
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

	let paymentHeaderKey = 'paypass.payment';
	if (isRecurring && isDonate) paymentHeaderKey = 'paypass.recurringDonation';
	else if (isRecurring) paymentHeaderKey = 'paypass.recurringPayment';
	else if (isDonate) paymentHeaderKey = 'paypass.donation';

	const paymentLabelKey = paymentHeaderKey;
	const amountLabelKey = buildAmountLabel(amountType);
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
	const paypassKey = 'paypass.paypass';

	const addressText = formatAddressText(
		payload?.props?.destination,
		payload?.props?.network,
		payload?.props?.other
	);
	const amountText = buildAmountText(amountObject, passLocale, rtl);
	const networkText = buildNetworkText(payload, passLocale);

	const logoText =
		orgName && orgName.trim().length > 0
			? orgName.trim()
			: companyName || addressText;

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
		organizationName: companyName || 'PayTo',
		logoText,
		description,
		backgroundColor,
		foregroundColor,
		labelColor
	};

	const hasLocationParams = params.loc?.lat && params.loc.lon;
	if (payload.expirationDate) {
		basicData.expirationDate = payload.expirationDate;
	}

	if (hasLocationParams) {
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

	const genericCard: any = {
		headerFields: [],
		primaryFields: [],
		secondaryFields: [],
		auxiliaryFields: [],
		backFields: []
	};

	/* ----------------------------------------------------------------
	 * Header fields
	 * ---------------------------------------------------------------- */

	// Network
	if (networkText) {
		genericCard.headerFields.push({
			key: 'network',
			label: networkLabelKey,
			value: networkText
		});
	}

	/* ----------------------------------------------------------------
	*  Primary fields
	* ---------------------------------------------------------------- */

	genericCard.primaryFields.push({
		key: 'address',
		value: titleText
	});

	/* ----------------------------------------------------------------
	*  Secondary fields
	* ---------------------------------------------------------------- */

	const hasPurposeSecondary = !!(purposeText && purposeText.trim().length > 0);
	const hasAmountSecondary = !!(amountText || amountObject?.value);

	const pushAmountSecondary = () => {
		if (!hasAmountSecondary) return;
		const value = amountText || amountObject!.value;
		const label = amountText ? paymentLabelKey : amountLabelKey;
		genericCard.secondaryFields.push({
			key: 'amount',
			label,
			value
		});
	};

	const pushPurposeSecondary = () => {
		if (!hasPurposeSecondary) return;
		genericCard.secondaryFields.push({
			key: 'purpose',
			label: purposeLabelKey,
			value: purposeText!.trim()
		});
	};

	if (hasPurposeSecondary || hasAmountSecondary) {
		if (!rtl) {
			if (hasPurposeSecondary) pushPurposeSecondary();
			if (hasAmountSecondary) pushAmountSecondary();
		} else {
			if (hasAmountSecondary) pushAmountSecondary();
			if (hasPurposeSecondary) pushPurposeSecondary();
		}
	}

	/* ----------------------------------------------------------------
	 * Back fields
	 * ---------------------------------------------------------------- */

	// Address
	if (addressText) {
		genericCard.backFields.push({
			key: 'address-back',
			label: props.network === 'iban' ? ibanLabelKey : addressLabelKey,
			value: addressText
		});
	}

	// Network
	if (networkText) {
		genericCard.backFields.push({
			key: 'network-back',
			label: networkLabelKey,
			value: networkText
		});
	}

	// Item
	if (purposeText && purposeText.trim().length > 0) {
		genericCard.backFields.push({
			key: 'purpose',
			label: purposeLabelKey,
			value: purposeText.trim()
		});
	}

	// Amount
	if (amountText) {
		genericCard.backFields.push({
			key: 'amount',
			label: amountLabelKey,
			value: amountText
		});
	}

	// Network specific: IBAN
	if (props.network === 'iban') {
		const bic = props.bic?.toUpperCase();
		if (bic) {
			genericCard.backFields.push({
				key: 'bic',
				label: bicLabelKey,
				value: bic
			});
		}
		if (params.receiverName?.value) {
			genericCard.backFields.push({
				key: 'beneficiary',
				label: beneficiaryLabelKey,
				value: params.receiverName.value
			});
		}
		if (params.message?.value) {
			genericCard.backFields.push({
				key: 'message-iban',
				label: messageLabelKey,
				value: params.message.value
			});
		}
	}

	// ACH
	else if (props.network === 'ach') {
		if (props.accountNumber) {
			genericCard.backFields.push({
				key: 'accountNumber',
				label: accountNumberLabelKey,
				value: props.accountNumber
			});
		}
		const routingNumber = props.routingNumber?.toUpperCase();
		if (routingNumber) {
			genericCard.backFields.push({
				key: 'routingNumber',
				label: routingNumberLabelKey,
				value: routingNumber
			});
		}
		if (params.receiverName?.value) {
			genericCard.backFields.push({
				key: 'beneficiary',
				label: beneficiaryLabelKey,
				value: params.receiverName.value
			});
		}
	}

	// UPI
	else if (props.network === 'upi') {
		if (props.accountAlias) {
			genericCard.backFields.push({
				key: 'accountAlias',
				label: accountAliasLabelKey,
				value: props.accountAlias
			});
		}
		if (params.receiverName?.value) {
			genericCard.backFields.push({
				key: 'beneficiary',
				label: beneficiaryLabelKey,
				value: params.receiverName.value
			});
		}
		if (params.message?.value) {
			genericCard.backFields.push({
				key: 'message-upi',
				label: messageLabelKey,
				value: params.message.value
			});
		}
	}

	// PIX
	else if (props.network === 'pix') {
		if (props.accountAlias) {
			genericCard.backFields.push({
				key: 'accountAlias',
				label: accountAliasLabelKey,
				value: props.accountAlias
			});
		}
		if (params.receiverName?.value) {
			genericCard.backFields.push({
				key: 'beneficiary',
				label: beneficiaryLabelKey,
				value: params.receiverName.value
			});
		}
		if (params.id?.value) {
			genericCard.backFields.push({
				key: 'id',
				label: idLabelKey,
				value: params.id.value
			});
		}
		if (params.message?.value) {
			genericCard.backFields.push({
				key: 'message-pix',
				label: messageLabelKey,
				value: params.message.value
			});
		}
	}

	// BIC/ORIC
	else if (props.network === 'bic') {
		const bic = props.bic?.toUpperCase();
		if (bic) {
			genericCard.backFields.push({
				key: 'bic',
				label: bicOroricLabelKey,
				value: bic
			});
		}
	}

	// INTRA
	else if (props.network === 'intra') {
		const bic = props.bic?.toUpperCase();
		if (bic) {
			genericCard.backFields.push({
				key: 'bic',
				label: bicOroricLabelKey,
				value: bic
			});
		}
		if (props.id) {
			genericCard.backFields.push({
				key: 'accountId',
				label: accountIdLabelKey,
				value: props.id
			});
		}
		if (params.receiverName?.value) {
			genericCard.backFields.push({
				key: 'beneficiary',
				label: beneficiaryLabelKey,
				value: params.receiverName.value
			});
		}
		if (params.message?.value) {
			genericCard.backFields.push({
				key: 'message-intra',
				label: messageLabelKey,
				value: params.message.value
			});
		}
	}

	// VOID / Cash / Transport
	else if (props.network === 'void') {
		if (params.receiverName?.value) {
			genericCard.backFields.push({
				key: 'beneficiary',
				label: beneficiaryLabelKey,
				value: params.receiverName.value
			});
		}
		if (params.message?.value) {
			genericCard.backFields.push({
				key: 'message-void',
				label: messageLabelKey,
				value: params.message.value
			});
		}
	}

	// Swap
	if (payload.swap) {
		genericCard.backFields.push({
			key: 'swap',
			label: swapCurrencyKey,
			value: payload.swap
		});
	}

	// Split payment
	const splitPayment = payload.splitPayment;
	if (splitPayment && splitPayment.value > 0) {
		genericCard.backFields.push({
			key: 'split',
			label: splitLabelKey,
			value: rtl ? `${splitPayment.address} ← ${splitPayment.isPercent ? splitPayment.value.toString() + '%' : splitPayment.formattedValue}` : `${splitPayment.isPercent ? splitPayment.value.toString() + '%' : splitPayment.formattedValue} ➜ ${splitPayment.address}`
		});
	}

	/* ----------------------------------------------------------------
	 * Actions
	 * ---------------------------------------------------------------- */

	// Location
	if (hasLocationParams) {
		genericCard.backFields.push({
			key: 'location',
			label: 'paypass.paymentLocation',
			attributedValue: `<a href="geo:${Number(params.loc.lat)},${Number(params.loc.lon)}">📍 Open Location</a>`,
			dataDetectorTypes: ['PKDataDetectorTypeLink']
		});
	}

	// Explorer
	if (payload.explorerUrl) {
		genericCard.backFields.push({
			key: 'explorer',
			label: 'paypass.viewTransactions',
			attributedValue: `<a href="${payload.explorerUrl}">🔍 ${getPaypassLocalizedValue(viewTransactionsKey, passLocale) || 'View Transactions'}</a>`,
			dataDetectorTypes: ['PKDataDetectorTypeLink']
		});
	}

	// Online PayPass
	if (payload.externalLink) {
		genericCard.backFields.push({
			key: 'online',
			label: 'paypass.onlinePaypass',
			attributedValue: `<a href="${payload.externalLink}">📄 ${getPaypassLocalizedValue(onlinePaypassKey, passLocale) || 'Online PayPass'}</a>`,
			dataDetectorTypes: ['PKDataDetectorTypeLink']
		});
	}

	// Crypto Card
	if (payload.props.network === 'xcb') {
		genericCard.backFields.push({
			key: 'crypto-card',
			label: 'paypass.topUpCryptoCard',
			attributedValue: `<a href="${payload.linkBaseUrl}/card">💳 ${getPaypassLocalizedValue(topUpCryptoCardKey, passLocale) || 'Top up Crypto Card'}</a>`,
			dataDetectorTypes: ['PKDataDetectorTypeLink']
		});
	}

	// Swap Currency
	if (payload.swapUrl) {
		genericCard.backFields.push({
			key: 'swap',
			label: 'paypass.swapCurrency',
			attributedValue: `<a href="${payload.swapUrl}">💱 ${getPaypassLocalizedValue(swapCurrencyKey, passLocale) || 'Swap Currency'}</a>`,
			dataDetectorTypes: ['PKDataDetectorTypeLink']
		});
	}

	// Activate Pro
	if (payload.props.network === 'xcb' && payload.proUrl) {
		genericCard.backFields.push({
			key: 'pro',
			label: 'paypass.activatePro',
			attributedValue: `<a href="${payload.proUrl}">🔗 ${getPaypassLocalizedValue(activateProKey, passLocale) || 'Activate Pro'}</a>`,
			dataDetectorTypes: ['PKDataDetectorTypeLink']
		});
	}

	// Send Offline Transaction
	if (payload.props.network === 'xcb') {
		genericCard.backFields.push({
			key: 'offline',
			label: 'paypass.sendOfflineTransaction',
			attributedValue: `<a href="sms:+12019715152">📟 ${getPaypassLocalizedValue(sendOfflineTxKey, passLocale) || 'Send Offline Transaction'}</a>`,
			dataDetectorTypes: ['PKDataDetectorTypeLink']
		});
	}

	// Debug
	if (isDebug) {
		genericCard.backFields.push({
			key: 'debug',
			label: 'Debug',
			value: JSON.stringify(payload)
		});
	}

	// NFC
	const passData: any = {
		...basicData,
		generic: genericCard,
		/*nfc: {
			message: payload.basicLink,
			requiresAuthentication: true
		}*/
	};

	// Barcode
	const barcodeAltText = isDonate
		? 'paypass.scanToDonate'
		: 'paypass.scanToPay';

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
