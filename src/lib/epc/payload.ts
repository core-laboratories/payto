import { ibanSchema } from '#lib/validators/iban.validator.js';
import { bicSchema } from '#lib/validators/bic.validator.js';

// EPC069-12 v3.1 §2.1–2.2; EPC409-09 v8.0 geographical scope (2025-12).
const eea = new Set(
	'AT BE BG HR CY CZ DK EE FI FR DE GR HU IS IE IT LV LI LT LU MT NL NO PL PT RO SK SI ES SE'.split(
		' '
	)
);
const sepa = new Set([...eea, ...'AD AL CH GB GI MC MD ME MK RS SM VA'.split(' ')]);
const presentation = new Set([
	'format',
	'barcode',
	'org',
	'item',
	'color-f',
	'color-b',
	'rtl',
	'lang',
	'mode',
	'donate'
]);
const paymentFields = new Set([
	'receiver-name',
	'amount',
	'message',
	'reference',
	'purpose',
	'information'
]);
function field(value: string, name: string, max: number, required = false): string {
	if (
		(required && !value.trim()) ||
		[...value].length > max ||
		/[\u0000-\u001f\u007f\p{Cs}]/u.test(value)
	)
		throw new Error(
			`Invalid ${name}: ${required ? 'required, ' : ''}maximum ${max} characters, no controls`
		);
	return value;
}
export function epcBeneficiaryNameError(value: string): string {
	if (!value.trim()) return 'Beneficiary full name is required for EPC SEPA.';
	try {
		field(value, 'beneficiary name', 70, true);
		return '';
	} catch {
		return 'Use at most 70 characters without control characters.';
	}
}

function mod97(value: string): number {
	let result = 0;
	for (const char of value) {
		const digits = /[A-Z]/.test(char) ? String(char.charCodeAt(0) - 55) : char;
		for (const digit of digits) result = (result * 10 + Number(digit)) % 97;
	}
	return result;
}
export function epcRequiresBic(iban: string): boolean {
	const country = iban.slice(0, 2).toUpperCase();
	return sepa.has(country) && !eea.has(country);
}

export function validEpcReference(reference: string): boolean {
	return (
		!reference ||
		(/^RF[0-9]{2}[A-Z0-9]{1,21}$/.test(reference) &&
			mod97(reference.slice(4) + reference.slice(0, 4)) === 1)
	);
}

/** EPC SCT data only. QR rendering and wallet signing belong to their existing layers. */
export function ibanPassPayload(
	uri: string,
	format?: string,
	barcode = 'qr'
): { value: string; label: string } {
	if (uri.length > 8192 || /[\u0000-\u0020\u007f]/.test(uri) || /%(?![a-f0-9]{2})/i.test(uri))
		throw new Error('Malformed IBAN PayTo URI');
	decodeURIComponent(uri); // Reject malformed UTF-8 before URLSearchParams can replace it.
	const url = new URL(uri);
	if (
		url.protocol !== 'payto:' ||
		url.hostname !== 'iban' ||
		url.username ||
		url.password ||
		url.port ||
		url.hash
	)
		throw new Error('Expected payto://iban/[BIC/]IBAN');
	const parts = url.pathname.slice(1).split('/').map(decodeURIComponent);
	if (parts.length < 1 || parts.length > 2) throw new Error('Invalid IBAN destination');
	const iban = parts.at(-1)!;
	const bic = parts.length === 2 ? parts[0] : '';
	if (!ibanSchema.safeParse({ iban }).success) throw new Error('Enter a valid IBAN');
	if (bic && !bicSchema.safeParse({ bic }).success) throw new Error('Enter a valid BIC');
	const seen = new Set<string>();
	for (const [key, value] of url.searchParams) {
		if (seen.has(key)) throw new Error('Duplicate IBAN parameter');
		seen.add(key);
		field(value, key, 512);
	}
	const selected = format ?? url.searchParams.get('format') ?? 'payto';
	if (!['native', 'payto', 'epc'].includes(selected)) throw new Error('Invalid payment QR format');
	if (selected === 'payto') {
		for (const key of presentation) url.searchParams.delete(key);
		return { value: url.toString(), label: 'PayTo' };
	}
	if (!['qr', 'pdf417', 'aztec', 'code128'].includes(barcode))
		throw new Error('Invalid barcode type');
	const country = iban.slice(0, 2).toUpperCase();
	if (!sepa.has(country)) throw new Error('EPC requires an IBAN in the SEPA geographical scope');
	if (epcRequiresBic(iban) && !bic) throw new Error('BIC is required for a non-EEA beneficiary');
	for (const [key, value] of url.searchParams)
		if (value && !presentation.has(key) && !paymentFields.has(key))
			throw new Error(`EPC cannot represent ${key}`);
	const name = field(url.searchParams.get('receiver-name') ?? '', 'beneficiary name', 70, true);
	const rawAmount = (url.searchParams.get('amount') ?? '').replace(/^eur:/i, 'EUR:');
	let amount = '';
	if (rawAmount) {
		const match = /^(?:EUR:)?((?:0|[1-9][0-9]{0,8})(?:\.[0-9]{1,2})?)?$/.exec(rawAmount);
		if (!match || (!match[1] && rawAmount !== 'EUR:') || (match[1] && !/[1-9]/.test(match[1])))
			throw new Error('EPC amount must be EUR 0.01–999999999.99');
		if (match[1]) amount = 'EUR' + match[1];
	}
	const purpose = field(url.searchParams.get('purpose') ?? '', 'purpose', 4);
	if (purpose && !/^[A-Z]{4}$/.test(purpose)) throw new Error('Use a four-letter ISO purpose code');
	const reference = field(url.searchParams.get('reference') ?? '', 'reference', 35);
	// This profile accepts ISO 11649 creditor references, not arbitrary structured text.
	if (!validEpcReference(reference)) throw new Error('Invalid ISO 11649 RF creditor reference');
	const message = field(url.searchParams.get('message') ?? '', 'remittance message', 140);
	if (reference && message)
		throw new Error('Use a creditor reference or a remittance message, not both');
	const information = field(
		url.searchParams.get('information') ?? '',
		'beneficiary information',
		70
	);
	const lines = [
		'BCD',
		'002',
		'1',
		'SCT',
		bic.toUpperCase(),
		name,
		iban.toUpperCase(),
		amount,
		purpose,
		reference,
		message,
		information
	];
	while (lines.at(-1) === '') lines.pop();
	const value = lines.join('\n');
	if (new TextEncoder().encode(value).length > 331)
		throw new Error('EPC payload exceeds 331 UTF-8 bytes');
	return { value, label: 'SEPA Credit Transfer' };
}
