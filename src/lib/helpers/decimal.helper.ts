/** Expand scientific notation without rounding or changing existing decimal strings. */
export function toDecimalString(value: string | number): string {
	const text = String(value);
	const match = /^([+-]?)(\d+)(?:\.(\d*))?e([+-]?\d+)$/i.exec(text);
	if (!match) return text;

	const [, sign, integer, fraction = '', exponent] = match;
	const digits = integer + fraction;
	const point = integer.length + Number(exponent);
	if (point <= 0) return sign + '0.' + '0'.repeat(-point) + digits;
	if (point >= digits.length) return sign + digits + '0'.repeat(point - digits.length);
	return sign + digits.slice(0, point) + '.' + digits.slice(point);
}
