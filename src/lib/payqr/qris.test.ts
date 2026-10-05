import { describe, it, expect } from 'vitest';
import {
	initialPayQrForm,
	buildPayQrUri,
	indonesiaPayQrSchema,
	payQrFieldFeedback
} from '#lib/validators/payqr.validator.js';
import { payQrPassPayload } from './pass-payload';
describe('QRIS domestic portable profile', () => {
	it('accepts static destination and maximum dynamic amount without native fallback', () => {
		const form = { ...initialPayQrForm('id'), identifier: 'Demo', qrType: 'static' as const };
		expect(form.currency).toBe('IDR');
		expect(indonesiaPayQrSchema.safeParse(form).success).toBe(true);
		expect(payQrFieldFeedback(form, 'identifier').state).toBe('unverified');
		const uri = buildPayQrUri({
			...form,
			qrType: 'dynamic',
			amount: '10000000.00',
			receiverName: 'Test Shop',
			reference: 'Bill 1'
		});
		expect(uri).toContain('amount=IDR%3A10000000.00');
		expect(payQrPassPayload(uri, 'payto').value).toBe(uri);
		expect(() => payQrPassPayload(uri, 'native')).toThrow();
	});
	it.each([
		{ amount: '10000000.01' },
		{ amount: '-1' },
		{ amount: '0' },
		{ amount: '1e3' },
		{ amount: '1.001' },
		{ amount: '1', currency: 'USD' },
		{ amount: '1', qrType: 'static' },
		{ qrType: 'dynamic' },
		{ qrType: 'cpm' },
		{ identifierType: 'nmid' }
	])('rejects invalid profile %j', (fields) => {
		expect(
			indonesiaPayQrSchema.safeParse({ ...initialPayQrForm('id'), identifier: 'Demo', ...fields })
				.success
		).toBe(false);
	});
});
