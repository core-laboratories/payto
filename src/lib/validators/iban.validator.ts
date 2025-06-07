import { z } from 'zod';
import ICAN from '@blockchainhub/ican';

export const ibanSchema = z.object({
    iban: z.string()
}).superRefine((data, ctx) => {
    if (!data.iban) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'IBAN is required',
            path: ['iban'],
            fatal: true
        });
        return;
    }

    const isValid = ICAN.isValid(data.iban, false);
    if (!isValid) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Invalid IBAN format',
            path: ['iban'],
            fatal: true
        });
    }
});
