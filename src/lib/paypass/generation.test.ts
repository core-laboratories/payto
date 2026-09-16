import { beforeAll, afterAll, describe, expect, it, vi } from 'vitest';
import { generateKeyPairSync, createHash, verify } from 'node:crypto';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import forge from 'node-forge';
import JSZip from 'jszip';
import type { RequestEvent } from '@sveltejs/kit';
import { initialPayQrForm, payQrParameterFields } from '$lib/validators/payqr.validator';
import { parsePayQr } from '$payqr';
import { getLink } from '$lib/helpers/get-link.helper';
import vectors from '$lib/payqr/fixtures/payqr-payloads.json';

// Only configuration and image I/O are substituted. Wallet builders/signers are real.
const config = vi.hoisted(() => ({ env: {} as Record<string, string> }));
vi.mock('$env/dynamic/private', () => config);
vi.mock('$env/dynamic/public', () => ({ env: {} }));
vi.mock('$env/static/public', () => ({ PUBLIC_ENABLE_STATS: 'false' }));
let POST: typeof import('../../routes/pass/+server').POST;
let publicKey: string;
let scratch: string;
const png = Buffer.from(
	'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=',
	'base64'
);
const images = vi.fn(async () => new Response(png, { headers: { 'content-type': 'image/png' } }));
const types = [
	['qr', 'PKBarcodeFormatQR', 'qrCode'],
	['pdf417', 'PKBarcodeFormatPDF417', 'pdf417'],
	['aztec', 'PKBarcodeFormatAztec', 'aztec'],
	['code128', 'PKBarcodeFormatCode128', 'code128']
] as const;

beforeAll(async () => {
	scratch = mkdtempSync(join(tmpdir(), 'paypass-test-'));
	const keys = generateKeyPairSync('rsa', {
		modulusLength: 2048,
		privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
		publicKeyEncoding: { type: 'spki', format: 'pem' }
	});
	publicKey = keys.publicKey;
	const key = forge.pki.privateKeyFromPem(keys.privateKey);
	const cert = forge.pki.createCertificate();
	cert.publicKey = forge.pki.publicKeyFromPem(publicKey);
	cert.serialNumber = '01';
	cert.validity.notBefore = new Date(Date.now() - 60000);
	cert.validity.notAfter = new Date(Date.now() + 86400000);
	const subject = [{ name: 'commonName', value: 'PayPass test only' }];
	cert.setSubject(subject);
	cert.setIssuer(subject);
	cert.sign(key, forge.md.sha256.create());
	const p12 = forge.pkcs12.toPkcs12Asn1(key, cert, 'test-password', { algorithm: '3des' });
	Object.assign(config.env, {
		PRIVATE_PASS_TEAM_IDENTIFIER: 'TESTTEAM',
		PRIVATE_PASS_TYPE_IDENTIFIER: 'pass.test.payto',
		PRIVATE_PASS_P12_BASE64: forge.util.encode64(forge.asn1.toDer(p12).getBytes()),
		PRIVATE_PASS_P12_PASSWORD: 'test-password',
		PRIVATE_WWDR_PEM: Buffer.from(forge.pki.certificateToPem(cert)).toString('base64'),
		PRIVATE_GW_ISSUER_ID: '123456',
		PRIVATE_GW_SA_EMAIL: 'test@example.invalid',
		PRIVATE_GW_SA_PRIVATE_KEY: Buffer.from(keys.privateKey).toString('base64')
	});
	vi.stubGlobal(
		'fetch',
		vi.fn(() => {
			throw new Error('External network disabled in wallet tests');
		})
	);
	POST = (await import('../../routes/pass/+server')).POST;
});
afterAll(() => {
	vi.unstubAllGlobals();
	if (scratch) rmSync(scratch, { recursive: true, force: true });
});

