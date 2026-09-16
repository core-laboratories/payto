import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';
vi.mock('$env/dynamic/private', () => ({
	env: {
		PRIVATE_PASS_TYPE_IDENTIFIER: 'pass.test',
		PRIVATE_GW_ISSUER_ID: '123',
		PRIVATE_WWDR_PEM: 'dGVzdA==',
		PRIVATE_GW_SA_PRIVATE_KEY: 'dGVzdA=='
	}
}));
vi.mock('$env/static/public', () => ({ PUBLIC_ENABLE_STATS: 'false' }));
vi.mock('$lib/helpers/paypass-ios.helper', () => ({
	buildAppleWalletPayPass: vi.fn(async () => new Blob(['test']))
}));
vi.mock('$lib/helpers/paypass-android.helper', () => ({
	buildGoogleWalletPayPassSaveLink: vi.fn(async () => ({ saveUrl: 'https://example.test/pass' }))
}));
import { POST } from '../../routes/pass/+server';
import { buildAppleWalletPayPass } from '$lib/helpers/paypass-ios.helper';
import { buildGoogleWalletPayPassSaveLink } from '$lib/helpers/paypass-android.helper';
import { initialPayQrForm } from '$lib/validators/payqr.validator';

async function submit(
	encoding: string,
	os: string,
	qrFormat: string | undefined,
	barcode = 'aztec',
	identifier = '00123',
	country: 'vn' | 'ph' | 'id' | 'iban' = 'vn',
	omitDesign = false
) {
	const data = {
		hostname: country === 'iban' ? 'iban' : 'qr',
		os,
		props:
			country === 'iban'
				? {
						network: 'iban',
						iban: identifier,
						params: {
							receiverName: { value: 'Test' },
							amount: { value: '12.30' },
							currency: { value: 'EUR' }
						}
					}
				: {
						network: 'qr',
						payQrForm:
							country === 'vn'
								? { ...initialPayQrForm('vn'), identifier, acquirerId: '970468' }
								: {
										...initialPayQrForm(country),
										identifier,
										paymentMode: country === 'ph' ? 'p2m' : '',
										amount: '15.25',
										qrType: 'dynamic'
									}
					},
		...(omitDesign ? {} : { design: { qrFormat, barcode } })
	};
	const url = new URL('https://example.test/pass?noRedirect=1');
	const body =
		encoding === 'json'
			? JSON.stringify(data)
			: new URLSearchParams({
					hostname: data.hostname,
					os,
					props: JSON.stringify(data.props),
					...(data.design ? { design: JSON.stringify(data.design) } : {})
				});
	const request = new Request(url, {
		method: 'POST',
		headers: {
			'content-type':
				encoding === 'json' ? 'application/json' : 'application/x-www-form-urlencoded',
			origin: url.origin
		},
		body
	});
	return POST({
		request,
		url,
		fetch: vi.fn(() => {
			throw new Error('Unexpected network request');
		})
	} as unknown as RequestEvent);
}

describe('PayPass API and forms', () => {
	beforeEach(() => vi.clearAllMocks());
	for (const encoding of ['json', 'form'])
		for (const os of ['ios', 'android'])
			for (const mode of ['native', 'vietqr', 'payto', undefined]) {
				it(`${encoding} ${os} preserves ${mode} selection and Aztec format`, async () => {
					const result = await submit(encoding, os, mode);
					expect(result.status).toBe(200);
					const builder = os === 'ios' ? buildAppleWalletPayPass : buildGoogleWalletPayPassSaveLink;
					const options = vi.mocked(builder).mock.calls[0][0];
					expect(options.barcode).toMatchObject(
						os === 'ios' ? { format: 'PKBarcodeFormatAztec' } : { type: 'aztec' }
					);
					const payload =
						'message' in options.barcode ? options.barcode.message : options.barcode.value;
					expect(payload).toMatch(
						mode && mode !== 'payto' ? /^000201/ : /^payto:\/\/qr\/vn\/00123/
					);
				});
			}
	for (const encoding of ['json', 'form'])
		it(`${encoding} rejects invalid selections/data before signing`, async () => {
			for (const [mode, type, id] of [
				['invalid', 'qr', '00123'],
				['payto', 'invalid', '00123'],
				['payto', 'qr', '']
			])
				await expect(submit(encoding, 'ios', mode, type, id)).rejects.toMatchObject({
					status: 400
				});
			expect(buildAppleWalletPayPass).not.toHaveBeenCalled();
			expect(buildGoogleWalletPayPassSaveLink).not.toHaveBeenCalled();
		});
});

for (const encoding of ['json', 'form']) {
	for (const os of ['ios', 'android']) {
		it(`QR Ph ${encoding} ${os} uses portable payment data and rejects native`, async () => {
			vi.clearAllMocks();
			await expect(submit(encoding, os, 'native', 'qr', 'Demo', 'ph')).rejects.toMatchObject({
				status: 400
			});
			expect(buildAppleWalletPayPass).not.toHaveBeenCalled();
			expect(buildGoogleWalletPayPassSaveLink).not.toHaveBeenCalled();
			expect((await submit(encoding, os, 'payto', 'qr', 'Demo', 'ph')).status).toBe(200);
			const builder = os === 'ios' ? buildAppleWalletPayPass : buildGoogleWalletPayPassSaveLink;
			const barcode = vi.mocked(builder).mock.calls[0][0].barcode;
			const payload = 'message' in barcode ? barcode.message : barcode.value;
			expect(payload).toContain('payto://qr/ph/Demo?');
			expect(payload).toContain('payment-mode=p2m');
			expect(payload).toContain('amount=PHP%3A15.25');
		});
	}
}

