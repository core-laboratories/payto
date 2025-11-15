const BITMASK_64 = (1n << 64n) - 1n;
const RATE_IN_BYTES = 136;
const HEX_CHARS = '0123456789abcdef';

const ROTATION_OFFSETS = [
	[0, 36, 3, 41, 18],
	[1, 44, 10, 45, 2],
	[62, 6, 43, 15, 61],
	[28, 55, 25, 21, 56],
	[27, 20, 39, 8, 14]
];

const ROTATION_SEQUENCE: [number, number][] = [
	[1, 0], [0, 2], [2, 1], [1, 2], [2, 3],
	[3, 3], [3, 0], [0, 1], [1, 3], [3, 1],
	[1, 4], [4, 4], [4, 0], [0, 3], [3, 4],
	[4, 3], [3, 2], [2, 2], [2, 0], [0, 4],
	[4, 2], [2, 4], [4, 1], [1, 1]
];

const ROUND_CONSTANTS = new Array<bigint>(24)
	.fill(0n)
	.map((_, i) => BigInt([
		'0x0000000000000001', '0x0000000000008082', '0x800000000000808a', '0x8000000080008000',
		'0x000000000000808b', '0x0000000080000001', '0x8000000080008081', '0x8000000000008009',
		'0x000000000000008a', '0x0000000000000088', '0x0000000080008009', '0x000000008000000a',
		'0x000000008000808b', '0x800000000000008b', '0x8000000000008089', '0x8000000000008003',
		'0x8000000000008002', '0x8000000000000080', '0x000000000000800a', '0x800000008000000a',
		'0x8000000080008081', '0x8000000000008080', '0x0000000080000001', '0x8000000080008008'
	][i]));

function rotateLeft64(value: bigint, shift: number): bigint {
	return ((value << BigInt(shift)) | (value >> BigInt(64 - shift))) & BITMASK_64;
}

function keccakF(state: bigint[]) {
	const c = new Array<bigint>(5);
	const d = new Array<bigint>(5);

	for (let round = 0; round < 24; round++) {
		for (let x = 0; x < 5; x++) {
			c[x] =
				state[x] ^
				state[x + 5] ^
				state[x + 10] ^
				state[x + 15] ^
				state[x + 20];
		}

		for (let x = 0; x < 5; x++) {
			d[x] = c[(x + 4) % 5] ^ rotateLeft64(c[(x + 1) % 5], 1);
		}

		for (let x = 0; x < 5; x++) {
			for (let y = 0; y < 5; y++) {
				state[x + 5 * y] = (state[x + 5 * y] ^ d[x]) & BITMASK_64;
			}
		}

		let current = state[1];
		let currentX = 0;
		let currentY = 0;

		for (let t = 0; t < 24; t++) {
			const [x, y] = ROTATION_SEQUENCE[t];
			const index = x + 5 * y;
			const tmp = state[index];
			state[index] = rotateLeft64(current, ROTATION_OFFSETS[y][x]);
			current = tmp;
			currentX = x;
			currentY = y;
		}

		for (let y = 0; y < 5; y++) {
			const rowStart = y * 5;
			const row = state.slice(rowStart, rowStart + 5);
			for (let x = 0; x < 5; x++) {
				state[rowStart + x] =
					(row[x] ^
						((~row[(x + 1) % 5]) & row[(x + 2) % 5])) &
					BITMASK_64;
			}
		}

		state[0] ^= ROUND_CONSTANTS[round];
	}
}

function load64LE(bytes: Uint8Array, offset: number): bigint {
	let value = 0n;
	for (let i = 0; i < 8; i++) {
		value |= BigInt(bytes[offset + i]) << (BigInt(i) * 8n);
	}
	return value;
}

function store64LE(value: bigint, output: Uint8Array, offset: number, length: number) {
	for (let i = 0; i < length; i++) {
		output[offset + i] = Number((value >> (BigInt(i) * 8n)) & 0xffn);
	}
}

function keccakAbsorb(state: bigint[], block: Uint8Array) {
	for (let i = 0; i < RATE_IN_BYTES / 8; i++) {
		state[i] = (state[i] ^ load64LE(block, i * 8)) & BITMASK_64;
	}
}

