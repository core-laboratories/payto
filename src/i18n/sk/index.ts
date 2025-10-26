import type { Translation } from '../i18n-types'
import type { DeepPartial } from '$lib/helpers/i18n'
import { deepMergeDict } from '$lib/helpers/i18n'
import en from '../en/index'

const skPartial: DeepPartial<Translation> = {
	walletCard: {
		customAmount: 'vlastná suma',
		tap: 'Dotknite sa',
		scan: 'Skenovať',
		hereTo: 'tu pre',
		withCash: 'v hotovosti',
		via: 'cez',
		expiresIn: 'Vyprší za',
		for: 'za',
		noPayment: 'Žiadna platba',
		expired: 'Vypršalo',
		amount: 'Suma',
		close: 'Zavrieť',
		switchMode: 'Prepnúť režim',
		navigate: 'Navigovať',
		donate: 'Darovať',
		pay: 'Zaplatiť',
		payment: 'platba',
		purposePay: 'platbu',
		purposeDonate: 'dar',
		verifiedBusiness: 'Overená firma'
	},
	paymentButton: {
		Recurring: 'Pravidelné',
		via: 'cez'
	},
	common: {
		dates: {
			day: 'deň',
			days: 'dni'
		},
		recurring: {
			day: 'd',
			week: 't',
			month: 'm',
			year: 'r'
		}
	}
}

const sk: Translation = deepMergeDict(en as any, skPartial as DeepPartial<Translation>)
export default sk
