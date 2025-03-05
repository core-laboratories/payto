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

// @ts-expect-error: Module '"$env/static/private"' has no exported member 'PRIVATE_DECRYPTION_KEY'.
import { PRIVATE_WEB_SERVICE_URL, PRIVATE_AUTH_SECRET } from '$env/static/private';

// @ts-expect-error: Module is untyped
import pkg from 'open-location-code/js/src/openlocationcode';
const { decode } = pkg;

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
	const codeArea = decode(plusCode);
	return [codeArea.latitudeCenter, codeArea.longitudeCenter];
}

function getLogoText(hostname: string, props: any) {
	return `${(props.currency.value && props.currency.value.length < 6) ? props.currency.value.toUpperCase() : (props.network.toUpperCase() ? props.network.toUpperCase() : hostname.toUpperCase())} ${(props.destination.length > 8) ? props.destination.slice(0, 4).toUpperCase() + '…' + props.destination.slice(-4).toUpperCase() : props.destination.toUpperCase()}`;
}

async function registerPass(fields: Record<string, string | number | Record<string, any> | undefined>, props: Record<string, string | number | Record<string, any> | undefined>) {
	const timestamp = Date.now();
	const payload = JSON.stringify({ ...fields, ...props, timestamp });

	const hmac = forge.hmac.create();
	hmac.start('sha256', PRIVATE_AUTH_SECRET);
	hmac.update(payload);
	const token = hmac.digest().toHex();

	const pass = await fetch(PRIVATE_WEB_SERVICE_URL + '/register', {
		headers: {
			'Content-Type': 'application/json',
			'Authorization': `Bearer ${token}`
		},
		method: 'POST',
		body: payload,
	});

	if (!pass.ok) {
		throw error(500, 'Failed to register pass');
	} else {
		return true;
	}
}

