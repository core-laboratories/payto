import { z } from 'zod';

const BIC_REGEX = /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/i;

export const bicSchema = z.object({
	bic: z.string()
}).check((ctx) => {
	if (!ctx.value.bic) {
		ctx.issues.push({
			code: 'custom',
			message: 'BIC is required',
			path: ['bic'],
			input: ctx.value
		});
		return;
	}

	if (!BIC_REGEX.test(ctx.value.bic)) {
		ctx.issues.push({
			code: 'custom',
			message: 'Invalid BIC format',
			path: ['bic'],
			input: ctx.value
		});
		return;
	}
});