function qrProps(uri: string) {
	const target = parsePayQr(uri);
	const form = {
		...initialPayQrForm(target.country),
		identifier: target.identifier,
		identifierType: target.identifierType
	};
	for (const [key, field] of Object.entries(payQrParameterFields))
		if (target.parameters[key] !== undefined)
			Object.assign(form, { [field]: target.parameters[key] });
	if (target.parameters.amount) [form.currency, form.amount] = target.parameters.amount.split(':');
	if (target.parameters['qr-currency']) form.currency = target.parameters['qr-currency'];
	return { network: 'qr', payQrForm: form };
}
function portable(props: any): string {
	const url = new URL(getLink(props.network, props));
	if (props.network === 'iban') url.search = url.searchParams.toString();
	return url.toString();
}
const ibanProps = {
	network: 'iban',
	iban: 'FR1420041010050500013M02606',
	params: {
		receiverName: { value: 'Test Beneficiary' },
		currency: { value: 'EUR' },
		amount: { value: '12.30' },
		reference: { value: 'RF18539007547034' }
	}
};
const epc =
	'BCD\n002\n1\nSCT\n\nTest Beneficiary\nFR1420041010050500013M02606\nEUR12.30\n\nRF18539007547034';
type Input = { hostname: string; os: string; props: any; design?: any };
async function submit(data: Input, encoding = 'json', query = '?noRedirect=1') {
	const url = new URL('https://wallet-test.invalid/pass' + query);
	let body: BodyInit;
	const headers: Record<string, string> = { origin: url.origin };
	if (encoding === 'json') {
		body = JSON.stringify(data);
		headers['content-type'] = 'application/json';
	} else {
		const fields = Object.fromEntries(
			Object.entries(data).map(([key, value]) => [
				key,
				typeof value === 'object' ? JSON.stringify(value) : value
			])
		);
		if (encoding === 'multipart') {
			const form = new FormData();
			for (const [key, value] of Object.entries(fields)) form.set(key, value);
			body = form;
		} else {
			body = new URLSearchParams(fields);
			headers['content-type'] = 'application/x-www-form-urlencoded';
		}
	}
	return POST({
		request: new Request(url, { method: 'POST', headers, body }),
		url,
		fetch: images
	} as unknown as RequestEvent);
}

