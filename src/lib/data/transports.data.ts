export const TRANSPORT: ITransportTypes = {
	ican: [
		{
			value: 'xcb',
			label: 'Core',
			ticker: 'XCB',
			symbol: '₡',
			tokens: true
		},
		{
			value: 'btc',
			label: 'Bitcoin',
			ticker: 'BTC',
			symbol: '₿'
		},
		{
			value: 'eth',
			label: 'Ethereum',
			ticker: 'ETH',
			symbol: 'Ξ',
			tokens: true
		},
		{
			value: 'ltc',
			label: 'Litecoin',
			ticker: 'LTC',
			symbol: 'Ł'
		},
		{
			value: 'xmr',
			label: 'Monero',
			ticker: 'XMR',
			symbol: 'ɱ'
		},
		{
			value: 'other',
			label: 'Other',
			ticker: '',
			tokens: true
		}
	],
	iban: [
		{
			value: 'iban',
			label: 'IBAN',
			ticker: ''
		}
	],
	upi: [
		{
			value: 'upi',
			label: 'UPI',
			ticker: ''
		}
	],
	pix: [
		{
			value: 'pix',
			label: 'PIX',
			ticker: ''
		}
	],
	ach: [
		{
			value: 'ach',
			label: 'ACH',
			ticker: ''
		}
	],
	bic: [
		{
			value: 'bic',
			label: 'BIC',
			ticker: ''
		}
	],
	void: [
		{
			value: 'geo',
			label: 'Geolocation (Decimal Degrees)',
			ticker: ''
		},
		{
			value: 'plus',
			label: 'Plus Code',
			ticker: ''
		},
		{
			value: 'intra',
			label: 'Intra-bank transfer',
			ticker: ''
		},
		{
			value: 'other',
			label: 'Other',
			ticker: ''
		}
	]
};
