import type { Translation } from '../i18n-types'
import type { DeepPartial } from '$lib/helpers/i18n'
import { deepMergeDict } from '$lib/helpers/i18n'
import en from '../en/index'

const dePartial: DeepPartial<Translation> = {
	walletCard: {
		customAmount: 'Eigener Betrag',
		tap: 'Antippen',
		scan: 'Scannen',
		hereTo: 'hier zu',
		withCash: 'mit Bargeld',
		via: 'über',
		expiresIn: 'Läuft ab in',
		for: 'für',
		noPayment: 'Keine Zahlung',
		expired: 'Abgelaufen',
		amount: 'Betrag',
		close: 'Schließen',
		switchMode: 'Modus wechseln',
		navigate: 'Navigieren',
		donate: 'Spenden',
		pay: 'Zahlen',
		payment: 'Zahlung',
		purposePay: 'Zahlen',
		purposeDonate: 'Spenden',
		verifiedBusiness: 'Verifiziertes Unternehmen',
		verifiedWebsite: 'Verifizierte Website'
	},
	paymentButton: {
		Recurring: 'Wiederkehrend',
		via: 'über'
	},
	common: {
		dates: {
			day: 'Tag',
			days: 'Tage'
		},
		recurring: {
			day: 'T',
			week: 'W',
			month: 'M',
			year: 'J'
		}
	}
}

const de: Translation = deepMergeDict(en as any, dePartial as DeepPartial<Translation>)
export default de
