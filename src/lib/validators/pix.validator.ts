import { z } from 'zod';

export const pixSchema = z.object({
	accountAlias: z.email({ message: 'Invalid email format' })
});
