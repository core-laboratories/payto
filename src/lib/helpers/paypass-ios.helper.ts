import JSZip from 'jszip';
import forge from 'node-forge';
import { getImageUrls, getBarcodeConfig, getTitleText, formatter } from './paypass-operator.helper';
import { getValidBackgroundColor, getValidForegroundColor } from './color-validation.helper';

/**
 * Build Apple Wallet manifest (SHA-1 hashes of all files)
 * @param files - Record of filename to ArrayBuffer
 * @returns JSON string of manifest
 */
export async function buildAppleManifest(files: Record<string, ArrayBuffer>): Promise<string> {
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

export interface AppleWalletPayPassConfig {
	serialId: string;
	passTypeIdentifier: string;
	teamIdentifier: string | undefined;
	org: string | null;
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

/**
 * Build Apple Wallet PayPass (.pkpass file) with proper PKCS#7 signature
 * @param config - Configuration object with all required parameters
 * @returns Promise resolving to Blob of the .pkpass file
 * @throws Error if Apple signing configuration is missing
 */
export async function buildAppleWalletPayPass(config: AppleWalletPayPassConfig): Promise<Blob> {
	const {
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
		fetch: fetchFn
	} = config;

	// Validate Apple signing configuration
	if (!teamIdentifier) {
		throw new Error('Apple signing configuration missing: Team identifier is required');
	}
	if (!p12Base64 || !p12Password || !wwdrPem) {
		throw new Error('Apple signing configuration missing (P12/WWDR).');
	}

	const basicData = {
		serialNumber: serialId,
		passTypeIdentifier,
		organizationName: org,
		logoText: getTitleText(hostname, props, currency),
		description: 'PayPass by ' + org,
		expirationDate,
		backgroundColor: getValidBackgroundColor(design, kvData, '#2A3950'),
		foregroundColor: getValidForegroundColor(design, kvData, '#9AB1D6'),
		labelColor: getValidForegroundColor(design, kvData, '#9AB1D6'),
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
		barcodes: [getBarcodeConfig(design.barcode || 'qr', bareLink).apple],
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
				attributedValue: proUrl,
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
				value: `This PayPass is issued by: ${kvData?.name || org}`,
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
	const imageUrls = getImageUrls(kvData, memberAddress, isDev, devServerUrl);
	const defaultImages: Record<string, ArrayBuffer> = {};

	await Promise.all([
		fetchFn(imageUrls.apple.icon).then(r => r.ok ? r.arrayBuffer() : null).then(b => { if (b) defaultImages['icon.png'] = b; }).catch(() => {}),
		fetchFn(imageUrls.apple.icon2x).then(r => r.ok ? r.arrayBuffer() : null).then(b => { if (b) defaultImages['icon@2x.png'] = b; }).catch(() => {}),
		fetchFn(imageUrls.apple.icon3x).then(r => r.ok ? r.arrayBuffer() : null).then(b => { if (b) defaultImages['icon@3x.png'] = b; }).catch(() => {}),
		fetchFn(imageUrls.apple.logo).then(r => r.ok ? r.arrayBuffer() : null).then(b => { if (b) defaultImages['logo.png'] = b; }).catch(() => {}),
		fetchFn(imageUrls.apple.logo2x).then(r => r.ok ? r.arrayBuffer() : null).then(b => { if (b) defaultImages['logo@2x.png'] = b; }).catch(() => {}),
		fetchFn(imageUrls.apple.logo3x).then(r => r.ok ? r.arrayBuffer() : null).then(b => { if (b) defaultImages['logo@3x.png'] = b; }).catch(() => {})
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

	return pkpassBlob;
}
