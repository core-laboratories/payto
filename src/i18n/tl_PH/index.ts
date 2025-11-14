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
		verifiedBusiness: 'Napatunayang Negosyo',
		verifiedWebsite: 'Napatunayang Website'
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
	},
	paypass: {
		address: 'Address ng account',
		network: 'Network',
		cash: 'Cash',
		chain: 'Uri ng network',
		amount: 'Halaga',
		purpose: 'Item',
		recurringDonation: 'Paulit-ulit na donasyon',
		recurringPayment: 'Paulit-ulit na bayad',
		donation: 'Donasyon',
		payment: 'Bayad',
		swapFor: 'Palitan para sa',
		split: 'Hatiin',
		iban: 'IBAN',
		bic: 'BIC',
		beneficiary: 'Benepisyaryo',
		bicOroric: 'BIC / ORIC',
		accountNumber: 'Numero ng account',
		routingNumber: 'Routing number',
		accountAlias: 'Alias ng account',
		message: 'Mensahe',
		id: 'ID',
		accountId: 'Account ID',
		pay: 'Magbayad',
		paypass: 'PayPass',
		scanToDonate: 'I-scan para magbigay',
		scanToPay: 'I-scan para magbayad',
		paymentLocation: 'Lokasyon ng bayaran',
		navigateToLocation: 'Mag-navigate sa lokasyon',
		viewTransactions: 'Tingnan ang mga transaksyon',
		onlinePaypass: 'Online PayPass',
		topUpCryptoCard: 'Mag-top up ng crypto card',
		swapCurrency: 'Palitan ang currency',
		activatePro: 'I-activate ang Pro',
		sendOfflineTransaction: 'Magpadala ng offline na transaksyon'
	}
}

const tl_PH: Translation = deepMergeDict(en as any, tl_PHPartial as DeepPartial<Translation>)
export default tl_PH
