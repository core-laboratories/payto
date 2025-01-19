import { z } from 'zod';

const BIC_REGEX = /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/i;

export const bicSchema = z.object({
    bic: z.string()
}).superRefine((data, ctx) => {
    if (!data.bic) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'BIC is required',
            path: ['bic'],
            fatal: true
        });
        return;
    }

    if (!BIC_REGEX.test(data.bic)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Invalid BIC format',
            path: ['bic'],
            fatal: true
        });
        return;
    }
});
