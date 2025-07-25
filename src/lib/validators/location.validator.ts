import { z } from 'zod';

const LATITUDE_REGEX = /^(\+|-)?(?:90(?:(?:\.0{1,6})?)|(?:[0-9]|[1-8][0-9])(?:(?:\.[0-9]{1,6})?))$/;
const LONGITUDE_REGEX = /^(\+|-)?(?:180(?:(?:\.0{1,6})?)|(?:[0-9]|[1-9][0-9]|1[0-7][0-9])(?:(?:\.[0-9]{1,6})?))$/;
const PLUS_CODE_REGEX = /^[23456789CFGHJMPQRVWX]{8}\+[23456789CFGHJMPQRVWX]{2,7}$/;

export const coordinatesSchema = z.object({
	latitude: z.string().regex(LATITUDE_REGEX, 'Invalid latitude format'),
	longitude: z.string().regex(LONGITUDE_REGEX, 'Invalid longitude format')
});

export const plusCodeSchema = z.object({
	code: z.string().regex(PLUS_CODE_REGEX, 'Invalid Plus Code format')
});
