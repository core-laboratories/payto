import { parseEmvTlv, validateCRC } from './emv.js';
import { parsePayQr, serializePayQr } from 'payto-rl';
import type { PayQrCountry, PayQrTarget } from 'payto-rl';
import { generateNationalQr } from './adapters.js';

/** Strict inverse of our PromptPay and VietQR profiles. Unknown fields are never discarded. */
export function parseNationalQr(payload: string): PayQrTarget {
	if (!validateCRC(payload)) throw new Error('Invalid national QR CRC or TLV');
	const fields = parseEmvTlv(payload);
	const p: Record<string, string> = {};
	let country: PayQrCountry;
	let identifier: string;
	if (fields['58'] === 'TH' && fields['29']) {
		const account = parseEmvTlv(fields['29']);
		if (account['00'] !== 'A000000677010111') throw new Error('Unknown PromptPay AID');
		const tags = { '01': 'mobile', '02': 'national-id', '03': 'ewallet' };
		const selected = Object.entries(tags).filter(([tag]) => account[tag] !== undefined);
		if (selected.length !== 1) throw new Error('Ambiguous PromptPay proxy');
		country = 'th';
		identifier = account[selected[0][0]];
		p['identifier-type'] = selected[0][1];
		p['receiver-name'] = fields['59'];
		if (fields['52']) p.mcc = fields['52'];
		if (fields['60']) p['merchant-city'] = fields['60'];
		if (fields['54']) p.amount = 'THB:' + fields['54'];
	} else if (fields['58'] === 'VN' && fields['38']) {
		const account = parseEmvTlv(fields['38']);
		if (account['00'] !== 'A000000727' || account['02'] !== 'QRIBFTTA')
			throw new Error('Unknown VietQR service');
		const bank = parseEmvTlv(account['01']);
		country = 'vn';
		identifier = bank['01'];
		p['acquirer-id'] = bank['00'];
		if (fields['54']) p.amount = 'VND:' + fields['54'];
		if (fields['62']) {
			const additional = parseEmvTlv(fields['62']);
			if (additional['01']) p['bill-number'] = additional['01'];
			if (additional['08']) p.message = additional['08'];
		}
	} else throw new Error('National QR parsing is unavailable for this profile');
	if (!['11', '12'].includes(fields['01'])) throw new Error('Invalid initiation method');
	p['qr-type'] = fields['01'] === '12' ? 'dynamic' : 'static';
	const target = parsePayQr(serializePayQr({ country, identifier, parameters: p }));
	if (generateNationalQr(target) !== payload)
		throw new Error('Unsupported fields or noncanonical national QR');
	return target;
}
export function parsePromptPayQr(payload: string): PayQrTarget {
	const target = parseNationalQr(payload);
	if (target.country !== 'th') throw new Error('Expected PromptPay');
	return target;
}
export function parseVietQr(payload: string): PayQrTarget {
	const target = parseNationalQr(payload);
	if (target.country !== 'vn') throw new Error('Expected VietQR');
	return target;
}