function keccakSqueeze(state: bigint[], outputLength: number): Uint8Array {
	const output = new Uint8Array(outputLength);
	let offset = 0;

	while (offset < outputLength) {
		for (let i = 0; i < RATE_IN_BYTES / 8 && offset < outputLength; i++) {
			const remaining = outputLength - offset;
			const toWrite = Math.min(8, remaining);
			store64LE(state[i], output, offset, toWrite);
			offset += toWrite;
		}

		if (offset < outputLength) {
			keccakF(state);
		}
	}

	return output;
}

function sha3_256_hex(message: string): string {
	const encoder = new TextEncoder();
	const data = encoder.encode(message);
	const state = new Array<bigint>(25).fill(0n);

	let offset = 0;
	while (offset + RATE_IN_BYTES <= data.length) {
		const block = data.slice(offset, offset + RATE_IN_BYTES);
		keccakAbsorb(state, block);
		keccakF(state);
		offset += RATE_IN_BYTES;
	}

	const block = new Uint8Array(RATE_IN_BYTES);
	block.set(data.slice(offset));
	block[data.length - offset] = 0x06;
	block[RATE_IN_BYTES - 1] |= 0x80;
	keccakAbsorb(state, block);
	keccakF(state);

	const hashBytes = keccakSqueeze(state, 32);
	return Array.from(hashBytes, (byte) => HEX_CHARS[(byte >> 4) & 0x0f] + HEX_CHARS[byte & 0x0f]).join('').slice(0, 64);
}

export function normalizeName(
	name: string,
	{ diacritics = 'preserve' }: { diacritics?: 'preserve' | 'strip' } = {}
): string {
	let normalized = (name ?? '').toString();

	if (diacritics === 'strip') {
		normalized = normalized.normalize('NFKD').replace(/\p{Diacritic}/gu, '');
	}

	normalized = normalized
		.toUpperCase()
		.replace(/[^A-Z ]/g, '')
		.replace(/\s+/g, ' ')
		.trim();

	return normalized;
}

function assertDigitsN(value: string, length: number, fieldName: string): string {
	if (typeof value !== 'string' || value.length !== length || !/^\d+$/.test(value)) {
		throw new Error(`${fieldName} must be exactly ${length} digits`);
	}
	return value;
}

export function buildIdMaterialWithSha3(
	bin6: string,
	last4: string,
	name: string,
	{
		version = 'v1',
		domain = 'core.creditcard',
		diacritics = 'strip'
	}: { version?: string; domain?: string; diacritics?: 'preserve' | 'strip' } = {}
) {
	const BIN6 = assertDigitsN(bin6, 6, 'BIN6');
	const LAST4 = assertDigitsN(last4, 4, 'LAST4');
	const NAME_NORM = normalizeName(name, { diacritics });
	const idMaterial = `${domain}:${version}|${BIN6}|${LAST4}|${NAME_NORM}`;
	return {
		idMaterial,
		sha3Hex: sha3_256_hex(idMaterial)
	};
}

export type PrefixRule = string | [number, number];

export interface CardBrandDefinition {
	name: string;
	prefixes: PrefixRule[];
	lengths: number[];
	publicDigits: number;
}

export const CARD_BRANDS: CardBrandDefinition[] = [
	{ name: 'Visa', prefixes: ['4'], lengths: [13, 16, 19], publicDigits: 6 },
	{ name: 'Mastercard', prefixes: [[51, 55], [2221, 2720]], lengths: [16], publicDigits: 6 },
	{ name: 'American Express', prefixes: ['34', '37'], lengths: [15], publicDigits: 6 },
	{ name: 'Discover', prefixes: ['6011', [622126, 622925], [644, 649], '65'], lengths: [16, 19], publicDigits: 6 },
	{ name: 'Diners Club International', prefixes: ['36', [38, 39], [300, 305]], lengths: [14, 16], publicDigits: 6 },
	{ name: 'JCB', prefixes: [[3528, 3589]], lengths: [16, 17, 18, 19], publicDigits: 6 },
	{ name: 'UnionPay', prefixes: ['62'], lengths: [16, 17, 18, 19], publicDigits: 6 },
	{ name: 'Maestro', prefixes: ['50', [56, 69]], lengths: [12, 13, 14, 15, 16, 17, 18, 19], publicDigits: 6 },
	{ name: 'RuPay', prefixes: ['60', [6521, 6522], '81'], lengths: [16], publicDigits: 6 },
	{ name: 'Elo', prefixes: ['4011', '4312', '4389', '4514', '4576', '5041', [5067, 5090], '6277', '6363', [6504, 6509], '6516', [6550, 6551]], lengths: [16], publicDigits: 6 },
	{ name: 'Troy', prefixes: ['9792'], lengths: [16], publicDigits: 6 },
	{ name: 'Mir', prefixes: [[2200, 2204]], lengths: [16], publicDigits: 6 }
];

