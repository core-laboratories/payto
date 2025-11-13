import type { BaseTranslation } from '../i18n-types'

const en = {
	walletCard: {
		customAmount: 'Custom amount',
		tap: 'Tap',
		scan: 'Scan',
		hereTo: 'here to',
		withCash: 'with Cash',
		via: 'via',
		expiresIn: 'Expires in',
		for: 'for',
		noPayment: 'No payment',
		expired: 'Expired',
		amount: 'Amount',
		close: 'Close',
		switchMode: 'Switch mode',
		navigate: 'Navigate',
		donate: 'Donate',
		pay: 'Pay',
		payment: 'payment',
		purposePay: 'Pay',
		purposeDonate: 'Donate',
		verifiedBusiness: 'Verified Business',
		verifiedWebsite: 'Verified Website'
	},
	paymentButton: {
		Recurring: 'Recurring',
		via: 'via'
	},
	common: {
		dates: {
			day: 'Day',
			days: 'Days'
		},
		recurring: {
			day: 'd',
			week: 'w',
			month: 'm',
			year: 'y'
		}
	},
	paypass: {
		address: 'Account Address',
		network: 'Network',
		cash: 'Cash',
		chain: 'Chain',
		amount: 'Amount'
	}
} satisfies BaseTranslation

export default en
