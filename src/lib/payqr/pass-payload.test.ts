import { readFileSync } from 'node:fs';
import { describe, it, expect, vi } from 'vitest';
import { payQrPassPayload } from './pass-payload';
import { getPayButtonUri } from '#lib/helpers/get-link.helper.js';
import { getBarcodeConfig } from '#lib/helpers/paypass-operator.helper.js';
import { generate, getWebLink } from '#lib/helpers/generate.helper.js';
import {
	initialPayQrForm,
	buildPayQrUri,
	payQrFieldFeedback,
	payQrFormSchema
} from '#lib/validators/payqr.validator.js';

const merchant =
	'payto://qr/my/MERCHANT01?acquirer-id=588734&receiver-name=Test%20Shop&merchant-city=KUALA%20LUMPUR&mcc=5411';
describe('PayQR PayPass integration', () => {
	it('Apple and Google use exactly the preview national payload, excluding presentation metadata', () => {
		const preview = payQrPassPayload(merchant + '&color-b=000000&org=Example', 'native');
		const download = payQrPassPayload(merchant, 'native');
		expect(download).toEqual(preview);
		expect(download.value).toMatch(/^000202010211/);
		const barcode = getBarcodeConfig('qr', download.value);
		expect(barcode.apple.message).toBe(preview.value);
		expect(barcode.google.value).toBe(preview.value);
	});
	it('rejects unavailable or incomplete national payloads without a portable fallback', () => {
		expect(() => payQrPassPayload('payto://qr/bn/ABC123', 'native')).toThrow(
			'issuer/acquirer specification'
		);
		expect(() => payQrPassPayload('payto://qr/bn', 'native')).toThrow();
		expect(() => payQrPassPayload(merchant + '&message=Do%20not%20drop', 'native')).toThrow();
	});
	it('restores every integration and shares the exact URI with pass links', () => {
		const props = {
			network: 'qr',
			payQrForm: { ...initialPayQrForm('bn'), identifier: 'ABC123' },
			params: { currency: {} }
		};
		const design = { org: 'Example', colorB: '#112233' };
		const outputs = generate('qr', { ...props, params: { ...props.params, design } }, []);
		expect(outputs).toHaveLength(9);
		expect(getPayButtonUri(props)).toBe('payto://qr/bn/ABC123');
		const uri = getWebLink({ network: 'qr', networkData: { ...props, design }, design: true });
		expect(outputs[0].value).toBe(uri);
		expect(uri).not.toContain('qr-payload');
		expect(outputs.find((o) => o.label === 'FinTag (Meta Tag)')?.value).toBe(
			'<meta property="qr:bn" content="ABC123" />'
		);
		expect(outputs.find((o) => o.label === 'FinTag (Well-Known)')?.value).toBe(
			'[{"qr:bn":"ABC123"}]'
		);
		expect(uri).toContain('/bn/ABC123');
		expect(outputs.find((o) => o.label === 'HTML Donation Button')?.value).toContain('donate=1');
	});
	it('keeps country-only draft links while rejecting incomplete payment targets', () => {
		for (const identifier of ['', 'https://invalid.example']) {
			const props = {
				network: 'qr',
				payQrForm: { ...initialPayQrForm('bn'), identifier },
				params: { currency: {} }
			};
			const outputs = generate('qr', props, []);
			expect(outputs[0].value).toBe('payto://qr/bn');
			expect(outputs.find((o) => o.label === 'FinTag (Meta Tag)')?.value).toBe(
				'<meta property="qr:bn" content="" />'
			);
		}
	});
	it('distinguishes empty, malformed, unverified and valid identifier feedback', () => {
		const bn = initialPayQrForm('bn');
		expect(payQrFieldFeedback(bn, 'identifier')).toEqual({ state: 'empty', message: '' });
		const result = payQrFormSchema.safeParse(bn);
		expect(
			result.success ? [] : result.error.issues.filter((i) => i.path[0] === 'identifier')
		).toHaveLength(1);
		expect(payQrFieldFeedback({ ...bn, identifier: 'http://bad' }, 'identifier').state).toBe(
			'invalid'
		);
		expect(payQrFieldFeedback({ ...bn, identifier: 'id' }, 'identifier').state).toBe('unverified');
		expect(
			payQrFieldFeedback({ ...initialPayQrForm('my'), identifier: 'ID123' }, 'identifier').state
		).toBe('valid');
	});
	it.each([
		{
			country: 'la',
			identifier: '5555555',
			acquirerId: '621354',
			applicationId: 'A000000677012111',
			receiverName: 'Test'
		},
		{
			country: 'kh',
			identifier: 'name@bank',
			receiverName: 'Test Shop',
			merchantCity: 'Phnom Penh',
			currency: 'KHR'
		},
		{
			country: 'kh',
			identifier: 'name@bank',
			receiverName: 'Test Shop',
			merchantCity: 'Phnom Penh',
			currency: 'USD'
		},
		{ country: 'sg', identifier: '+6581234567', receiverName: 'Test' },
		{ country: 'vn', identifier: '0011009950446', acquirerId: '970468' },
		{
			country: 'mm',
			identifier: '123456789012345',
			receiverName: 'Test',
			merchantCity: 'Yangon',
			mcc: '5411',
			schemeId: 'MM.COM.MMQR',
			localName: 'ဆိုင်'
		},
		{ country: 'th', identifier: '0066812345678', receiverName: 'Test' }
	] as const)(
		'$country preview, shared link and both wallet barcodes use the same payload',
		(fields) => {
			const form = { ...initialPayQrForm(fields.country), ...fields };
			const uri = buildPayQrUri(form);
			expect(uri).not.toBe('');
			const payload = payQrPassPayload(uri, 'native').value;
			const shared = getWebLink({
				network: 'qr',
				networkData: {
					network: 'qr',
					payQrForm: form,
					params: { currency: {} },
					design: { colorB: '#112233' }
				},
				design: true
			});
			expect(payQrPassPayload(shared, 'native').value).toBe(payload);
			const barcode = getBarcodeConfig('qr', payload, 'Scan to pay', 'utf-8');
			expect(barcode.apple.message).toBe(payload);
			expect(barcode.apple.messageEncoding).toBe('utf-8');
			expect(barcode.google.value).toBe(payload);
			expect(payload).not.toContain('payto:');
		}
	);
});

const sharedVectors = JSON.parse(
	readFileSync(new URL('./fixtures/payqr-payloads.json', import.meta.url), 'utf8')
) as { name: string; uri: string; payload: string }[];
for (const vector of sharedVectors)
	it(`shared native vector: ${vector.name}`, () => {
		const clock = vi.spyOn(Date, 'now').mockReturnValue(1700000000000);
		try {
			const payload = payQrPassPayload(vector.uri, 'native').value;
			expect(payload).toBe(vector.payload);
			const barcode = getBarcodeConfig('qr', payload, 'Scan to pay', 'utf-8');
			expect(barcode.apple.message).toBe(vector.payload);
			expect(barcode.google.value).toBe(vector.payload);
		} finally {
			clock.mockRestore();
		}
	});
it('expired dynamic KHQR cannot be downloaded as a usable pass', () => {
	const vector = sharedVectors.find((v) => v.name.includes('individual dynamic'))!;
	const clock = vi.spyOn(Date, 'now').mockReturnValue(1700001800001);
	try {
		expect(() => payQrPassPayload(vector.uri, 'native')).toThrow('expired');
	} finally {
		clock.mockRestore();
	}
});
