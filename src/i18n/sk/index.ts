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
		verifiedBusiness: 'Overená firma',
		verifiedWebsite: 'Overená webstránka'
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
	},
	paypass: {
		address: 'Adresa účtu',
		network: 'Sieť',
		cash: 'Hotovosť',
		chain: 'Typ siete',
		amount: 'Suma',
		purpose: 'Položka',
		recurringDonation: 'Pravidelný dar',
		recurringPayment: 'Pravidelná platba',
		donation: 'Dar',
		payment: 'Platba',
		swapFor: 'Zameniť za',
		split: 'Rozdeliť',
		iban: 'IBAN',
		bic: 'BIC',
		beneficiary: 'Príjemca',
		bicOroric: 'BIC / ORIC',
		accountNumber: 'Číslo účtu',
		routingNumber: 'Smerovacie číslo',
		accountAlias: 'Alias účtu',
		message: 'Správa',
		id: 'ID',
		accountId: 'ID účtu',
		pay: 'Zaplatiť',
		paypass: 'PayPass',
		scanToDonate: 'Skenovať na darovanie',
		scanToPay: 'Skenovať na zaplatenie',
		paymentLocation: 'Miesto platby',
		navigateToLocation: 'Navigovať na miesto',
		viewTransactions: 'Zobraziť transakcie',
		onlinePaypass: 'Online PayPass',
		topUpCryptoCard: 'Dobiť krypto kartu',
		swapCurrency: 'Zameniť menu',
		activatePro: 'Aktivovať Pro',
		sendOfflineTransaction: 'Odoslať offline transakciu'
	}
}

const sk: Translation = deepMergeDict(en as any, skPartial as DeepPartial<Translation>)
export default sk
