import { parseNationalQr } from './parse.js';
import { payQrSchemes, serializePayQr, parsePayQr } from 'payto-rl';
import type { PayQrCountry, PayQrTarget } from 'payto-rl';
import { emvTlv as tlv, emvStringTlv, finishEmv } from './emv.js';

interface Encoder {
	supportsQrGeneration: boolean;
	generate(target: PayQrTarget): string;
}
const unsupported: Encoder = {
	supportsQrGeneration: false,
	generate(target) {
		throw new Error(
			`${payQrSchemes[target.country].name} needs an issuer/acquirer specification before a national QR can be generated.`
		);
	}
};
/** DuitNow MPM v1.5, domestic merchant profile (not JomPAY or P2P). */
const duitNowAdapter: Encoder = {
	supportsQrGeneration: true,
	generate(target) {
		serializePayQr(target);
		if (target.country !== 'my') throw new Error('DuitNow requires Malaysia');
		const p = target.parameters;
		const required = (key: string, pattern: RegExp): string => {
			const value = p[key] ?? '';
			if (!pattern.test(value)) throw new Error('Invalid or missing ' + key);
			return value;
		};
		// Acquirer-assigned ID; we cannot attest to registration or account ownership.
		const acquirer = required('acquirer-id', /^[0-9]{6}$/);
		const name = required('receiver-name', /^[\x20-\x7e]{1,25}$/);
		const city = required('merchant-city', /^[\x20-\x7e]{1,15}$/);
		const mcc = required('mcc', /^[0-9]{4}$/);
		if (mcc === '0000' || mcc === '6010')
			throw new Error('P2P and cash-out profiles are not supported');
		allowedParameters(target, [
			'acquirer-id',
			'receiver-name',
			'merchant-city',
			'mcc',
			'amount',
			'reference',
			'store-label',
			'terminal-label',
			'merchant-mobile',
			'postal-code'
		]);
		if (acquirer === '898989') throw new Error('JomPAY is a separate unsupported profile');
		return finishEmv(
			tlv('00', '02') +
				tlv('01', p['qr-type'] === 'dynamic' ? '12' : '11') +
				tlv(
					'26',
					tlv('00', 'A0000006150001') +
						tlv('01', acquirer) +
						tlv('02', target.identifier) +
						optional(p, 'merchant-mobile', '04', 15)
				) +
				tlv('52', mcc) +
				tlv('53', '458') +
				amountField(p) +
				tlv('58', 'MY') +
				tlv('59', name) +
				tlv('60', city) +
				optional(p, 'postal-code', '61', 5) +
				additional(p, {
					reference: '05',
					'store-label': '03',
					'terminal-label': '07'
				})
		);
	}
};
/** PromptPay domestic credit transfer, tag 29; no bill-payment or cross-border profile. */
const promptPayAdapter: Encoder = {
	supportsQrGeneration: true,
	generate(target) {
		serializePayQr(target);
		if (target.country !== 'th') throw new Error('PromptPay requires Thailand');
		const p = target.parameters;
		const name = p['receiver-name'] ?? '';
		if (!/^[\x20-\x7e]{1,25}$/.test(name))
			throw new Error('National QR requires a receiver name of 1–25 printable ASCII characters');
		const supported = [
			'identifier-type',
			'receiver-name',
			'merchant-city',
			'mcc',
			'qr-type',
			'amount'
		];
		if (Object.keys(p).some((key) => !supported.includes(key)))
			throw new Error('This PromptPay profile cannot encode the supplied payment parameters');
		const tags: Record<string, string> = {
			mobile: '01',
			'national-id': '02',
			ewallet: '03'
		};
		const tag = tags[target.identifierType];
		if (!tag) throw new Error('Unsupported PromptPay identifier type');
		const dynamic = p['qr-type'] === 'dynamic';
		const amount = p.amount?.split(':')[1];
		return finishEmv(
			tlv('00', '01') +
				tlv('01', dynamic ? '12' : '11') +
				tlv('29', tlv('00', 'A000000677010111') + tlv(tag, target.identifier)) +
				(p.mcc ? tlv('52', p.mcc) : '') +
				tlv('53', '764') +
				(amount ? tlv('54', amount) : '') +
				tlv('58', 'TH') +
				tlv('59', name) +
				(p['merchant-city'] ? tlv('60', p['merchant-city']) : '')
		);
	}
};

