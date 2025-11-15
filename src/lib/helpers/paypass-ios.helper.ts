import JSZip from 'jszip';
import forge from 'node-forge';
import { getImageUrls, getBarcodeConfig, getTitleText, formatter } from './paypass-operator.helper';
import { getValidBackgroundColor, getValidForegroundColor } from './color-validation.helper';
import {
	getPaypassLocalizedValueForLocale as getPaypassLocalizedValue
} from './paypass-i18n.helper';
import { locales as availableLocales } from '$i18n/i18n-util';

export interface AppleWalletPayPassConfig {
	serialId: string;
	passTypeIdentifier: string;
	teamIdentifier: string | undefined;
	locale: string;
	companyName: string | null;
	orgName: string;
	hostname: string;
	props: any;
	design: any;
	kvData: any;
	currency: string | undefined;
	bareLink: string;
	expirationDate: string | null;
	memberAddress: string;
	p12Base64: string | undefined;
	p12Password: string | undefined;
	wwdrPem: string | undefined;
	isDev: boolean;
	devServerUrl: string;
	explorerUrl: string | null;
	customCurrencyData: any;
	proUrl: string;
	fetch: typeof fetch;
}

/* ----------------------------------------------------------------
 * Apple localization config (Google-style key reuse)
 * ---------------------------------------------------------------- */

// All locales we support for Apple Wallet
const APPLE_LOCALES = Array.from(
	new Set(
		availableLocales
			.map(locale => locale.replace(/_/g, '-'))
			.filter(Boolean)
	)
);

// All keys we want available in Apple pass.strings (mirrors Google usage)
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
 * Main builder
 * ---------------------------------------------------------------- */

/**
 * Build Apple Wallet PayPass (.pkpass file) with proper PKCS#7 signature
 * and Apple-style localization (.lproj/pass.strings) using Google-style keys.
 */
