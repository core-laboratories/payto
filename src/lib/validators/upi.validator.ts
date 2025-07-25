import { z } from 'zod';

export const upiSchema = z.object({
	accountAlias: z.email({ message: 'Invalid email format' })
});
