import { z } from 'zod';

const ACCOUNT_NUMBER_REGEX = /^(\d{7,14})$/;
const ROUTING_NUMBER_REGEX = /^(\d{9})$/;

export const achAccountSchema = z.object({
	accountNumber: z.string().regex(ACCOUNT_NUMBER_REGEX, 'Invalid account number format (7-14 digits)')
});

export const achRoutingSchema = z.object({
	routingNumber: z.string().regex(ROUTING_NUMBER_REGEX, 'Invalid routing number format (9 digits)')
});