const formatter = (currency: string | undefined, format: string | undefined, customCurrencyData = {}) => {
	return new ExchNumberFormat(format, {
		style: 'currency',
		currency: currency || '',
		currencyDisplay: 'symbol',
		customCurrency: customCurrencyData,
	});
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
		const origin = request.headers.get('origin');
		if (origin !== url.origin) {
			throw error(403, 'Unauthorized request origin');
		}

		try {
			const formData = await request.formData();
			const props = JSON.parse(formData.get('props') as string);
			const hostname = formData.get('hostname') as string;
			const membership = formData.get('membership') as string;
			const authorityField = (formData.get('authority') as string);
			const authority = authorityField ? authorityField.toLowerCase() : 'payto';
			let kvConfig = null;

			if (authorityField) {
				// Load KV values
				kvConfig = await KV.get(authority);
				if (kvConfig && (!kvConfig.id || !kvConfig.identifier)) {
					throw error(400, `Invalid or missing configuration for authority: ${authority}`);
				}
			}

			// Required fields
			const requiredFields = ['props', 'hostname'];
			for (const field of requiredFields) {
				if (!formData.has(field)) {
					throw error(400, `Missing required field: ${field}`);
				}
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
			const org = kvConfig.name || (props.design.org || (authorityField.toUpperCase()) || 'PayTo');
			const originator = kvConfig.id || 'payto';
			const memberAddress = membership || props.destination;
			const fileid = `${originator}-${memberAddress}-${props.destination}-${hostname}-${props.network}-${new Date(Date.now()).toISOString().replace(/[-T:]/g, '').slice(0, 12)}`;
			const explorerUrl = getExplorerUrl(props.network, { address: props.destination });
			const customCurrencyData = kvConfig.customCurrency || {};

			if (hostname === 'void' && props.network === 'plus') {
				const plusCoordinates = getLocationCode(props.params.loc?.value || '');
				props.params.lat = { value: plusCoordinates[0] };
				props.params.lon = { value: plusCoordinates[1] };
			}

			const basicData = {
				serialNumber: fileid,
				passTypeIdentifier: kvConfig.identifier || 'pass.money.payto',
				organizationName: org,
				logoText: getLogoText(hostname, props),
				description: 'Wallet by ' + org,
				expirationDate: new Date((props.params.dl.value || (kvConfig.id ? (Date.now() + 3 * 365 * 24 * 60 * 60 * 1000) : (Date.now() + 365 * 24 * 60 * 60 * 1000)))).toISOString(),
				backgroundColor: validColors(props.design.colorB, props.design.colorF) ? props.design.colorB : (kvConfig.theme.colorB || '#77bc65'),
				foregroundColor: validColors(props.design.colorF, props.design.colorB) ? props.design.colorF : (kvConfig.theme.colorF || '#192a14'),
				labelColor: validColors(props.design.colorF, props.design.colorB) ? props.design.colorF : (kvConfig.theme.colorTxt || '#192a14'),
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
				...(kvConfig.url ? {
					orgUrl: kvConfig.url
				} : {})
			};

			const passData = {
				...basicData,
				formatVersion: 1,
				teamIdentifier: kvConfig.teamId,

				// NFC configuration
				nfc: {
					message: bareLink
				},

				// Primary barcode (selected type)
				barcode: {
					format: props.design.barcode === 'aztec'
						? 'PKBarcodeFormatAztec'
						: props.design.barcode === 'code128'
							? 'PKBarcodeFormatCode128'
							: `PKBarcodeFormat${props.design.barcode.toUpperCase()}`,
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
								formatter(getCurrency(props.network, hostname as ITransitionType), (kvConfig.currencyLocale || undefined), customCurrencyData).format(Number(props.params.amount.value)) :
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
					...(false ? [{
						key: 'receiving',
						label: 'Received',
						value: 'PRO version only'
					}] : [])
				],
				auxiliaryFields: [
					...(props.params.amount.value && Number(props.params.amount.value) > 0 && props.split?.value ? [{
						key: 'split',
						label: 'Split',
						value: props.split.isPercent ?
							`${Number(props.split.value)}%` :
							formatter(getCurrency(props.network, hostname as ITransitionType), (kvConfig.currencyLocale || undefined), customCurrencyData).format(Number(props.split.value))
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
					}] : [])
				],
				backFields: [
					{
						key: 'balance',
						label: 'Balance',
						value: explorerUrl ? `View on ${props.network.toUpperCase()}: ${explorerUrl}` : `Balance`,
						dataDetectorTypes: ["PKDataDetectorTypeLink"]
					},
					{
						key: 'refill-address',
						label: 'Refill',
						value: `Refill this address: https://coreport.net/form?address=${props.destination}`,
						dataDetectorTypes: ["PKDataDetectorTypeLink"]
					},
					{
						key: 'pro',
						label: 'PRO version',
						value: `Open the offer: https://payto.money/pro?rc=${props.memberAddress}`,
						dataDetectorTypes: ["PKDataDetectorTypeLink"]
					},
					{
						key: 'issuer',
						label: 'Issuer',
						value: `This Pass is issued by: ${basicData.organizationName}${basicData.orgUrl ? ` https://${basicData.orgUrl}` : ''}`
					}
				]
			};

			const zip = new JSZip();
			zip.file('pass.json', JSON.stringify(passData, null, 2));

			// Add default images (should be loaded from assets)
			const defaultImages: Record<string, ArrayBuffer> = {};

			await Promise.all([
				fetch(kvConfig.icons.icon)
					.then(res => res.ok ? res.arrayBuffer() : null)
					.then(buffer => { if (buffer) defaultImages['icon.png'] = buffer; })
					.catch(() => {}),
				fetch(kvConfig.icons.icon2x)
					.then(res => res.ok ? res.arrayBuffer() : null)
					.then(buffer => { if (buffer) defaultImages['icon@2x.png'] = buffer; })
					.catch(() => {}),
				fetch(kvConfig.icons.icon3x)
					.then(res => res.ok ? res.arrayBuffer() : null)
					.then(buffer => { if (buffer) defaultImages['icon@3x.png'] = buffer; })
					.catch(() => {}),
				fetch(kvConfig.icons.logo)
					.then(res => res.ok ? res.arrayBuffer() : null)
					.then(buffer => { if (buffer) defaultImages['logo.png'] = buffer; })
					.catch(() => {}),
				fetch(kvConfig.icons.logo2x)
					.then(res => res.ok ? res.arrayBuffer() : null)
					.then(buffer => { if (buffer) defaultImages['logo@2x.png'] = buffer; })
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
			const privateKeyObj = forge.pki.privateKeyFromPem(kvConfig.privateKey);
			const manifestText = JSON.stringify(manifest, null, 2);
			const signature = forge.util.encode64(
				privateKeyObj.sign(forge.md.sha1.create().update(manifestText))
			);
			zip.file('signature', new Uint8Array(forge.util.binary.base64.decode(signature)));

			// Generate the .pkpass file
			const pkpassBlob = await zip.generateAsync({ type: 'blob' });

			// Register pass
			await registerPass(basicData, props);

			return new Response(pkpassBlob, {
				headers: {
					'Content-Type': 'application/vnd.apple.pkpass',
					'Content-Disposition': `attachment; filename="${fileid}.pkpass"`
				}
			});
		} catch (err) {
			console.error('Failed to generate pass:', err);
			throw error(500, 'Failed to generate pass');
		}
	}
} satisfies Actions;
