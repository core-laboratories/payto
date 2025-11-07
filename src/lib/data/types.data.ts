export const TYPES: ITypesObject = {
	ican: {
		value: 'ican',
		label: 'ICAN',
		description: 'International Crypto Account Number',
		link: 'https://payto.onl/solutions/ican'
	},
	iban: {
		value: 'iban',
		label: 'IBAN',
		description: 'International Bank Account Number',
		link: 'https://grokipedia.com/page/International_Bank_Account_Number'
	},
	ach: {
		value: 'ach',
		label: 'ACH',
		description: 'Automated Clearing House',
		link: 'https://grokipedia.com/page/Automated_clearing_house'
	},
	upi: {
		value: 'upi',
		label: 'UPI',
		description: 'Unified Payments Interface',
		link: 'https://grokipedia.com/page/Unified_Payments_Interface'
	},
	pix: {
		value: 'pix',
		label: 'PIX',
		description: 'Brazilian instant payments',
		link: 'https://grokipedia.com/page/Pix_(payment_system)'
	},
	bic: {
		value: 'bic',
		label: 'BIC',
		description: 'Bank/Organization Identifier Code',
		link: [{
			label: 'BIC',
			href: 'https://en.wikipedia.org/wiki/ISO_9362'
		}, {
			label: 'ORIC',
			href: 'https://payto.onl/solutions/oric'
		}]
	},
	intra: {
		value: 'intra',
		label: 'Intra-bank transfer',
		description: 'Intra-bank transfer',
		link: 'https://www.lawinsider.com/dictionary/intrabank-transfer'
	},
	void: {
		value: 'void',
		label: 'Cash',
		description: 'Cash-based transactions',
		link: 'https://grokipedia.com/page/Cash'
	}
};
