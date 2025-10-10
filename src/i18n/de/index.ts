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
		purposeDonate: 'Spenden'
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
			month: 'M',
			year: 'J'
		},
		numbers: {
			0: '0',
			1: '1',
			2: '2',
			3: '3',
			4: '4',
			5: '5',
			6: '6',
			7: '7',
			8: '8',
			9: '9'
		}
	}
}

const de: Translation = deepMergeDict(en as any, dePartial as DeepPartial<Translation>)
export default de