async function apple(response: Response, message: string, format: string) {
	expect(response.status).toBe(200);
	expect(response.headers.get('content-type')).toBe('application/vnd.apple.pkpass');
	expect(response.headers.get('content-disposition')).toContain('.pkpass');
	const zip = await JSZip.loadAsync(await response.arrayBuffer());
	const pass = JSON.parse(await zip.file('pass.json')!.async('string'));
	expect(pass).toMatchObject({
		formatVersion: 1,
		passTypeIdentifier: 'pass.test.payto',
		teamIdentifier: 'TESTTEAM'
	});
	expect(pass.serialNumber.length).toBeLessThanOrEqual(64);
	expect(pass.barcodes).toEqual([
		{ format, message, messageEncoding: 'utf-8', altText: 'paypass.scanToPay' }
	]);
	expect(await zip.file('icon.png')!.async('nodebuffer')).toEqual(png);
	expect(await zip.file('logo.png')!.async('nodebuffer')).toEqual(png);
	expect(await zip.file('en.lproj/pass.strings')!.async('string')).toContain('paypass.scanToPay');
	const manifestText = await zip.file('manifest.json')!.async('string');
	const manifest = JSON.parse(manifestText);
	const entries = Object.values(zip.files).filter(
		(f) => !f.dir && !['signature', 'manifest.json'].includes(f.name)
	);
	expect(Object.keys(manifest).sort()).toEqual(entries.map((f) => f.name).sort());
	for (const entry of entries)
		expect(manifest[entry.name]).toBe(
			createHash('sha1')
				.update(await entry.async('nodebuffer'))
				.digest('hex')
		);
	writeFileSync(join(scratch, 'manifest'), manifestText);
	writeFileSync(join(scratch, 'signature'), await zip.file('signature')!.async('nodebuffer'));
	// Verify detached CMS signature independently; test certificates are deliberately not Apple-trusted.
	const verified = execFileSync(
		'openssl',
		[
			'cms',
			'-verify',
			'-binary',
			'-inform',
			'DER',
			'-in',
			join(scratch, 'signature'),
			'-content',
			join(scratch, 'manifest'),
			'-noverify'
		],
		{ stdio: ['pipe', 'pipe', 'pipe'] }
	);
	expect(verified.toString()).toBe(manifestText);
	return pass;
}
function googleToken(saveUrl: string, message: string, type: string) {
	expect(saveUrl).toMatch(/^https:\/\/pay.google.com\/gp\/v\/save\//);
	const token = saveUrl.split('/').at(-1)!;
	const [header, body, signature] = token.split('.');
	expect(JSON.parse(Buffer.from(header, 'base64url').toString())).toEqual({
		alg: 'RS256',
		typ: 'JWT'
	});
	expect(
		verify(
			'RSA-SHA256',
			Buffer.from(header + '.' + body),
			publicKey,
			Buffer.from(signature, 'base64url')
		)
	).toBe(true);
	expect(
		verify(
			'RSA-SHA256',
			Buffer.from(header + '.' + body + 'x'),
			publicKey,
			Buffer.from(signature, 'base64url')
		)
	).toBe(false);
	const jwt = JSON.parse(Buffer.from(body, 'base64url').toString());
	expect(jwt).toMatchObject({ iss: 'test@example.invalid', aud: 'google', typ: 'savetowallet' });
	expect(Math.abs(jwt.iat - Date.now() / 1000)).toBeLessThan(10);
	const object = jwt.payload.genericObjects[0];
	const klass = jwt.payload.genericClasses[0];
	expect(object.classId).toBe(klass.id);
	expect(object.id).toMatch(/^123456\./);
	expect(object.id.length).toBeLessThanOrEqual(64);
	expect(object.barcode).toMatchObject({ type, value: message });
	return { object, klass };
}
async function google(response: Response, message: string, type: string) {
	expect(response.status).toBe(200);
	const body = await response.json();
	const { object, klass } = googleToken(body.saveUrl, message, type);
	expect(body.gwObject).toEqual(object);
	expect(body.gwClass).toEqual(klass);
	expect(body.id).toBe(object.id);
	return object;
}

// Expired dynamic KH fixtures are covered by rejection tests, not regenerated with guessed timestamps.
const samples = vectors
	.filter((v) => !v.uri.includes('expiration-timestamp'))
	.map((v) => ({
		name: v.name,
		props: qrProps(v.uri),
		payload: v.payload,
		format: parsePayQr(v.uri).scheme
	}));
const matrix = [{ name: 'IBAN EPC', props: ibanProps, payload: epc, format: 'epc' }, ...samples];
describe('Real signed wallet artifacts', () => {
	for (const sample of matrix)
		for (const os of ['ios', 'android'])
			it(`${os}: ${sample.name} preserves exact native vector`, async () => {
				const response = await submit({
					hostname: sample.props.network,
					os,
					props: structuredClone(sample.props),
					design: { qrFormat: sample.format }
				});
				if (os === 'ios') await apple(response, sample.payload, 'PKBarcodeFormatQR');
				else await google(response, sample.payload, 'qrCode');
			});
	for (const encoding of ['json', 'form', 'multipart'])
		for (const os of ['ios', 'android'])
			for (const sample of [matrix[0], matrix.find((s) => s.format === 'vietqr')!])
				for (const [barcode, appleType, googleType] of types)
					for (const mode of ['payto', sample.format, undefined])
						it(`${encoding} ${os} ${sample.format} ${mode ?? 'default'} ${barcode}`, async () => {
							const props = structuredClone(sample.props);
							const message = mode === sample.format ? sample.payload : portable(props);
							const response = await submit(
								{ hostname: props.network, os, props, design: { qrFormat: mode, barcode } },
								encoding
							);
							if (os === 'ios') await apple(response, message, appleType);
							else await google(response, message, googleType);
						});
	for (const encoding of ['json', 'form', 'multipart'])
		for (const os of ['ios', 'android'])
			for (const country of ['iban', 'ph', 'id', 'bn'])
				it(`${encoding} ${os} ${country}: omitted design defaults to portable QR`, async () => {
					const props =
						country === 'iban'
							? structuredClone(ibanProps)
							: qrProps(`payto://qr/${country}/ID123`);
					const message = portable(props);
					const response = await submit({ hostname: props.network, os, props }, encoding);
					if (os === 'ios') await apple(response, message, 'PKBarcodeFormatQR');
					else await google(response, message, 'qrCode');
				});
	for (const encoding of ['form', 'multipart'])
		it(`${encoding}: Google HTML form returns a signed save redirect`, async () => {
			const response = await submit(
				{
					hostname: 'iban',
					os: 'android',
					props: structuredClone(ibanProps),
					design: { qrFormat: 'epc' }
				},
				encoding,
				''
			);
			expect(response.status).toBe(302);
			googleToken(response.headers.get('location')!, epc, 'qrCode');
		});
});

const invalidCases: { name: string; input: Omit<Input, 'os'> }[] = [
	{
		name: 'EPC missing beneficiary',
		input: { hostname: 'iban', props: { ...ibanProps, params: {} }, design: { qrFormat: 'epc' } }
	},
	{
		name: 'EPC invalid IBAN',
		input: {
			hostname: 'iban',
			props: { ...ibanProps, iban: 'INVALID' },
			design: { qrFormat: 'epc' }
		}
	},
	{
		name: 'EPC invalid BIC',
		input: { hostname: 'iban', props: { ...ibanProps, bic: 'BAD' }, design: { qrFormat: 'epc' } }
	},
	{
		name: 'EPC missing non-EEA BIC',
		input: {
			hostname: 'iban',
			props: { ...ibanProps, iban: 'AL35202111090000000001234567' },
			design: { qrFormat: 'epc' }
		}
	},
	{
		name: 'EPC wrong currency',
		input: {
			hostname: 'iban',
			props: { ...ibanProps, params: { ...ibanProps.params, currency: { value: 'USD' } } },
			design: { qrFormat: 'epc' }
		}
	},
	{
		name: 'EPC invalid RF',
		input: {
			hostname: 'iban',
			props: { ...ibanProps, params: { ...ibanProps.params, reference: { value: 'dzb' } } },
			design: { qrFormat: 'epc' }
		}
	},
	{
		name: 'EPC conflicting reference/message',
		input: {
			hostname: 'iban',
			props: { ...ibanProps, params: { ...ibanProps.params, message: { value: 'Invoice' } } },
			design: { qrFormat: 'epc' }
		}
	},
	{
		name: 'unknown barcode',
		input: { hostname: 'iban', props: ibanProps, design: { barcode: 'invalid' } }
	},
	{
		name: 'wrong IBAN format',
		input: { hostname: 'iban', props: ibanProps, design: { qrFormat: 'khqr' } }
	},
	{
		name: 'wrong QR country format',
		input: {
			hostname: 'qr',
			props: qrProps('payto://qr/vn/00123?acquirer-id=970468'),
			design: { qrFormat: 'khqr' }
		}
	},
	{
		name: 'missing receiving bank',
		input: { hostname: 'qr', props: qrProps('payto://qr/vn/00123'), design: { qrFormat: 'vietqr' } }
	},
	{
		name: 'expired KHQR',
		input: {
			hostname: 'qr',
			props: qrProps(vectors.find((v) => v.uri.includes('expiration-timestamp'))!.uri),
			design: { qrFormat: 'khqr' }
		}
	},
	...(['ph', 'id', 'bn'] as const).map((country) => ({
		name: `${country} unsupported native`,
		input: {
			hostname: 'qr',
			props: qrProps(`payto://qr/${country}/ID123`),
			design: { qrFormat: 'native' }
		}
	}))
];
describe('Invalid requests never return a signed wallet artifact', () => {
	for (const encoding of ['json', 'form', 'multipart'])
		for (const os of ['ios', 'android'])
			for (const sample of invalidCases)
				it(`${encoding} ${os}: ${sample.name}`, async () => {
					const calls = images.mock.calls.length;
					const log = vi.spyOn(console, 'error').mockImplementation(() => {});
					try {
						await expect(
							submit({ ...structuredClone(sample.input), os }, encoding)
						).rejects.toMatchObject({ status: 400 });
						expect(images.mock.calls.length).toBe(calls);
					} finally {
						log.mockRestore();
					}
				});
	it('Apple manifest signature fails after tampering', async () => {
		await apple(
			await submit({
				hostname: 'iban',
				os: 'ios',
				props: structuredClone(ibanProps),
				design: { qrFormat: 'epc' }
			}),
			epc,
			'PKBarcodeFormatQR'
		);
		writeFileSync(join(scratch, 'manifest'), '{"tampered":true}');
		expect(() =>
			execFileSync(
				'openssl',
				[
					'cms',
					'-verify',
					'-binary',
					'-inform',
					'DER',
					'-in',
					join(scratch, 'signature'),
					'-content',
					join(scratch, 'manifest'),
					'-noverify'
				],
				{ stdio: 'pipe' }
			)
		).toThrow();
	});
	it('Apple image failure propagates instead of returning an incomplete pass', async () => {
		const log = vi.spyOn(console, 'error').mockImplementation(() => {});
		images.mockImplementationOnce(async () => new Response(null, { status: 404 }));
		try {
			await expect(
				submit({ hostname: 'iban', os: 'ios', props: structuredClone(ibanProps) })
			).rejects.toMatchObject({ status: 500 });
		} finally {
			log.mockRestore();
		}
	});
	it('missing Apple and Google signing configuration fails explicitly', async () => {
		const { buildAppleWalletPayPass } = await import('$lib/helpers/paypass-ios.helper');
		const { buildGoogleWalletPayPassSaveLink } =
			await import('$lib/helpers/paypass-android.helper');
		await expect(buildAppleWalletPayPass({} as any)).rejects.toThrow('signing configuration');
		await expect(buildGoogleWalletPayPassSaveLink({} as any)).rejects.toThrow(
			'signing configuration'
		);
	});
});

describe('Wallet presentation and artifact integrity regressions', () => {
	for (const os of ['ios', 'android']) {
		it(`${os}: UTF-8 EPC fields survive signing`, async () => {
			const name = 'Žofia 商店';
			const props = {
				...structuredClone(ibanProps),
				params: { ...ibanProps.params, receiverName: { value: name } }
			};
			const response = await submit({
				hostname: 'iban',
				os,
				props,
				design: { qrFormat: 'epc', barcode: 'aztec', lang: 'sk', item: 'Invoice 123' }
			});
			const expected = epc.replace('Test Beneficiary', name);
			if (os === 'ios') await apple(response, expected, 'PKBarcodeFormatAztec');
			else await google(response, expected, 'aztec');
		});
		it(`${os}: presentation options stay outside barcode payment data`, async () => {
			const props = structuredClone(ibanProps);
			const response = await submit({
				hostname: 'iban',
				os,
				props,
				design: {
					qrFormat: 'epc',
					barcode: 'qr',
					colorB: '#123456',
					org: 'Test shop',
					item: 'Invoice 123',
					lang: 'sk'
				}
			});
			if (os === 'ios') {
				const pass = await apple(response, epc, 'PKBarcodeFormatQR');
				expect(pass.backgroundColor).toBe('#123456');
				expect(JSON.stringify(pass.generic.backFields)).toContain('format=epc');
			} else {
				const object = await google(response, epc, 'qrCode');
				expect(object.hexBackgroundColor).toBe('#123456');
				expect(JSON.stringify(object.linksModuleData)).toContain('format=epc');
			}
		});
		it(`${os}: repeated requests issue unique pass identifiers`, async () => {
			const request = {
				hostname: 'iban',
				os,
				props: structuredClone(ibanProps),
				design: { qrFormat: 'epc' }
			};
			const first = await submit(structuredClone(request));
			const second = await submit(structuredClone(request));
			if (os === 'ios') {
				const one = await apple(first, epc, 'PKBarcodeFormatQR');
				const two = await apple(second, epc, 'PKBarcodeFormatQR');
				expect(one.serialNumber).not.toBe(two.serialNumber);
			} else {
				const one = await google(first, epc, 'qrCode');
				const two = await google(second, epc, 'qrCode');
				expect(one.id).not.toBe(two.id);
			}
		});
	}
});

describe('National payloads across alternate barcode types', () => {
	const countrySamples = [...new Map(samples.map((sample) => [sample.format, sample])).values()];
	for (const sample of countrySamples)
		for (const os of ['ios', 'android'])
			for (const [barcode, appleType, googleType] of types.slice(1))
				it(`${os} ${sample.format} ${barcode}: preserves exact payload`, async () => {
					const input = {
						hostname: 'qr',
						os,
						props: structuredClone(sample.props),
						design: { qrFormat: sample.format, barcode }
					};
					const response = await submit(input);
					if (os === 'ios') await apple(response, sample.payload, appleType);
					else await google(response, sample.payload, googleType);
				});
});
