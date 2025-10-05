export const TYPES: ITypesObject = {
	ican: {
		value: 'ican',
		label: 'ICAN',
		description: 'International Crypto Account Number',
		link: 'https://cip.coreblockchain.net/cip/cbc/cip-100/'
	},
	iban: {
		value: 'iban',
		label: 'IBAN',
		description: 'International Bank Account Number',
		link: 'https://en.wikipedia.org/wiki/International_Bank_Account_Number'
	},
	ach: {
		value: 'ach',
		label: 'ACH',
		description: 'Automated Clearing House',
		link: 'https://en.wikipedia.org/wiki/ACH_Network'
	},
	upi: {
		value: 'upi',
		label: 'UPI',
		description: 'Unified Payments Interface',
		link: 'https://en.wikipedia.org/wiki/Unified_Payments_Interface'
	},
	pix: {
		value: 'pix',
		label: 'PIX',
		description: 'Brazilian instant payments',
		link: 'https://www.bcb.gov.br/en/financialstability/pix_en'
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
		link: 'https://en.wikipedia.org/wiki/Money'
	}
};