function required(p: Record<string, string>, key: string, pattern: RegExp): string {
	const value = p[key] ?? '';
	if (!pattern.test(value)) throw new Error('Invalid or missing ' + key);
	return value;
}
/** NBC KHQR SDK 1.0.20: individual and merchant; explicit timestamps keep generation deterministic. */
const khqrAdapter: Encoder = {
	supportsQrGeneration: true,
	generate(target) {
		const p = allowedParameters(target, [
			'receiver-name',
			'merchant-city',
			'qr-currency',
			'amount',
			'recipient-type',
			'merchant-id',
			'acquiring-bank',
			'account-information',
			'mcc',
			'bill-number',
			'store-label',
			'terminal-label',
			'mobile-number',
			'message',
			'creation-timestamp',
			'expiration-timestamp'
		]);
		const name = required(p, 'receiver-name', /^[\x20-\x7e]{1,25}$/);
		const city =
			p['merchant-city'] === undefined
				? 'Phnom Penh'
				: required(p, 'merchant-city', /^[\x20-\x7e]{1,15}$/);
		const merchant = p['recipient-type'] === 'merchant';
		const account =
			tlv('00', target.identifier) +
			(merchant
				? tlv('01', required(p, 'merchant-id', /^[\x20-\x7e]{1,32}$/))
				: optional(p, 'account-information', '01', 32)) +
			(merchant
				? tlv('02', required(p, 'acquiring-bank', /^[\x20-\x7e]{1,32}$/))
				: optional(p, 'acquiring-bank', '02', 32));
		const dynamic = !!p.amount;
		if (p['qr-type'] && p['qr-type'] !== (dynamic ? 'dynamic' : 'static'))
			throw new Error('KHQR type must agree with amount presence');
		if ((!merchant && p['merchant-id']) || (merchant && p['account-information']))
			throw new Error('Invalid KHQR recipient fields');
		let timestamps = '';
		if (dynamic) {
			const created = required(p, 'creation-timestamp', /^[0-9]{13}$/);
			const expires = required(p, 'expiration-timestamp', /^[0-9]{13}$/);
			if (expires <= created) throw new Error('KHQR expiration must follow creation');
			timestamps = tlv('99', tlv('00', created) + tlv('01', expires));
		} else if (p['creation-timestamp'] || p['expiration-timestamp'])
			throw new Error('Static KHQR cannot encode timestamps');
		const currency = p.amount?.split(':')[0] ?? p['qr-currency'] ?? 'KHR';
		let amount = p.amount?.split(':')[1];
		if (amount && currency === 'USD' && amount.includes('.'))
			amount = amount.split('.')[0] + '.' + amount.split('.')[1].padEnd(2, '0');
		return finishEmv(
			tlv('00', '01') +
				tlv('01', dynamic ? '12' : '11') +
				tlv(merchant ? '30' : '29', account) +
				tlv('52', p.mcc ?? '5999') +
				tlv('53', currency === 'USD' ? '840' : '116') +
				(amount ? tlv('54', amount) : '') +
				tlv('58', 'KH') +
				tlv('59', name) +
				tlv('60', city) +
				additional(p, {
					'bill-number': '01',
					'mobile-number': '02',
					'store-label': '03',
					'terminal-label': '07',
					message: '08'
				}) +
				timestamps
		);
	}
};
/** PayNow mobile proxy. Standalone PayNow, not a repository-issued multi-scheme SGQR. */
const payNowAdapter: Encoder = {
	supportsQrGeneration: true,
	generate(target) {
		const p = allowedParameters(target, [
			'receiver-name',
			'amount',
			'reference',
			'amount-editable',
			'expiry-date'
		]);
		const name = required(p, 'receiver-name', /^[\x20-\x7e]{1,25}$/);
		if (p['amount-editable'] === '0' && !p.amount)
			throw new Error('A fixed PayNow amount is required');
		return finishEmv(
			tlv('00', '01') +
				tlv('01', p['qr-type'] === 'dynamic' ? '12' : '11') +
				tlv(
					'26',
					tlv('00', 'SG.PAYNOW') +
						tlv('01', target.identifierType === 'uen' ? '2' : '0') +
						tlv('02', target.identifier) +
						tlv('03', p['amount-editable'] ?? '1') +
						optional(p, 'reference', '04', 35) +
						optional(p, 'expiry-date', '05', 8)
				) +
				tlv('52', '0000') +
				tlv('53', '702') +
				amountField(p) +
				tlv('58', 'SG') +
				tlv('59', name) +
				tlv('60', 'Singapore')
		);
	}
};
/** MyanmarPay specification May 2023. Scheme reverse domain must come from the acquirer. */
const mmqrAdapter: Encoder = {
	supportsQrGeneration: true,
	generate(target) {
		const p = allowedParameters(target, [
			'receiver-name',
			'merchant-city',
			'mcc',
			'scheme-id',
			'local-name',
			'amount',
			'reference',
			'bill-number',
			'store-label',
			'terminal-label',
			'message'
		]);
		const name = required(p, 'receiver-name', /^[\x20-\x7e]{1,25}$/);
		const city = required(p, 'merchant-city', /^[\x20-\x7e]{1,15}$/);
		const mcc = required(p, 'mcc', /^[0-9]{4}$/);
		const gui = required(p, 'scheme-id', /^[A-Za-z0-9]+(?:\.[A-Za-z0-9-]+)+$/);
		const localName = required(
			p,
			'local-name',
			/^[\u1000-\u109f\uAA60-\uAA7F\uA9E0-\uA9FF 0-9]{1,25}$/u
		);
		const payload = finishEmv(
			tlv('00', '01') +
				tlv('01', p['qr-type'] === 'dynamic' ? '12' : '11') +
				tlv('26', tlv('00', gui) + tlv('01', target.identifier) + tlv('02', '000000')) +
				tlv('52', mcc) +
				tlv('53', '104') +
				amountField(p) +
				tlv('58', 'MM') +
				tlv('59', name) +
				tlv('60', city) +
				additional(p, {
					'bill-number': '01',
					'store-label': '03',
					reference: '05',
					'terminal-label': '07',
					message: '08'
				}) +
				emvStringTlv('64', tlv('00', 'my') + emvStringTlv('01', localName))
		);
		if (new TextEncoder().encode(payload).length > 512)
			throw new Error('MMQR payload exceeds 512 bytes');
		return payload;
	}
};
/** NAPAS VietQR IBFT to account, static/dynamic profile. BIN is assigned by the receiving bank. */
const vietQrAdapter: Encoder = {
	supportsQrGeneration: true,
	generate(target) {
		const p = allowedParameters(target, ['acquirer-id', 'amount', 'bill-number', 'message']);
		const bin = required(p, 'acquirer-id', /^[0-9]{6}$/);
		return finishEmv(
			tlv('00', '01') +
				tlv('01', p['qr-type'] === 'dynamic' ? '12' : '11') +
				tlv(
					'38',
					tlv('00', 'A000000727') +
						tlv('01', tlv('00', bin) + tlv('01', target.identifier)) +
						tlv('02', 'QRIBFTTA')
				) +
				tlv('53', '704') +
				amountField(p) +
				tlv('58', 'VN') +
				additional(p, { 'bill-number': '01', message: '08' })
		);
	}
};
/** Bank of the Lao PDR Decision 96/BoL (2025), Annex 8: credit fund transfer.
 * The specification gives an example AID, not an assignment for every issuer.
 */
