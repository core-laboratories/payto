import { describe, it, expect } from 'vitest';
import { ibanPassPayload } from './payload';
const base = 'payto://iban/FR1420041010050500013M02606';
const uri =
	base +
	'?receiver-name=Fran%C3%A7ois%20D%27Alsace%20S.A.&amount=EUR:12.3&message=Client%3AMarie%20Louise%20La%20Lune';
describe('EPC069-12 v3.1 SCT data', () => {
	it('accepts EPC by name and rejects another scheme', () => {
		expect(ibanPassPayload(uri, 'epc')).toEqual(ibanPassPayload(uri, 'native'));
		expect(() => ibanPassPayload(uri, 'khqr')).toThrow('format');
	});
	it('encodes the EPC v2 example using supported UTF-8 charset 1 instead of example charset 2', () => {
		expect(ibanPassPayload(uri, 'native').value).toBe(
			"BCD\n002\n1\nSCT\n\nFrançois D'Alsace S.A.\nFR1420041010050500013M02606\nEUR12.3\n\n\nClient:Marie Louise La Lune"
		);
	});
	it('allows a beneficiary and IBAN without amount or BIC', () => {
		expect(ibanPassPayload(base + '?receiver-name=Test&format=epc').value).toBe(
			'BCD\n002\n1\nSCT\n\nTest\nFR1420041010050500013M02606'
		);
	});
	it('encodes reference, purpose and information in their distinct positions', () => {
		const value = ibanPassPayload(
			'payto://iban/BHBLDEHHXXX/DE71110220330123456789?receiver-name=Franz%20Musterm%C3%A4nn&amount=EUR:12.3&purpose=GDDS&reference=RF18539007547034&information=Test',
			'native'
		).value;
		expect(value.split('\n')).toEqual([
			'BCD',
			'002',
			'1',
			'SCT',
			'BHBLDEHHXXX',
			'Franz Mustermänn',
			'DE71110220330123456789',
			'EUR12.3',
			'GDDS',
			'RF18539007547034',
			'',
			'Test'
		]);
	});
	it('defaults to PayTo, strips presentation metadata and honors explicit native', () => {
		expect(ibanPassPayload(base).value).toBe(base);
		expect(ibanPassPayload(base + '?format=payto&barcode=aztec').value).toBe(base);
		expect(ibanPassPayload(uri + '&format=epc').value).toMatch(/^BCD\n/);
	});
	it.each(['USD:1', 'EUR:0', 'EUR:-1', 'EUR:1e2', 'EUR:1.001', 'EUR:1000000000', 'EUR:01', 'NaN'])(
		'rejects invalid native amount %s',
		(amount) => {
			expect(() =>
				ibanPassPayload(base + '?receiver-name=Test&amount=' + amount, 'native')
			).toThrow();
		}
	);
	it.each([
		'receiver-name=',
		'receiver-name=Test%0AInjected',
		'receiver-name=Test&reference=RF00539007547034',
		'receiver-name=Test&reference=RF18539007547034&message=Other',
		'receiver-name=Test&rc=m',
		'receiver-name=Test&purpose=X',
		'receiver-name=Test&receiver-name=Other',
		'receiver-name=%FF'
	])('rejects invalid fields %s', (query) => {
		expect(() => ibanPassPayload(base + '?' + query, 'native')).toThrow();
	});
	it('requires BIC outside EEA, rejects invalid IBAN/BIC and unsupported format/barcode', () => {
		expect(() =>
			ibanPassPayload('payto://iban/CH9300762011623852957?receiver-name=Test', 'native')
		).toThrow('BIC');
		expect(
			ibanPassPayload('payto://iban/POFICHBEXXX/CH9300762011623852957?receiver-name=Test', 'native')
				.value
		).toContain('POFICHBEXXX');
		for (const bad of ['payto://iban/bad', 'payto://iban/bad/FR1420041010050500013M02606'])
			expect(() => ibanPassPayload(bad, 'native')).toThrow();
		expect(() => ibanPassPayload(uri, 'other')).toThrow('format');
		expect(() => ibanPassPayload(uri, 'native', 'unknown')).toThrow('barcode');
	});
	it('checks individual character lengths and total UTF-8 bytes without truncating', () => {
		for (const [key, length] of [
			['receiver-name', 71],
			['message', 141],
			['information', 71]
		] as const)
			expect(() =>
				ibanPassPayload(
					base + '?' + new URLSearchParams({ 'receiver-name': 'Test', [key]: 'x'.repeat(length) }),
					'native'
				)
			).toThrow();
		expect(() =>
			ibanPassPayload(
				base +
					'?' +
					new URLSearchParams({ 'receiver-name': 'é'.repeat(70), message: 'é'.repeat(100) }),
				'native'
			)
		).toThrow('331');
		expect(
			ibanPassPayload(base + '?receiver-name=Test&amount=EUR:999999999.99', 'native').value
		).toContain('EUR999999999.99');
	});
});
