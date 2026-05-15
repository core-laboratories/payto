const WHITESPACE_REGEX = /\s+/g;

export function stripWhitespace(value: string): string {
	return value.replace(WHITESPACE_REGEX, '');
}