const laoQrAdapter: Encoder = {
	supportsQrGeneration: true,
	generate(target) {
		const p = allowedParameters(target, [
			'application-id',
			'acquirer-id',
			'receiver-name',
			'amount',
			'bill-number',
			'reference',
			'message'
		]);
		if (p.amount && p['qr-type'] !== 'dynamic')
			throw new Error('LaoQR amount requires the dynamic profile');
		const aid = required(p, 'application-id', /^[A-Za-z0-9]{16}$/);
		const iin = required(p, 'acquirer-id', /^[0-9]{6}$/);
		const name = required(p, 'receiver-name', /^[\x20-\x7e]{1,25}$/);
		if (!/^[\x21-\x7e]{1,25}$/.test(target.identifier))
			throw new Error('LaoQR receiver ID must be 1–25 printable ASCII characters');
		return finishEmv(
			tlv('00', '01') +
				tlv('01', p['qr-type'] === 'dynamic' ? '12' : '11') +
				tlv(
					'38',
					tlv('00', aid) + tlv('01', iin) + tlv('02', '001') + tlv('03', target.identifier)
				) +
				tlv('53', '418') +
				amountField(p) +
				tlv('58', 'LA') +
				tlv('59', name) +
				additional(p, { 'bill-number': '01', reference: '05', message: '08' })
		);
	}
};
const encoders: Readonly<Record<PayQrCountry, Encoder>> = {
	...(Object.fromEntries(
		Object.keys(payQrSchemes).map((country) => [country, unsupported])
	) as Record<PayQrCountry, Encoder>),
	kh: khqrAdapter,
	la: laoQrAdapter,
	sg: payNowAdapter,
	mm: mmqrAdapter,
	vn: vietQrAdapter,
	my: duitNowAdapter,
	th: promptPayAdapter
};
export function generateNationalQr(target: PayQrTarget): string {
	// Resolve metadata again: caller-supplied scheme/type must never override the URI.
	const validated = parsePayQr(serializePayQr(target));
	return encoders[validated.country].generate(validated);
}

