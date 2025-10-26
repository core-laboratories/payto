import { z } from 'zod';
import ICAN from '@blockchainhub/ican';

export const ibanSchema = z.object({
	iban: z.string()
}).check((ctx) => {
	if (!ctx.value.iban) {
		ctx.issues.push({
			code: 'custom',
			message: 'IBAN is required',
			path: ['iban'],
			input: ctx.value
		});
		return;
	}

	const isValid = ICAN.isValid(ctx.value.iban, false);
	if (!isValid) {
		ctx.issues.push({
			code: 'custom',
			message: 'Invalid IBAN format',
			path: ['iban'],
			input: ctx.value
		});
	}
});