export async function buildAppleWalletPayPass(config: AppleWalletPayPassConfig): Promise<Blob> {
	const {
		serialId,
		passTypeIdentifier,
		teamIdentifier,
		locale,
		companyName,
		orgName,
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
		fetch: fetchFn
	} = config;

	// Validate Apple signing configuration
	if (!teamIdentifier) {
		throw new Error('Apple signing configuration missing: Team identifier is required');
	}
	if (!p12Base64 || !p12Password || !wwdrPem) {
		throw new Error('Apple signing configuration missing (P12/WWDR).');
	}

	const isDonate = !!props.params?.donate?.value;
	const isRecurring = !!props.params?.rc?.value;

	// Decide header key like Google: payment / donation / recurring*
	let paymentHeaderKey = 'paypass.payment';
	if (isRecurring && isDonate) paymentHeaderKey = 'paypass.recurringDonation';
	else if (isRecurring) paymentHeaderKey = 'paypass.recurringPayment';
	else if (isDonate) paymentHeaderKey = 'paypass.donation';

	// For Apple, labels (and some values) are KEYS, resolved via pass.strings
	const paymentLabelKey = paymentHeaderKey;
	const amountLabelKey = 'paypass.amount';
	const typeLabelKey = 'paypass.type';
	const itemLabelKey = 'paypass.purpose';
	const messageLabelKey = 'paypass.message';
	const splitLabelKey = 'paypass.split';
	const viewTransactionsKey = 'paypass.viewTransactions';
	const proLabelKey = 'paypass.activatePro';
	const issuerLabelKey = 'paypass.beneficiary';
	const accountAddressKey = 'paypass.accountAddress';
	const paymentLocationKey = 'paypass.paymentLocation';

	const titleForLogo = getTitleText(hostname, props, currency);
	const logoText = String(titleForLogo || companyName);

	const basicData: any = {
		serialNumber: serialId,
		passTypeIdentifier,
		organizationName: orgName,
		logoText,
		description: 'PayPass by ' + companyName,
		backgroundColor: getValidBackgroundColor(design, kvData, '#2A3950'),
		foregroundColor: getValidForegroundColor(design, kvData, '#9AB1D6'),
		labelColor: getValidForegroundColor(design, kvData, '#9AB1D6'),
		appLaunchURL: bareLink,
		...(hostname === 'void' && (props.network === 'geo' || props.network === 'plus')
			? {
				locations: [
					{
						latitude: props.params.lat?.value,
						longitude: props.params.lon?.value,
						// store key, value is resolved by pass.strings
						relevantText: paymentLocationKey
					}
				]
			}
			: {})
	};

	if (expirationDate) {
		basicData.expirationDate = expirationDate;
	}

	// Normalize split config (support both props.params.split and props.split)
	const splitConfig = (props.params && props.params.split) || props.split;

	const amountValue =
		props.params.amount?.value && Number(props.params.amount.value) > 0
			? formatter(
					currency,
					kvData?.currencyLocale || undefined,
					customCurrencyData
			  ).format(Number(props.params.amount.value))
			: 'Custom Amount';

	const typeValue = isRecurring
		? `Recurring ${String(props.params.rc.value).toUpperCase()}`
		: 'One-time';

	const networkPart =
		hostname && hostname === 'void'
			? 'CASH'
			: hostname.toUpperCase() +
			  (props.network ? ': ' + String(props.network).toUpperCase() : '');

	// Prepare barcode with localized alternate text via key
	const baseBarcode = getBarcodeConfig(design.barcode || 'qr', bareLink).apple;
	const barcodeAltKey = isDonate ? 'paypass.scanToDonate' : 'paypass.scanToPay';
	const barcode = {
		...baseBarcode,
		altText: barcodeAltKey
	};

	const storeCard = {
		headerFields: [
			{
				key: 'payment',
				label: paymentLabelKey, // key → localized in pass.strings
				value: networkPart
			}
		],
		primaryFields: [
			{
				key: 'amount',
				label: amountLabelKey, // key
				value: amountValue
			}
		],
		secondaryFields: [
			...(design.item
				? [
						{
							key: 'item',
							label: itemLabelKey, // key
							value: design.item
						}
				  ]
				: []),
			{
				key: 'type',
				label: typeLabelKey, // key
				value: typeValue
			},
			...(hostname === 'ican'
				? [
						{
							key: 'received',
							label: viewTransactionsKey, // key
							value: viewTransactionsKey, // also key (shows "Click to view…" via localization)
							attributedValue: explorerUrl || '',
							dataDetectorTypes: ['PKDataDetectorTypeLink']
						}
				  ]
				: [])
		],
		auxiliaryFields: [
			// Split
			...(props.params.amount?.value &&
			Number(props.params.amount.value) > 0 &&
			splitConfig?.value
				? [
						{
							key: 'split',
							label: splitLabelKey, // key
							value: splitConfig.isPercent
								? `${Number(splitConfig.value)}%`
								: formatter(
										currency,
										kvData?.currencyLocale || undefined,
										customCurrencyData
								  ).format(Number(splitConfig.value))
						}
				  ]
				: []),

			// Message
			...(props.params.message?.value
				? [
						{
							key: 'message',
							label: messageLabelKey, // key
							value: props.params.message.value
						}
				  ]
				: []),

			// Split receiving address
			...(props.params.amount?.value &&
			Number(props.params.amount.value) > 0 &&
			splitConfig?.value &&
			splitConfig?.address
				? [
						{
							key: 'split-address',
							label: accountAddressKey, // key
							value: splitConfig.address
						}
				  ]
				: []),

			// Pro link
			{
				key: 'pro',
				label: proLabelKey, // key
				value: proLabelKey, // key
				attributedValue: proUrl,
				dataDetectorTypes: ['PKDataDetectorTypeLink']
			}
		],
		backFields: [
			...(hostname === 'ican'
				? [
						{
							key: 'balance',
							label: viewTransactionsKey,
							value: viewTransactionsKey,
							attributedValue: explorerUrl || '',
							dataDetectorTypes: ['PKDataDetectorTypeLink']
						}
				  ]
				: []),
			{
				key: 'issuer',
				label: issuerLabelKey, // key
				value: `This PayPass is issued by: ${kvData?.name || companyName}`,
				attributedValue: `${kvData?.url || (kvData?.name ? '' : 'https://payto.money')}`,
				dataDetectorTypes: ['PKDataDetectorTypeLink']
			}
		]
	};

	const passData: any = {
		...basicData,
		formatVersion: 1,
		teamIdentifier,
		storeCard,
		nfc: {
			message: bareLink,
			requiresAuthentication: true
		},
		barcodes: [barcode],
		...(kvData?.beacons ? { beacons: kvData.beacons } : {})
	};

	// 1) Prepare files: pass.json + images + localization
	const files: Record<string, ArrayBuffer> = {};
	files['pass.json'] = new TextEncoder().encode(JSON.stringify(passData, null, 2)).buffer;

	// Apple-style localization: one pass.strings per supported locale
	for (const loc of APPLE_LOCALES) {
		const stringsContent = buildApplePassStringsForLocale(loc);
		const path = `${loc}.lproj/pass.strings`;
		files[path] = new TextEncoder().encode(stringsContent).buffer;
	}

	// Load images using unified image URLs
	const imageUrls = getImageUrls(kvData, memberAddress, isDev, devServerUrl);
	const defaultImages: Record<string, ArrayBuffer> = {};

	await Promise.all([
		fetchFn(imageUrls.apple.icon)
			.then(r => (r.ok ? r.arrayBuffer() : null))
			.then(b => {
				if (b) defaultImages['icon.png'] = b;
			})
			.catch(() => {}),
		fetchFn(imageUrls.apple.icon2x)
			.then(r => (r.ok ? r.arrayBuffer() : null))
			.then(b => {
				if (b) defaultImages['icon@2x.png'] = b;
			})
			.catch(() => {}),
		fetchFn(imageUrls.apple.icon3x)
			.then(r => (r.ok ? r.arrayBuffer() : null))
			.then(b => {
				if (b) defaultImages['icon@3x.png'] = b;
			})
			.catch(() => {}),
		fetchFn(imageUrls.apple.logo)
			.then(r => (r.ok ? r.arrayBuffer() : null))
			.then(b => {
				if (b) defaultImages['logo.png'] = b;
			})
			.catch(() => {}),
		fetchFn(imageUrls.apple.logo2x)
			.then(r => (r.ok ? r.arrayBuffer() : null))
			.then(b => {
				if (b) defaultImages['logo@2x.png'] = b;
			})
			.catch(() => {}),
		fetchFn(imageUrls.apple.logo3x)
			.then(r => (r.ok ? r.arrayBuffer() : null))
			.then(b => {
				if (b) defaultImages['logo@3x.png'] = b;
			})
			.catch(() => {})
	]);

	for (const [name, ab] of Object.entries(defaultImages)) {
		files[name] = ab;
	}

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

	return pkpassBlob;
}
