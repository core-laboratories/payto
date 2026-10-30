import { describe, it, expect } from 'vitest';
import { generateLink } from './generate.helper';
import { getCurrency } from './get-currency.helper';
import { getLink } from './get-link.helper';

describe('ICAN amount currency', () => {
	it.each(['usd', 'eur', 'ctn'])('uses %s for preview and downloaded passes', (currency) => {
		const props = {
			network: 'xcb',
			address: 'cb7147879011ea207df5b35a24ca6f0859dcfb145999',
			params: {
				currency: { value: currency },
				amount: { value: '100' },
				swap: { value: 'xau' },
				fiat: { value: 'czk' }
			}
		};
		expect(getCurrency(props, 'ican')).toBe(currency);
		expect(getCurrency(props, 'ican', true)).toBe(currency);
		expect(getCurrency(props, 'xcb' as ITransitionType, true)).toBe(currency);
		const uri = new URL(generateLink([], props));
		expect(uri.searchParams.get('amount')).toBe(`${currency}:100`);
		expect(uri.searchParams.get('swap')).toBe('xau');
		expect(uri.searchParams.has('fiat')).toBe(false);
		const passLink = new URL(getLink('ican', props));
		expect(passLink.searchParams.get('amount')).toBe(`${currency}:100`);
		expect(passLink.searchParams.get('swap')).toBe('xau');
		expect(passLink.searchParams.has('fiat')).toBe(false);
	});
});

describe('decimal payment amounts', () => {
	it.each([
		[0.00000001, '0.00000001'],
		['1e-8', '0.00000001'],
		[1.234e-7, '0.0000001234'],
		[1e21, '1000000000000000000000'],
		['0.0000000100', '0.0000000100']
	])('serializes %s without scientific notation', (value, expected) => {
		const props = {
			network: 'btc',
			destination: 'bc1uv0kxu0nmh0j45ckg0r3zhh0yra4wy6yw2pqvvj',
			params: { amount: { value } }
		};
		expect(new URL(getLink('ican', props)).searchParams.get('amount')).toBe(expected);
		props.params.amount = { value, mandatory: true } as typeof props.params.amount;
		expect(new URL(getLink('ican', props)).searchParams.get('amount')).toBe(expected);
		expect(new URL(getLink('ican', {
			...props,
			params: { ...props.params, currency: { value: 'BTC' } }
		})).searchParams.get('amount')).toBe(`btc:${expected}`);
	});

	it.each([false, true])('serializes decimal split values (percent: %s)', (isPercent) => {
		const uri = generateLink([], {
			params: {
				amount: { value: 1 },
				split: { value: 1e-8, address: 'recipient', isPercent }
			}
		});
		expect(new URL(uri).searchParams.get('split')).toBe(`${isPercent ? 'p:' : ''}0.00000001@recipient`);
	});
});
