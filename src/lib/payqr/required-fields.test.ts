import { describe, expect, it } from 'vitest';
import {
	initialPayQrForm,
	buildPayQrUri,
	payQrGenerationSchema,
	type PayQrForm
} from '$lib/validators/payqr.validator';
import type { PayQrCountry } from '$payqr';
import { payQrPassPayload } from './pass-payload';

const profiles: { country: PayQrCountry; fields: Partial<PayQrForm> }[] = [
	{ country: 'kh', fields: { identifier: 'name@bank', receiverName: 'Test' } },
	{
		country: 'la',
		fields: {
			identifier: '000123',
			receiverName: 'Test',
			acquirerId: '621354',
			applicationId: 'A000000677012111'
		}
	},
	{
		country: 'my',
		fields: {
			identifier: 'MERCHANT01',
			receiverName: 'Test',
			acquirerId: '588734',
			merchantCity: 'MY',
			mcc: '5411'
		}
	},
	{
		country: 'mm',
		fields: {
			identifier: '123456789012345',
			receiverName: 'Test',
			merchantCity: 'Yangon',
			mcc: '5411',
			schemeId: 'MM.COM.MMQR',
			localName: 'ဆိုင်'
		}
	},
	{ country: 'sg', fields: { identifier: '+6581234567', receiverName: 'Test' } },
	{ country: 'th', fields: { identifier: '0812345678', receiverName: 'Test' } },
	{ country: 'vn', fields: { identifier: '00123', acquirerId: '970468' } }
];

describe('Audited country-required fields', () => {
	for (const { country, fields } of profiles) {
		const form = { ...initialPayQrForm(country), ...fields };
		it(`${country}: required fields alone generate a native barcode`, () => {
			expect(payQrGenerationSchema.safeParse(form).success).toBe(true);
			expect(payQrPassPayload(buildPayQrUri(form), 'native').value).toMatch(/^00020/);
		});
		for (const field of Object.keys(fields))
			it(`${country}: missing ${field} blocks generation`, () => {
				const incomplete = { ...form, [field]: '' };
				expect(payQrGenerationSchema.safeParse(incomplete).success).toBe(false);
				expect(() => payQrPassPayload(buildPayQrUri(incomplete), 'native')).toThrow();
			});
		it(`${country}: dynamic amount is required and sufficient with conditional KH timestamps`, () => {
			const dynamic = {
				...form,
				qrType: 'dynamic' as const,
				...(country === 'kh'
					? { creationTimestamp: '1893499200000', expirationTimestamp: '1893501000000' }
					: {})
			};
			expect(payQrGenerationSchema.safeParse(dynamic).success).toBe(false);
			expect(() => payQrPassPayload(buildPayQrUri(dynamic), 'native')).toThrow();
			expect(
				payQrPassPayload(buildPayQrUri({ ...dynamic, amount: '100' }), 'native').value
			).toMatch(/^00020/);
		});
	}
	it('KH merchant profile additionally requires merchant ID and acquiring bank', () => {
		const form = {
			...initialPayQrForm('kh'),
			identifier: 'name@bank',
			receiverName: 'Test',
			recipientType: 'merchant',
			merchantId: '123',
			acquiringBank: 'Test Bank'
		};
		expect(payQrPassPayload(buildPayQrUri(form), 'native').value).toMatch(/^000201/);
		for (const field of ['merchantId', 'acquiringBank']) {
			const incomplete = { ...form, [field]: '' };
			expect(payQrGenerationSchema.safeParse(incomplete).success).toBe(false);
			expect(() => payQrPassPayload(buildPayQrUri(incomplete), 'native')).toThrow();
		}
	});
	for (const country of ['bn', 'id', 'ph'] as const)
		it(`${country}: portable support does not imply native generation`, () => {
			const uri = buildPayQrUri({ ...initialPayQrForm(country), identifier: 'ID123' });
			expect(() => payQrPassPayload(uri, 'native')).toThrow();
			expect(payQrPassPayload(uri, 'payto').value).toBe(uri);
		});
});
