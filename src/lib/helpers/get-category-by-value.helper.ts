import { TRANSPORT } from '#lib/data/transports.data.js';

export const getCategoryByValue = (value: string): string | null =>
	value === 'qr' ? 'qr' : Object.keys(TRANSPORT).find(key => TRANSPORT[key as keyof typeof TRANSPORT].some(item => item.value === value)) || null;
