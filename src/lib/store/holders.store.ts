import { writable } from 'svelte/store';

export const addressValue = writable<string>('');
export const splitAddressValue = writable<string>('');
