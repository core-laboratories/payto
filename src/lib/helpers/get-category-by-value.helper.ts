import { TRANSPORT } from '$lib/data/transports.data';

export const getCategoryByValue = (value: string): string | null =>
	Object.keys(TRANSPORT).find(key => TRANSPORT[key as keyof typeof TRANSPORT].some(item => item.value === value)) || null;
