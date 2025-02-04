import { redirect, error } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { calculateColorDistance } from '$lib/helpers/euclidean-distance.helper';
import { getWebLink } from '$lib/helpers/generate.helper';
import { getCurrency } from '$lib/helpers/get-currency.helper';
import ExchNumberFormat from 'exchange-rounding';
import JSZip from 'jszip';
import forge from 'node-forge';
import { PRIVATE_PASS_CERTIFICATE, PRIVATE_PASS_PRIVATE_KEY, PRIVATE_PASS_TEAM_IDENTIFIER } from '$env/static/private';

// @ts-expect-error: Module is untyped
import pkg from 'open-location-code/js/src/openlocationcode';
const {decode} = pkg;

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

const formatter = (currency: string | undefined) => {
	return new ExchNumberFormat(undefined, {
		style: 'currency',
		currency: currency || '',
		currencyDisplay: 'symbol'
	});
}

export async function load({ url }) {
	const fullUrl = new URL(url.href);

	if (fullUrl.hostname === 'payto.money') {
		const hasValidProtocol = fullUrl.protocol === 'payto.money:';
		const path = fullUrl.pathname.startsWith('/://') ? fullUrl.pathname.slice(3) : fullUrl.pathname;

		if (hasValidProtocol && path) {
			throw redirect(302, `/show?url=${encodeURIComponent(path)}`);
		}
	}

	return {};
}

export const actions = {
	generatePass: async ({ request, url }: RequestEvent) => {
		const origin = request.headers.get('origin');
		if (origin !== url.origin) {
			throw error(403, 'Unauthorized request origin');
		}

		if (!PRIVATE_PASS_CERTIFICATE || !PRIVATE_PASS_PRIVATE_KEY || !PRIVATE_PASS_TEAM_IDENTIFIER) {
			throw error(500, 'Missing Pass configuration');
		}

		try {
			const formData = await request.formData();
			const props = JSON.parse(formData.get('props') as string);
			const hostname = formData.get('hostname') as string;

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
			const org = props.design.org || 'PayTo';
			if (hostname === 'void' && props.network === 'plus') {
				const plusCoordinates = getLocationCode(props.params.loc?.value || '');
				props.params.lat = { value: plusCoordinates[0] };
				props.params.lon = { value: plusCoordinates[1] };
			}
			const passData = {
				serialNumber: `PayTo-${props.destination}-${hostname.toLowerCase()}-${new Date(Date.now()).toISOString().replace(/[-T:]/g, '').slice(0, 12)}`,
				formatVersion: 1,
				passTypeIdentifier: 'pass.money.payto',
				teamIdentifier: PRIVATE_PASS_TEAM_IDENTIFIER,
				organizationName: org,
				logoText: org,
				description: `PayTo: ${hostname ? hostname.toUpperCase() + ' / ' : ''} ${props.design.item ? props.design.item : 'Direct Asset Transfers'}`,
				expirationDate: new Date((props.params.dl.value || (Date.now() + 365 * 24 * 60 * 60)) * 1000).toISOString(),
				backgroundColor: validColors(props.design.colorB, props.design.colorF) ? props.design.colorB : '#77bc65',
				foregroundColor: validColors(props.design.colorF, props.design.colorB) ? props.design.colorF : '#192a14',
				labelColor: validColors(props.design.colorF, props.design.colorB) ? props.design.colorF : '#192a14',
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
						label: 'Payment',
						value: hostname && hostname === 'void' ? 'CASH' : hostname.toUpperCase() + (props.network ? ': ' + props.network.toUpperCase() : '')
					}
				],
				primaryFields: [
					{
						key: 'amount',
						label: 'Amount',
						value:
							props.params.amount.value && Number(props.params.amount.value) > 0 ?
								formatter(getCurrency(props.network, hostname as ITransitionType)).format(Number(props.params.amount.value)) :
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
							formatter(getCurrency(props.network, hostname as ITransitionType)).format(Number(props.split.value))
					}] : []),
					...(props.params.message?.value ? [{
						key: 'message',
						label: 'Message',
						value: props.params.message.value
					}] : []),
				],
				backFields: [
					...(false ? [{
						key: 'balance',
						label: 'Balance',
						value: 'PRO version only'
					}] : []),
					...(props.params.amount.value && Number(props.params.amount.value) > 0 && props.split?.value && props.split?.address ? [{
						key: 'split-address',
						label: 'Split Receiving Address',
						value: props.split.address
					}] : []),
					{
						key: 'notes',
						label: 'Note',
						value: 'Transfer of funds is initiated by the sender utilizing the PayTo: protocol.'
					},
					...(false ? [{
						key: 'pro',
						label: 'PRO version',
						value: 'To activate the PRO version, please send XCB to the address: xxx<br/>Price: 50 XCB per month'
					}] : [])
				]
			};

			const zip = new JSZip();
			zip.file('pass.json', JSON.stringify(passData, null, 2));

			// Add default images (should be loaded from assets)
			const defaultImages = {
				'icon.png': await fetch('https://payto.money/icons/icon.png')
					.then(res => res.ok ? res.arrayBuffer() : fetch('/icons/icon.png').then(r => r.arrayBuffer()))
					.catch(() => fetch('/icons/icon.png').then(r => r.arrayBuffer())),
				'icon@2x.png': await fetch('https://payto.money/icons/icon@2x.png')
					.then(res => res.ok ? res.arrayBuffer() : fetch('/icons/icon@2x.png').then(r => r.arrayBuffer()))
					.catch(() => fetch('/icons/icon@2x.png').then(r => r.arrayBuffer())),
				'icon@3x.png': await fetch('https://payto.money/icons/icon@3x.png')
					.then(res => res.ok ? res.arrayBuffer() : fetch('/icons/icon@3x.png').then(r => r.arrayBuffer()))
					.catch(() => fetch('/icons/icon@3x.png').then(r => r.arrayBuffer())),
				'logo.png': await fetch('https://payto.money/icons/logo.png')
					.then(res => res.ok ? res.arrayBuffer() : fetch('/icons/logo.png').then(r => r.arrayBuffer()))
					.catch(() => fetch('/icons/logo.png').then(r => r.arrayBuffer())),
				'logo@2x.png': await fetch('https://payto.money/icons/logo@2x.png')
					.then(res => res.ok ? res.arrayBuffer() : fetch('/icons/logo@2x.png').then(r => r.arrayBuffer()))
					.catch(() => fetch('/icons/logo@2x.png').then(r => r.arrayBuffer()))
			};

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

			// Create signature
			const privateKeyObj = forge.pki.privateKeyFromPem(PRIVATE_PASS_PRIVATE_KEY);
			const manifestText = JSON.stringify(manifest, null, 2);
			const signature = forge.util.encode64(
				privateKeyObj.sign(forge.md.sha1.create().update(manifestText))
			);
			zip.file('signature', new Uint8Array(forge.util.binary.base64.decode(signature)));

			// Generate the .pkpass file
			const pkpassBlob = await zip.generateAsync({ type: 'blob' });

			return new Response(pkpassBlob, {
				headers: {
					'Content-Type': 'application/vnd.apple.pkpass',
					'Content-Disposition': `attachment; filename="payto-${Date.now()}.pkpass"`
				}
			});
		} catch (err) {
			console.error('Failed to generate pass:', err);
			throw error(500, 'Failed to generate pass');
		}
	}
} satisfies Actions;
