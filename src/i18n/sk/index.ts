import type { Translation } from '../i18n-types'
import type { DeepPartial } from '$lib/helpers/i18n'
import { deepMergeDict } from '$lib/helpers/i18n'
import en from '../en/index'

const skPartial: DeepPartial<Translation> = {
	walletCard: {
		customAmount: 'Vlastná suma',
		day: 'deň',
		days: 'dni',
		tap: 'Dotknite sa',
		scan: 'Skenovať',
		hereTo: 'tu pre',
		withCash: 'v hotovosti',
		via: 'cez',
		expiresIn: 'Vyprší za',
		for: 'pre',
		noPayment: 'Žiadna platba',
		expired: 'Vypršalo',
		amount: 'Suma',
		close: 'Zavrieť',
		switchMode: 'Prepnúť režim',
		navigate: 'Navigovať',
		donate: 'Darovať',
		pay: 'Zaplatiť',
		purposePay: 'platbu',
		purposeDonate: 'dar'
	},
	paymentButton: {
		Recurring: 'Pravidelné',
		via: 'cez'
	}
}

const sk: Translation = deepMergeDict(en as any, skPartial as DeepPartial<Translation>)
export default sk
