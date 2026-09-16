import { generateNationalQr } from './national';
import { describe, it, expect } from 'vitest';
import { aseanQrCountries } from './countries';
import { payQrSchemes, parsePayQr } from '$payqr';
import {
	initialPayQrForm,
	payQrFormSchema,
	buildPayQrUri,
	malaysiaPayQrSchema
} from '$lib/validators/payqr.validator';
const identifiers: Record<string, string> = {
	bn: 'ABC123',
	kh: 'name@bank',
	id: 'ABC123',
	la: 'ABC123',
	my: 'MERCHANT01',
	mm: '123456789012345',
	ph: 'ABC123',
	sg: '+6581234567',
	th: '0066812345678',
	vn: 'ABC123'
};
describe('PayQR constructor validation', () => {
	for (const { value: country } of aseanQrCountries) {
		it(`${country}: builds canonical URI, validates scheme and identifier`, () => {
			const form = { ...initialPayQrForm(country), identifier: identifiers[country] };
			expect(payQrFormSchema.safeParse(form).success).toBe(true);
			expect(parsePayQr(buildPayQrUri(form)).scheme).toBe(payQrSchemes[country].scheme);
			expect(buildPayQrUri({ ...form, identifier: 'https://bad.example' })).toBe('');
			expect(buildPayQrUri({ ...form, scheme: 'wrong' })).toBe('');
			expect(buildPayQrUri({ ...form, currency: 'ZZZ', amount: '1' })).toBe('');
		});
	}
	it('country list is alphabetical and uses ISO codes', () => {
		const names = aseanQrCountries.map((c) => c.label.split(' ').slice(1).join(' '));
		expect(names).toEqual([...names].sort());
		expect(aseanQrCountries.map((c) => c.value)).toEqual([
			'kh',
			'id',
			'la',
			'my',
			'mm',
			'ph',
			'sg',
			'th',
			'vn'
		]);
	});
	it('individual reusable schemas apply the same validation', () => {
		expect(
			malaysiaPayQrSchema.safeParse({ ...initialPayQrForm('my'), identifier: 'a-b' }).success
		).toBe(false);
	});
	it('rejects invalid amount, ASCII field limits, MCC, acquirer and cross-field dependencies', () => {
		const form = { ...initialPayQrForm('my'), identifier: 'MERCHANT01' };
		for (const update of [
			{ amount: '-1' },
			{ amount: '1.123' },
			{ receiverName: 'x'.repeat(26) },
			{ merchantCity: 'x'.repeat(16) },
			{ mcc: 'ABC' },
			{ acquirerId: '123' },
			{ qrType: 'dynamic' }
		])
			expect(payQrFormSchema.safeParse({ ...form, ...update }).success).toBe(false);
		const thai = {
			...initialPayQrForm('th'),
			identifier: identifiers.th,
			qrType: 'dynamic' as const
		};
		expect(payQrFormSchema.safeParse(thai).success).toBe(false);
		expect(payQrFormSchema.safeParse({ ...thai, amount: '12.34' }).success).toBe(true);
	});
	it('national preview is actual EMV and fails closed with an unencodable message', () => {
		const form = {
			...initialPayQrForm('my'),
			identifier: 'MERCHANT01',
			acquirerId: '588734',
			mcc: '5411',
			receiverName: 'Test Shop',
			merchantCity: 'KUALA LUMPUR'
		};
		const uri = buildPayQrUri(form);
		expect(generateNationalQr(parsePayQr(uri))).toMatch(/^000202010211/);
		expect(() =>
			generateNationalQr(parsePayQr(buildPayQrUri({ ...form, message: 'Do not drop this' })))
		).toThrow();
	});
	it('switching country clears old account and scheme-specific values', () => {
		const next = initialPayQrForm('la');
		expect(next.identifier).toBe('');
		expect(next.acquirerId).toBe('');
		expect(next.currency).toBe('LAK');
	});
});
