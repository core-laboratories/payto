import { z } from 'zod';

export const upiSchema = z.object({
    accountAlias: z.string().email('Invalid email format')
});