const defaultDigitsRegex = /\D/g;

function getPrefixMatchLength(rule: PrefixRule, digits: string): number {
	if (!digits.length) return 0;
	if (typeof rule === 'string') {
		if (digits.startsWith(rule)) return rule.length;
		if (rule.startsWith(digits)) return digits.length;
		return 0;
	}

	const [start, end] = rule;
	const startStr = String(start);
	const endStr = String(end);
	const prefixLength = startStr.length;
	const compareLength = Math.min(prefixLength, digits.length);
	const value = Number(digits.slice(0, compareLength));
	const rangeStart = Number(startStr.slice(0, compareLength));
	const rangeEnd = Number(endStr.slice(0, compareLength));

	return value >= rangeStart && value <= rangeEnd ? compareLength : 0;
}

export function detectCardBrand(digits: string, brands: CardBrandDefinition[] = CARD_BRANDS): CardBrandDefinition | null {
	let bestMatch: CardBrandDefinition | null = null;
	let bestLength = 0;

	for (const brand of brands) {
		for (const prefix of brand.prefixes) {
			const matchLength = getPrefixMatchLength(prefix, digits);
			if (matchLength > bestLength) {
				bestLength = matchLength;
				bestMatch = brand;
			}
		}
	}

	return bestMatch;
}

export function luhnCheck(cardNumber: string, digitsRegex: RegExp = defaultDigitsRegex): boolean {
	const digits = cardNumber.replace(digitsRegex, '');
	if (digits.length < 12 || digits.length > 19) return false;

	let sum = 0;
	let isEven = false;

	for (let i = digits.length - 1; i >= 0; i--) {
		let digit = parseInt(digits[i], 10);

		if (isEven) {
			digit *= 2;
			if (digit > 9) {
				digit -= 9;
			}
		}

		sum += digit;
		isEven = !isEven;
	}

	return sum % 10 === 0;
}

export function formatCardNumber(value: string, digitsRegex: RegExp = defaultDigitsRegex, brands: CardBrandDefinition[] = CARD_BRANDS): string {
	const digits = value.replace(digitsRegex, '');
	const brand = detectCardBrand(digits, brands);
	const maxLength = brand ? Math.max(...brand.lengths) : 19;
	const limited = digits.slice(0, maxLength);

	if (brand?.name === 'American Express') {
		if (limited.length <= 4) return limited;
		if (limited.length <= 10) return `${limited.slice(0, 4)} ${limited.slice(4)}`;
		return `${limited.slice(0, 4)} ${limited.slice(4, 10)} ${limited.slice(10)}`;
	}

	if (brand?.name === 'Diners Club International' && limited.length <= 14) {
		if (limited.length <= 4) return limited;
		if (limited.length <= 10) return `${limited.slice(0, 4)} ${limited.slice(4)}`;
		return `${limited.slice(0, 4)} ${limited.slice(4, 10)} ${limited.slice(10)}`;
	}

	return limited.replace(/(\d{4})(?=\d)/g, '$1 ');
}

export function maskFormattedNumber(formattedNumber: string, publicLength: number, totalDigits: number): string {
	if (!formattedNumber || publicLength <= 0) return formattedNumber;
	let digitIndex = 0;
	let masked = '';
	for (const char of formattedNumber) {
		if (/\d/.test(char)) {
			digitIndex += 1;
			const isPublic = digitIndex <= publicLength;
			const isLastFour = digitIndex > Math.max(totalDigits - 4, publicLength);
			masked += isPublic || isLastFour ? char : '*';
		} else {
			masked += char;
		}
	}
	return masked;
}
