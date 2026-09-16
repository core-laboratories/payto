import { describe, it, expect } from 'vitest';
import { paymentBarcodeSvg } from './barcode';
import { payQrPassPayload } from './pass-payload';
import { getBarcodeConfig } from '$lib/helpers/paypass-operator.helper';
import { generate, getWebLink } from '$lib/helpers/generate.helper';
import { initialPayQrForm } from '$lib/validators/payqr.validator';

describe('Payment barcode format selection', () => {
	it('scheme names select only their matching native encoder', () => {
		const uri = 'payto://qr/vn/00123?acquirer-id=970468';
		expect(payQrPassPayload(uri, 'vietqr')).toEqual(payQrPassPayload(uri, 'native'));
		expect(() => payQrPassPayload(uri, 'khqr')).toThrow('format');
		expect(() => payQrPassPayload(uri, 'epc')).toThrow('format');
	});
	it('explicit native mode only generates from required valid fields', () => {
		expect(() => payQrPassPayload('payto://qr/vn/00123', 'native')).toThrow();
		expect(payQrPassPayload('payto://qr/vn/00123?acquirer-id=970468', 'native').value).toMatch(
			/^000201/
		);
		expect(() => payQrPassPayload('payto://qr/vn/00123?acquirer-id=bad', 'native')).toThrow();
	});
	it('PayTo mode needs a valid URI but no native-only fields', () => {
		expect(payQrPassPayload('payto://qr/bn/ID123', 'payto').value).toBe('payto://qr/bn/ID123');
		expect(() => payQrPassPayload('payto://qr/bn', 'payto')).toThrow();
		expect(() => payQrPassPayload('payto://qr/th/invalid', 'payto')).toThrow();
		expect(() => payQrPassPayload('payto://qr/bn/ID123', 'invalid')).toThrow();
	});
	it('shared links persist the selection without including presentation options in the barcode', () => {
		const outputs = generate(
			'qr',
			{
				network: 'qr',
				payQrForm: { ...initialPayQrForm('bn'), identifier: 'ID123' },
				params: { currency: {}, design: { qrFormat: 'payto', barcode: 'aztec' } }
			},
			[]
		);
		const uri = outputs[0].value;
		expect(uri).not.toContain('format=');
		expect(uri).toContain('barcode=aztec');
		expect(payQrPassPayload(uri).value).toBe('payto://qr/bn/ID123');
	});
	it.each(['qr', 'iban'] as const)('%s includes native format only in PayPass URLs', (network) => {
		const data =
			network === 'qr'
				? {
						network,
						payQrForm: { ...initialPayQrForm('vn'), identifier: '00123', acquirerId: '970468' }
					}
				: { network, iban: 'FR1420041010050500013M02606' };
		for (const qrFormat of [undefined, 'payto', 'native']) {
			const networkData = { ...data, design: { qrFormat, barcode: 'qr' } };
			expect(getWebLink({ network, networkData })).not.toContain('format=');
			const pass = new URL(getWebLink({ network, networkData, design: true }));
			expect(pass.searchParams.get('format')).toBe(
				qrFormat === 'native' ? (network === 'iban' ? 'epc' : 'vietqr') : null
			);
		}
	});
	for (const [type, apple, google] of [
		['qr', 'PKBarcodeFormatQR', 'qrCode'],
		['pdf417', 'PKBarcodeFormatPDF417', 'pdf417'],
		['aztec', 'PKBarcodeFormatAztec', 'aztec'],
		['code128', 'PKBarcodeFormatCode128', 'code128']
	]) {
		for (const mode of ['native', 'payto'])
			it(`${type}: ${mode} preview and both wallet formats`, () => {
				const payload = payQrPassPayload('payto://qr/vn/00123?acquirer-id=970468', mode).value;
				expect(paymentBarcodeSvg(payload, type)).toContain('<svg');
				const config = getBarcodeConfig(type, payload, '', 'utf-8');
				expect(config.apple).toMatchObject({ format: apple, message: payload });
				expect(config.google).toMatchObject({ type: google, value: payload });
			});
	}
	it('rejects invalid barcode types and data exceeding barcode capacity', () => {
		expect(() => paymentBarcodeSvg('abc', 'unknown')).toThrow();
		expect(() => paymentBarcodeSvg('', 'qr')).toThrow();
		expect(() => paymentBarcodeSvg('x'.repeat(5000), 'qr')).toThrow();
	});
});

it('KHQR requires a receiver name but uses the documented optional city default', () => {
	const uri = 'payto://qr/kh/lol%40cc?qr-currency=KHR';
	expect(() => payQrPassPayload(uri, 'native')).toThrow();
	const minimal = payQrPassPayload(uri + '&receiver-name=Test', 'native').value;
	expect(minimal).toBe(
		payQrPassPayload(uri + '&receiver-name=Test&merchant-city=Phnom%20Penh', 'native').value
	);
	expect(() =>
		payQrPassPayload(uri + '&receiver-name=Test&merchant-city=' + 'x'.repeat(16), 'native')
	).toThrow();
});

it('links without format default to PayTo; explicit native selects the national payload', () => {
	const uri = 'payto://qr/vn/00123?acquirer-id=970468';
	expect(payQrPassPayload(uri).value).toBe(uri);
	expect(payQrPassPayload(uri + '&format=payto').value).toBe(uri);
	expect(payQrPassPayload(uri + '&format=vietqr').value).toMatch(/^000201/);
	expect(() => payQrPassPayload(uri + '&format=invalid')).toThrow();
});
