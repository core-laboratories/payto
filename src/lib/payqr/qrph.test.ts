import { describe, it, expect } from 'vitest';
import {
	initialPayQrForm,
	buildPayQrUri,
	philippinesPayQrSchema,
	payQrFieldFeedback
} from '$lib/validators/payqr.validator';
import { payQrPassPayload } from './pass-payload';
describe('QR Ph portable payment data', () => {
	it.each(['p2p', 'p2m'] as const)(
		'preserves %s data without inventing native payloads',
		(paymentMode) => {
			const form = {
				...initialPayQrForm('ph'),
				identifier: 'Demo@Issuer',
				paymentMode,
				qrType: 'dynamic' as const,
				amount: '15.25',
				reference: 'Bill 1',
				receiverName: 'José'
			};
			expect(form.currency).toBe('PHP');
			expect(philippinesPayQrSchema.safeParse(form).success).toBe(true);
			const uri = buildPayQrUri(form);
			expect(uri).toContain('payment-mode=' + paymentMode);
			expect(uri).toContain('amount=PHP%3A15.25');
			expect(payQrPassPayload(uri, 'payto').value).toBe(uri);
			expect(payQrPassPayload(uri).value).toBe(uri);
			expect(() => payQrPassPayload(uri, 'native')).toThrow();
			expect(payQrFieldFeedback(form, 'identifier').state).toBe('unverified');
		}
	);
	it.each([
		{ currency: 'USD', amount: '1' },
		{ amount: '1.234' },
		{ amount: '0' },
		{ qrType: 'dynamic' },
		{ paymentMode: 'bad' },
		{ reference: 'bad\u0000' }
	])('rejects invalid data %j', (fields) => {
		expect(
			philippinesPayQrSchema.safeParse({ ...initialPayQrForm('ph'), identifier: 'Demo', ...fields })
				.success
		).toBe(false);
	});
});
