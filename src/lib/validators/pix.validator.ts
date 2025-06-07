import { z } from 'zod';

export const pixSchema = z.object({
    accountAlias: z.string().email('Invalid email format')
});
