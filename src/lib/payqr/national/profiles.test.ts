import { test } from 'vitest';
import assert from 'node:assert/strict';
const assertFalse = (value: unknown) => assert.ok(!value);
import { parsePayQr, serializePayQr, payQrSchemes } from 'payto-rl';
import { generateNationalQr, payQrAdapters, crc16, emvTlv, parseEmvTlv } from './index';
test('CRC and strict TLV known vectors', () => {
	assert.strictEqual(crc16('123456789'), '29B1');
	assert.strictEqual(emvTlv('00', '01'), '000201');
	assert.deepStrictEqual({ ...parseEmvTlv('000201010211') }, { '00': '01', '01': '11' });
	for (const invalid of ['000301', '000201000201', 'XX0201', '0000', '000201x'])
		assert.throws(() => parseEmvTlv(invalid));
	assert.throws(() => emvTlv('00', 'a'.repeat(100)));
});
test('DuitNow static payload fields and checksum', () => {
	const target = parsePayQr(
		'payto://qr/my/MERCHANT01?acquirer-id=588734&receiver-name=Test%20Shop&merchant-city=KUALA%20LUMPUR&mcc=5411'
	);
	const payload = generateNationalQr(target);
	const fields = parseEmvTlv(payload);
	assert.strictEqual(fields['00'], '02');
	assert.strictEqual(fields['01'], '11');
	assert.strictEqual(fields['53'], '458');
	assert.strictEqual(fields['58'], 'MY');
	assert.strictEqual(fields['59'], 'Test Shop');
	assert.deepStrictEqual(
		{ ...parseEmvTlv(fields['26']) },
		{ '00': 'A0000006150001', '01': '588734', '02': 'MERCHANT01' }
	);
	assert.strictEqual(fields['63'], crc16(payload.slice(0, -4)));
	assertFalse(payload.startsWith('payto:'));
	for (const extra of [
		{ amount: 'MYR:0' },
		{ message: 'Do not drop me' },
		{ 'qr-type': 'dynamic' }
	] as Record<string, string>[])
		assert.throws(() =>
			generateNationalQr({
				...target,
				parameters: { ...target.parameters, ...extra }
			})
		);
});
test('PromptPay identifier subtags, static/dynamic amount and checksum', () => {
	for (const [id, type, tag] of [
		['0066812345678', 'mobile', '01'],
		['1234567890123', 'national-id', '02'],
		['123456789012345', 'ewallet', '03']
	]) {
		const target = parsePayQr(
			`payto://qr/th/${id}?identifier-type=${type}&receiver-name=Test&amount=THB:12.34&qr-type=dynamic`
		);
		const payload = generateNationalQr(target);
		const fields = parseEmvTlv(payload);
		assert.strictEqual(fields['01'], '12');
		assert.strictEqual(fields['53'], '764');
		assert.strictEqual(fields['54'], '12.34');
		assert.strictEqual(parseEmvTlv(fields['29'])[tag], id);
		assert.strictEqual(fields['63'], crc16(payload.slice(0, -4)));
	}
	assert.strictEqual(
		parseEmvTlv(
			generateNationalQr(parsePayQr('payto://qr/th/0066812345678?receiver-name=Test'))
		)['01'],
		'11'
	);
});
test('unimplemented national encoders fail closed', () => {
	for (const sample of ['bn', 'id', 'ph'].map((country) => ({
		uri: `payto://qr/${country}/ID123`
	})))
		assert.throws(
			() => generateNationalQr(parsePayQr(sample.uri)),
			/issuer\/acquirer specification/
		);
});
test('KHQR static individuals exactly match the official SDK in both currencies', () => {
	for (const [currency, numeric, crc] of [
		['KHR', '116', '56D9'],
		['USD', '840', '7AA0']
	]) {
		const uri = `payto://qr/kh/name%40bank?receiver-name=Test%20Shop&merchant-city=Phnom%20Penh&qr-currency=${currency}`;
		assert.strictEqual(
			generateNationalQr(parsePayQr(uri)),
			`00020101021129130009name@bank520459995303${numeric}5802KH5909Test Shop6010Phnom Penh6304${crc}`
		);
	}
});
test('PayNow encodes the registered mobile proxy without fabricating an SGQR ID', () => {
	const payload = generateNationalQr(
		parsePayQr('payto://qr/sg/%2B6581234567?receiver-name=Test')
	);
	const fields = parseEmvTlv(payload);
	assert.deepStrictEqual(
		{ ...parseEmvTlv(fields['26']) },
		{ '00': 'SG.PAYNOW', '01': '0', '02': '+6581234567', '03': '1' }
	);
	assert.strictEqual(fields['53'], '702');
	assert.strictEqual(fields['58'], 'SG');
	assert.strictEqual(fields['51'], undefined);
	assert.strictEqual(fields['63'], crc16(payload.slice(0, -4)));
});
test('VietQR follows the NAPAS account transfer template and preserves leading zeroes', () => {
	const payload = generateNationalQr(
		parsePayQr('payto://qr/vn/0011009950446?acquirer-id=970468')
	);
	const fields = parseEmvTlv(payload);
	// NAPAS v1.0 section 5.2.3 published account-information example.
	assert.strictEqual(fields['38'], '0010A00000072701270006970468011300110099504460208QRIBFTTA');
	assert.strictEqual(fields['53'], '704');
	assert.strictEqual(fields['58'], 'VN');
	assert.strictEqual(fields['63'], crc16(payload.slice(0, -4)));
});
test('MMQR includes issuer GUI, default terminal and mandatory Myanmar language template', () => {
	const uri = serializePayQr({
		country: 'mm',
		identifier: '123456789012345',
		parameters: {
			'receiver-name': 'Test Shop',
			'merchant-city': 'Yangon',
			mcc: '5411',
			'scheme-id': 'MM.COM.MMQR',
			'local-name': 'ဆိုင်'
		}
	});
	const payload = generateNationalQr(parsePayQr(uri));
	assert.ok(payload.includes('0011MM.COM.MMQR01151234567890123450206000000'));
	assert.ok(payload.includes('64150002my0105ဆိုင်'));
	assert.strictEqual(payload.slice(-4), crc16(payload.slice(0, -4)));
	assert.ok(new TextEncoder().encode(payload).length <= 512);
});
test('new static adapters reject missing required data, amounts and unsupported instructions', () => {
	const complete = [
		'payto://qr/kh/name%40bank?receiver-name=Test&merchant-city=Phnom%20Penh',
		'payto://qr/sg/%2B6581234567?receiver-name=Test',
		'payto://qr/vn/0011009950446?acquirer-id=970468',
		serializePayQr({
			country: 'mm',
			identifier: '123456789012345',
			parameters: {
				'receiver-name': 'Test',
				'merchant-city': 'Yangon',
				mcc: '5411',
				'scheme-id': 'MM.COM.MMQR',
				'local-name': 'ဆိုင်'
			}
		})
	];
	for (const uri of complete) {
		const target = parsePayQr(uri);
		assert.strictEqual(payQrAdapters[target.country].supportsQrGeneration, true);
		assert.throws(() => generateNationalQr(parsePayQr(uri.split('?')[0])));
		assert.throws(() =>
			generateNationalQr(parsePayQr(uri + '&unsupported-instruction=Do%20not%20discard'))
		);
		const withAmount = parsePayQr(
			uri + '&amount=' + payQrSchemes[target.country].currencies[0] + ':1'
		);
		if (target.country === 'kh') assert.throws(() => generateNationalQr(withAmount));
		else assert.ok(generateNationalQr(withAmount).includes('54011'));
	}
	for (const uri of [
		'payto://qr/vn/123?acquirer-id=12',
		'payto://qr/vn/123?amount=VND:1.50',
		'payto://qr/kh/name%40bank?qr-currency=MYR',
		'payto://qr/kh/name%40bank?qr-currency=USD&amount=KHR:1',
		'payto://qr/mm/123456789012345?scheme-id=https%3A%2F%2Fexample.com',
		'payto://qr/mm/123456789012345?local-name=English'
	])
		assert.throws(() => parsePayQr(uri));
});
test('LaoQR Annex 8 static credit transfer encodes routing, receiver, currency and CRC', () => {
	const uri =
		'payto://qr/la/0005555555?application-id=A000000677012111&acquirer-id=621354&receiver-name=Test';
	const payload = generateNationalQr(parsePayQr(uri));
	const fields = parseEmvTlv(payload);
	assert.deepStrictEqual(
		{ ...parseEmvTlv(fields['38']) },
		{
			'00': 'A000000677012111',
			'01': '621354',
			'02': '001',
			'03': '0005555555'
		}
	);
	assert.strictEqual(fields['01'], '11');
	assert.strictEqual(fields['53'], '418');
	assert.strictEqual(fields['58'], 'LA');
	assert.strictEqual(fields['59'], 'Test');
	assert.strictEqual(fields['52'], undefined);
	assert.strictEqual(fields['63'], crc16(payload.slice(0, -4)));
	for (const key of ['application-id', 'acquirer-id', 'receiver-name']) {
		const target = parsePayQr(uri);
		delete target.parameters[key];
		assert.throws(() => generateNationalQr(target));
	}
	for (const extra of [
		'&amount=USD:1',
		'&amount=LAK:1',
		'&unsupported-instruction=ignored',
		'&qr-type=dynamic'
	])
		assert.throws(() => generateNationalQr(parsePayQr(uri + extra)));
	assert.throws(() => generateNationalQr(parsePayQr(uri.replace('0005555555', 'X'.repeat(26)))));
	assert.throws(() => parsePayQr(uri.replace('621354', '123')));
	assert.throws(() => parsePayQr(uri.replace('A000000677012111', 'invalid')));
});
