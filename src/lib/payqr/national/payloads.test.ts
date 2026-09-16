import { parsePayQr } from '$payqr';
import { test } from 'vitest';
import assert from 'node:assert/strict';
const assertFalse = (value: unknown) => assert.ok(!value);
import { readFileSync } from 'node:fs';
import {
	generateNationalQr,
	tryGenerateNationalQr,
	payQrAdapters,
	validateCRC,
	calculateCRC16,
	parseNationalQr,
	finishEmv,
	parseEmvStringTlv
} from './index';
const vectors = JSON.parse(
	readFileSync(new URL('../fixtures/payqr-payloads.json', import.meta.url), 'utf8')
) as { name: string; uri: string; payload: string }[];
for (const vector of vectors)
	test(vector.name, () => {
		const target = parsePayQr(vector.uri);
		assert.strictEqual(generateNationalQr(target), vector.payload);
		assert.strictEqual(generateNationalQr(target), generateNationalQr(target));
		assert.ok(validateCRC(vector.payload));
		assertFalse(
			validateCRC(vector.payload.slice(0, -1) + (vector.payload.endsWith('0') ? '1' : '0'))
		);
		assert.deepStrictEqual(tryGenerateNationalQr(target), {
			supported: true,
			valid: true,
			payload: vector.payload
		});
		assert.strictEqual(payQrAdapters[target.country].scheme, target.scheme);
		const withoutAmount = { ...target, parameters: { ...target.parameters } };
		delete withoutAmount.parameters.amount;
		if (target.parameters['qr-type'] === 'dynamic')
			assert.throws(() => generateNationalQr(withoutAmount));
		for (const parameters of [
			{ ...target.parameters, amount: 'XXX:1' },
			{ ...target.parameters, 'unknown-field': 'ignored' },
			{ ...target.parameters, 'receiver-name': 'x'.repeat(26) }
		])
			assert.throws(() => generateNationalQr({ ...target, parameters }));
		if (['th', 'vn'].includes(target.country)) {
			assert.strictEqual(generateNationalQr(parseNationalQr(vector.payload)), vector.payload);
			assert.throws(() => parseNationalQr(finishEmv(vector.payload.slice(0, -8) + '8001X')));
			assert.throws(() =>
				parseNationalQr(finishEmv(vector.payload.slice(0, -8).replace('A000000', 'B000000')))
			);
		}
	});
test('independent CRC check value and malformed envelopes', () => {
	assert.strictEqual(calculateCRC16('123456789'), '29B1');
	for (const value of ['', '6304ABCD', finishEmv('000201000201'), finishEmv('0002010100')])
		assertFalse(validateCRC(value));
});
test('unsupported capability returns a typed result, not a QR', () => {
	for (const country of ['bn', 'id', 'ph'] as const) {
		const result = tryGenerateNationalQr(parsePayQr(`payto://qr/${country}/ID123`));
		assert.strictEqual(result.supported, false);
		assertFalse('payload' in result);
		assert.strictEqual(payQrAdapters[country].supportsStatic, false);
		assert.strictEqual(payQrAdapters[country].supportsDynamic, false);
	}
	assert.throws(() => payQrAdapters.vn.generatePayload(parsePayQr('payto://qr/bn/ID123')));
});
test('new fields reject malformed values and oversized nested templates', () => {
	for (const uri of [
		'payto://qr/sg/123?identifier-type=uen',
		'payto://qr/sg/123456789A?identifier-type=uen&expiry-date=20260230',
		'payto://qr/my/ID?postal-code=abcde',
		'payto://qr/kh/name%40bank?recipient-type=unknown',
		'payto://qr/kh/name%40bank?creation-timestamp=123'
	])
		assert.throws(() => parsePayQr(uri));
	const my = parsePayQr(vectors[0].uri);
	assert.throws(() =>
		generateNationalQr({
			...my,
			parameters: { ...my.parameters, reference: 'x'.repeat(26) }
		})
	);
	const sg = parsePayQr(vectors.find((v) => v.uri.includes('identifier-type=uen'))!.uri);
	assert.throws(() =>
		generateNationalQr({
			...sg,
			parameters: {
				...sg.parameters,
				reference: 'x'.repeat(36),
				'receiver-name': 'Test'
			}
		})
	);
	const kh = parsePayQr(vectors.find((v) => v.name.includes('individual dynamic'))!.uri);
	assert.throws(() =>
		generateNationalQr({
			...kh,
			parameters: {
				...kh.parameters,
				'expiration-timestamp': kh.parameters['creation-timestamp']
			}
		})
	);
	assert.throws(() =>
		generateNationalQr({
			...kh,
			parameters: {
				...kh.parameters,
				'bill-number': 'x'.repeat(25),
				'store-label': 'x'.repeat(25),
				'terminal-label': 'x'.repeat(25),
				'mobile-number': 'x'.repeat(25)
			}
		})
	);
	const fields = parseEmvStringTlv(
		generateNationalQr(parsePayQr(vectors.find((v) => v.uri.includes('/mm/'))!.uri))
	);
	assert.ok(fields['64'].includes('ဆိုင်'));
});
