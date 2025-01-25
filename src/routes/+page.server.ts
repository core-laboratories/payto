import { redirect, error } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import JSZip from 'jszip';
import forge from 'node-forge';
import { PRIVATE_PASS_CERTIFICATE, PRIVATE_PASS_PRIVATE_KEY, PRIVATE_PASS_TEAM_IDENTIFIER } from '$env/static/private';

type Actions = {
	generatePass: (event: RequestEvent) => Promise<Response>;
};

export async function load({ url }) {
	const fullUrl = new URL(url.href);

	if (fullUrl.hostname === 'payto.money') {
		const hasValidProtocol = fullUrl.protocol === 'payto.money:';
		const path = fullUrl.pathname.startsWith('/://') ? fullUrl.pathname.slice(3) : fullUrl.pathname;

		if (hasValidProtocol || path) {
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
			const link = formData.get('link') as string;

			// Required fields
			const requiredFields = ['props', 'link'];
			for (const field of requiredFields) {
				if (!formData.has(field)) {
					throw error(400, `Missing required field: ${field}`);
				}
			}

			// Required fields in props
			const requiredFieldsInProps = ['design', 'network', 'params'];
			for (const field of requiredFieldsInProps) {
				if (!props[field]) {
					throw error(400, `Missing required field in props: ${field}`);
				}
			}

			// Basic pass data structure
			const passData = {
				serialNumber: `PT${Date.now()}`,
				formatVersion: 1,
				passTypeIdentifier: 'pass.money.payto',
				teamIdentifier: PRIVATE_PASS_TEAM_IDENTIFIER,
				organizationName: props.design.org || 'PayTo',
				description: 'PayTo: Money - Direct Asset Transfers',
				expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
				backgroundColor: props.design.colorB || '#77bc65',
				foregroundColor: props.design.colorF || '#192a14',
				labelColor: props.design.colorF || '#192a14',

				// NFC configuration
				nfc: {
					message: link
				},

				// Primary barcode (selected type)
				barcode: {
					format: props.design.barcode === 'aztec'
						? 'PKBarcodeFormatAztec'
						: props.design.barcode === 'code128'
							? 'PKBarcodeFormatCode128'
							: `PKBarcodeFormat${props.design.barcode.toUpperCase()}`,
					message: link,
					messageEncoding: 'iso-8859-1'
				},

				// All supported barcodes
				barcodes: [
					{
						format: 'PKBarcodeFormatQR',
						message: link,
						messageEncoding: 'iso-8859-1'
					},
					{
						format: 'PKBarcodeFormatPDF417',
						message: link,
						messageEncoding: 'iso-8859-1'
					},
					{
						format: 'PKBarcodeFormatAztec',
						message: link,
						messageEncoding: 'iso-8859-1'
					},
					{
						format: 'PKBarcodeFormatCode128',
						message: link,
						messageEncoding: 'iso-8859-1'
					}
				],

				// Pass fields
				headerFields: [
					{
						key: 'payment-type',
						label: 'Network',
						value: props.network ? props.network.toUpperCase() : 'PAYTO'
					}
				],
				primaryFields: [
					{
						key: 'payment',
						label: 'Pay',
						value: props.params?.amount?.value ? `${props.params.amount.value}${props.params?.currency?.value ? ' ' + props.params.currency.value.toUpperCase() : ''}` : 'Custom Amount'
					}
				],
				secondaryFields: [
					{
						key: 'recurring',
						label: 'Payment',
						value: props.params?.rc?.value ? `Recurring / ${props.params.rc.value}` : 'One-time'
					}
				],
				auxiliaryFields: props.design.item ? [
					{
						key: 'item',
						label: 'Item',
						value: props.design.item
					}
				] : [],
				backFields: [
					{
						key: 'notes',
						label: 'Important Note',
						value: 'Transfer of funds are done w/o 3rd parties.'
					}
				]
			};

			const zip = new JSZip();
			zip.file('pass.json', JSON.stringify(passData, null, 2));

			// Add default images (should be loaded from assets)
			const defaultImages = {
				'icon.png': await fetch('http://localhost:5173/assets/icon.png')
					.then(res => res.ok ? res.arrayBuffer() : fetch('/fallback/icon.png').then(r => r.arrayBuffer()))
					.catch(() => fetch('/fallback/icon.png').then(r => r.arrayBuffer())),
				'icon@2x.png': await fetch('http://localhost:5173/assets/icon@2x.png')
					.then(res => res.ok ? res.arrayBuffer() : fetch('/fallback/icon@2x.png').then(r => r.arrayBuffer()))
					.catch(() => fetch('/fallback/icon@2x.png').then(r => r.arrayBuffer())),
				'icon@3x.png': await fetch('http://localhost:5173/assets/icon@3x.png')
					.then(res => res.ok ? res.arrayBuffer() : fetch('/fallback/icon@3x.png').then(r => r.arrayBuffer()))
					.catch(() => fetch('/fallback/icon@3x.png').then(r => r.arrayBuffer())),
				'logo.png': await fetch('http://localhost:5173/assets/logo.png')
					.then(res => res.ok ? res.arrayBuffer() : fetch('/fallback/logo.png').then(r => r.arrayBuffer()))
					.catch(() => fetch('/fallback/logo.png').then(r => r.arrayBuffer())),
				'logo@2x.png': await fetch('http://localhost:5173/assets/logo@2x.png')
					.then(res => res.ok ? res.arrayBuffer() : fetch('/fallback/logo@2x.png').then(r => r.arrayBuffer()))
					.catch(() => fetch('/fallback/logo@2x.png').then(r => r.arrayBuffer()))
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
			const manifestBytes = new TextEncoder().encode(manifestText);
			const signature = forge.util.encode64(
				privateKeyObj.sign(forge.md.sha1.create().update(manifestBytes.toString()).digest())
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
