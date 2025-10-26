import type { Translation } from '../i18n-types'
import type { DeepPartial } from '$lib/helpers/i18n'
import { deepMergeDict } from '$lib/helpers/i18n'
import en from '../en/index'

const tl_PHPartial: DeepPartial<Translation> = {
	walletCard: {
		customAmount: 'Pasadyang halaga',
		tap: 'Tapikin',
		scan: 'I-scan',
		hereTo: 'dito upang',
		withCash: 'gamit ang salapi',
		via: 'sa pamamagitan ng',
		expiresIn: 'Mawawalan ng bisa sa loob ng',
		for: 'para sa',
		noPayment: 'Walang bayad',
		expired: 'Nag-expire',
		amount: 'Halaga',
		close: 'Isara',
		switchMode: 'Lumipat ng mode',
		navigate: 'Mag-navigate',
		donate: 'Mag-donate',
		pay: 'Magbayad',
		payment: 'pagbabayad',
		purposePay: 'pagbabayad',
		purposeDonate: 'donasyon',
		verifiedBusiness: 'Napatunayang Negosyo'
	},
	paymentButton: {
		Recurring: 'Paulit-ulit',
		via: 'sa pamamagitan ng'
	},
	common: {
		dates: {
			day: 'Araw',
			days: 'Mga araw'
		},
		recurring: {
			day: 'a',
			week: 'l',
			month: 'b',
			year: 't'
		}
	}
}

const tl_PH: Translation = deepMergeDict(en as any, tl_PHPartial as DeepPartial<Translation>)
export default tl_PH
