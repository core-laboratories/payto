/** Strict ASCII subset of EMV MPM TLV, used only by adapters that require it. */
export function emvTlv(tag: string, value: string): string {
	if (!/^[0-9]{2}$/.test(tag) || !/^[\x20-\x7e]{1,99}$/.test(value))
		throw new Error('Invalid EMV tag or ASCII value length');
	return tag + String(value.length).padStart(2, '0') + value;
}
/** EMV String fields count Unicode characters; CRC still operates on UTF-8 bytes. */
export function emvStringTlv(tag: string, value: string): string {
	const length = [...value].length;
	if (
		!/^[0-9]{2}$/.test(tag) ||
		length < 1 ||
		length > 99 ||
		/[\u0000-\u001f\u007f\p{Cs}]/u.test(value)
	)
		throw new Error('Invalid EMV String field');
	return tag + String(length).padStart(2, '0') + value;
}
export function parseEmvTlv(payload: string): Record<string, string> {
	const fields: Record<string, string> = Object.create(null);
	let offset = 0;
	while (offset < payload.length) {
		const header = payload.slice(offset, offset + 4);
		if (!/^[0-9]{4}$/.test(header)) throw new Error('Malformed EMV header');
		const tag = header.slice(0, 2);
		const length = Number(header.slice(2));
		const value = payload.slice(offset + 4, offset + 4 + length);
		if (
			!length ||
			value.length !== length ||
			Object.hasOwn(fields, tag) ||
			!/^[\x20-\x7e]+$/.test(value)
		)
			throw new Error('Malformed or duplicate EMV field');
		fields[tag] = value;
		offset += 4 + length;
	}
	return fields;
}
/** CRC-16/CCITT-FALSE: polynomial 1021, initial FFFF, no reflection or final XOR. */
export function crc16(value: string): string {
	let crc = 0xffff;
	for (const byte of new TextEncoder().encode(value)) {
		crc ^= byte << 8;
		for (let bit = 0; bit < 8; bit++)
			crc = (crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1) & 0xffff;
	}
	return crc.toString(16).toUpperCase().padStart(4, '0');
}
export function finishEmv(payload: string): string {
	const data = payload + '6304';
	return data + crc16(data);
}

/** Validate the entire envelope, not merely a matching four-character suffix. */
export function validateCRC(payload: string): boolean {
	try {
		const fields = parseEmvStringTlv(payload);
		return (
			/^00020[12]/.test(payload) &&
			/6304[0-9A-F]{4}$/.test(payload) &&
			fields['63'] === crc16(payload.slice(0, -4))
		);
	} catch {
		return false;
	}
}
export function encodeAmount(value: string): string {
	if (
		!/^(?:0|[1-9][0-9]*)(?:\.[0-9]{1,2})?$/.test(value) ||
		value.length > 13 ||
		!/[1-9]/.test(value)
	)
		throw new Error('Invalid amount');
	return value;
}
export const encodeTLV = emvTlv;
export const parseTLV = parseEmvTlv;
export const calculateCRC16 = crc16;

/** Character-counted EMV templates, including MMQR Unicode language information. */
export function parseEmvStringTlv(payload: string): Record<string, string> {
	const chars = [...payload];
	const fields: Record<string, string> = Object.create(null);
	let offset = 0;
	while (offset < chars.length) {
		const header = chars.slice(offset, offset + 4).join('');
		if (!/^[0-9]{4}$/.test(header)) throw new Error('Malformed EMV header');
		const tag = header.slice(0, 2),
			length = Number(header.slice(2));
		const value = chars.slice(offset + 4, offset + 4 + length).join('');
		if (
			!length ||
			[...value].length !== length ||
			Object.hasOwn(fields, tag) ||
			/[\u0000-\u001f\u007f\p{Cs}]/u.test(value)
		)
			throw new Error('Malformed or duplicate EMV field');
		fields[tag] = value;
		offset += 4 + length;
	}
	return fields;
}

/** Templates are assembled only from tags selected by the caller's scheme adapter. */
export function encodeMerchantInformation(fields: Record<string, string>): string {
	return Object.entries(fields)
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([tag, value]) => emvTlv(tag, value))
		.join('');
}
export function encodeAdditionalData(fields: Record<string, string>): string {
	return emvTlv('62', encodeMerchantInformation(fields));
}
