import type { Translation } from '../i18n-types'
import type { DeepPartial } from '$lib/helpers/i18n'
import { deepMergeDict } from '$lib/helpers/i18n'
import en from '../en/index'

const hu_HUPartial: DeepPartial<Translation> = {
	walletCard: {
		customAmount: 'Egyéni összeg',
		tap: 'Érintsd meg',
		scan: 'Szkenneld be',
		hereTo: 'itt a',
		withCash: 'készpénzzel',
		via: 'keresztül',
		expiresIn: 'Lejár',
		for: 'részére',
		noPayment: 'Nincs fizetés',
		expired: 'Lejárt',
		amount: 'Összeg',
		close: 'Bezárás',
		switchMode: 'Mód váltása',
		navigate: 'Navigálás',
		donate: 'Adományozás',
		pay: 'Fizetés',
		payment: 'fizetés',
		purposePay: 'fizetés',
		purposeDonate: 'adomány',
		verifiedBusiness: 'Ellenőrzött vállalat'
	},
	paymentButton: {
		Recurring: 'Ismétlődő',
		via: 'keresztül'
	},
	common: {
		dates: {
			day: 'Nap',
			days: 'Napok'
		},
		recurring: {
			day: 'n',   // nap
			week: 'h',  // hét
			month: 'hó', // hónap
			year: 'év'  // év
		}
	}
}

const hu_HU: Translation = deepMergeDict(en as any, hu_HUPartial as DeepPartial<Translation>)
export default hu_HU