for (const encoding of ['json', 'form'])
	for (const os of ['ios', 'android']) {
		it(`QRIS ${encoding} ${os} preserves portable data and rejects unsupported native`, async () => {
			vi.clearAllMocks();
			await expect(submit(encoding, os, 'native', 'qr', 'Demo', 'id')).rejects.toMatchObject({
				status: 400
			});
			expect(buildAppleWalletPayPass).not.toHaveBeenCalled();
			expect(buildGoogleWalletPayPassSaveLink).not.toHaveBeenCalled();
			expect((await submit(encoding, os, 'payto', 'qr', 'Demo', 'id')).status).toBe(200);
			const builder = os === 'ios' ? buildAppleWalletPayPass : buildGoogleWalletPayPassSaveLink;
			const barcode = vi.mocked(builder).mock.calls[0][0].barcode;
			const payload = 'message' in barcode ? barcode.message : barcode.value;
			expect(payload).toContain('payto://qr/id/Demo?');
			expect(payload).toContain('amount=IDR%3A15.25');
			expect(payload).toContain('qr-type=dynamic');
		});
	}

for (const encoding of ['json', 'form'])
	for (const os of ['ios', 'android'])
		for (const mode of ['payto', 'native', 'epc', undefined]) {
			it(`IBAN ${encoding} ${os} preserves ${mode} barcode data`, async () => {
				vi.clearAllMocks();
				expect(
					(await submit(encoding, os, mode, 'qr', 'FR1420041010050500013M02606', 'iban')).status
				).toBe(200);
				const builder = os === 'ios' ? buildAppleWalletPayPass : buildGoogleWalletPayPassSaveLink;
				const barcode = vi.mocked(builder).mock.calls[0][0].barcode;
				const value = 'message' in barcode ? barcode.message : barcode.value;
				expect(value).toMatch(
					mode === 'native' || mode === 'epc' ? /^BCD\n002\n1\nSCT\n/ : /^payto:\/\/iban\//
				);
				if (mode === 'native' || mode === 'epc') expect(value).toContain('EUR12.30');
				if ('messageEncoding' in barcode) expect(barcode.messageEncoding).toBe('utf-8');
			});
		}
for (const encoding of ['json', 'form'])
	it(`IBAN ${encoding} rejects invalid native before signing`, async () => {
		vi.clearAllMocks();
		for (const [barcode, id] of [
			['unknown', 'FR1420041010050500013M02606'],
			['qr', 'INVALID']
		])
			await expect(submit(encoding, 'ios', 'native', barcode, id, 'iban')).rejects.toMatchObject({
				status: 400
			});
		expect(buildAppleWalletPayPass).not.toHaveBeenCalled();
	});

for (const encoding of ['json', 'form'])
	for (const os of ['ios', 'android'])
		for (const [type, apple, google] of [
			['qr', 'PKBarcodeFormatQR', 'qrCode'],
			['pdf417', 'PKBarcodeFormatPDF417', 'pdf417'],
			['aztec', 'PKBarcodeFormatAztec', 'aztec'],
			['code128', 'PKBarcodeFormatCode128', 'code128']
		])
			it(`EPC ${encoding} ${os} supports ${type}`, async () => {
				vi.clearAllMocks();
				expect(
					(await submit(encoding, os, 'epc', type, 'FR1420041010050500013M02606', 'iban')).status
				).toBe(200);
				const builder = os === 'ios' ? buildAppleWalletPayPass : buildGoogleWalletPayPassSaveLink;
				const barcode = vi.mocked(builder).mock.calls[0][0].barcode;
				expect(barcode).toMatchObject(os === 'ios' ? { format: apple } : { type: google });
				expect('message' in barcode ? barcode.message : barcode.value).toMatch(
					/^BCD\n002\n1\nSCT\n/
				);
			});

for (const encoding of ['json', 'form'])
	for (const os of ['ios', 'android'])
		for (const country of ['iban', 'vn'] as const)
			it(`${encoding} ${os} ${country} defaults to PayTo with no design`, async () => {
				vi.clearAllMocks();
				const identifier = country === 'iban' ? 'FR1420041010050500013M02606' : '00123';
				expect(
					(await submit(encoding, os, undefined, 'qr', identifier, country, true)).status
				).toBe(200);
				const builder = os === 'ios' ? buildAppleWalletPayPass : buildGoogleWalletPayPassSaveLink;
				const barcode = vi.mocked(builder).mock.calls[0][0].barcode;
				expect('message' in barcode ? barcode.message : barcode.value).toMatch(/^payto:\/\//);
				expect(barcode).toMatchObject(
					os === 'ios' ? { format: 'PKBarcodeFormatQR' } : { type: 'qrCode' }
				);
			});
