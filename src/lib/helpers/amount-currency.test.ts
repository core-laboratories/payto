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