function allowedParameters(target: PayQrTarget, keys: string[]): Record<string, string> {
	const p = target.parameters;
	if (Object.keys(p).some((key) => !['identifier-type', 'qr-type', ...keys].includes(key)))
		throw new Error('This QR profile cannot encode the supplied payment parameters');
	return p;
}
function optional(p: Record<string, string>, key: string, tag: string, max: number): string {
	if (p[key] === undefined) return '';
	const value = required(p, key, new RegExp('^[\\x20-\\x7e]{1,' + max + '}$'));
	return tlv(tag, value);
}
function amountField(p: Record<string, string>): string {
	return p.amount ? tlv('54', p.amount.split(':')[1]) : '';
}
function additional(p: Record<string, string>, tags: Record<string, string>): string {
	const value = Object.entries(tags)
		.sort((a, b) => a[1].localeCompare(b[1]))
		.map(([key, tag]) => optional(p, key, tag, 25))
		.join('');
	return value ? tlv('62', value) : '';
}
export type PayQrGenerationResult =
	| { supported: true; valid: true; payload: string }
	| { supported: true; valid: false; reason: string }
	| { supported: false; reason: string };
export interface PayQrAdapter {
	country: PayQrCountry;
	scheme: PayQrTarget['scheme'];
	supportsGeneration: boolean;
	supportsQrGeneration: boolean;
	supportsStatic: boolean;
	supportsDynamic: boolean;
	validate(target: PayQrTarget): PayQrGenerationResult;
	parsePayload?: (payload: string) => PayQrTarget;
	generatePayload(target: PayQrTarget): string;
	generate(target: PayQrTarget): string;
}
export const payQrAdapters = Object.fromEntries(
	Object.entries(encoders).map(([key, encoder]) => {
		const country = key as PayQrCountry;
		const generate = (target: PayQrTarget) => {
			if (target.country !== country) throw new Error('QR adapter country mismatch');
			return generateNationalQr(target);
		};
		const adapter: PayQrAdapter = {
			country,
			scheme: payQrSchemes[country].scheme,
			supportsGeneration: encoder.supportsQrGeneration,
			supportsQrGeneration: encoder.supportsQrGeneration,
			supportsStatic: encoder.supportsQrGeneration,
			supportsDynamic: encoder.supportsQrGeneration,
			generate,
			generatePayload: generate,
			...(['th', 'vn'].includes(country)
				? {
						parsePayload: (payload: string) => {
							const target = parseNationalQr(payload);
							if (target.country !== country) throw new Error('QR adapter country mismatch');
							return target;
						}
					}
				: {}),
			validate(target) {
				if (!encoder.supportsQrGeneration)
					return {
						supported: false,
						reason:
							'National QR generation is unavailable because the required technical specification could not be verified.'
					};
				try {
					return { supported: true, valid: true, payload: generate(target) };
				} catch (error) {
					return {
						supported: true,
						valid: false,
						reason: error instanceof Error ? error.message : 'Invalid payment details'
					};
				}
			}
		};
		return [country, adapter];
	})
) as Readonly<Record<PayQrCountry, PayQrAdapter>>;
export function tryGenerateNationalQr(target: PayQrTarget): PayQrGenerationResult {
	return payQrAdapters[target.country].validate(target);
}
export const generateTarusQr = payQrAdapters.bn.generatePayload;
export const generateKhQr = payQrAdapters.kh.generatePayload;
export const generateQris = payQrAdapters.id.generatePayload;
export const generateLaoQr = payQrAdapters.la.generatePayload;
export const generateDuitNowQr = payQrAdapters.my.generatePayload;
export const generateMmQr = payQrAdapters.mm.generatePayload;
export const generateQrPh = payQrAdapters.ph.generatePayload;
export const generatePayNowQr = payQrAdapters.sg.generatePayload;
export const generatePromptPayQr = payQrAdapters.th.generatePayload;
export const generateVietQr = payQrAdapters.vn.generatePayload;
