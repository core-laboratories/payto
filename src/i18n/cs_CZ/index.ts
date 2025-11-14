import type { Translation } from '../i18n-types'
import type { DeepPartial } from '$lib/helpers/i18n'
import { deepMergeDict } from '$lib/helpers/i18n'
import en from '../en/index'

const cs_CZPartial: DeepPartial<Translation> = {
	walletCard: {
		customAmount: 'Vlastní částka',
		tap: 'Klepněte',
		scan: 'Skenovat',
		hereTo: 'zde pro',
		withCash: 'v hotovosti',
		via: 'přes',
		expiresIn: 'Vyprší za',
		for: 'na',
		noPayment: 'Žádná platba',
		expired: 'Vypršelo',
		amount: 'Částka',
		close: 'Zavřít',
		switchMode: 'Přepnout režim',
		navigate: 'Navigovat',
		donate: 'Darovat',
		pay: 'Zaplatit',
		payment: 'platba',
		purposePay: 'platbu',
		purposeDonate: 'dar',
		verifiedBusiness: 'Ověřená firma',
		verifiedWebsite: 'Ověřená webstránka'
	},
	paymentButton: {
		Recurring: 'Pravidelné',
		via: 'přes'
	},
	common: {
		dates: {
			day: 'Den',
			days: 'Dny'
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
		network: 'Síť',
		cash: 'Hotovost',
		chain: 'Typ sítě',
		amount: 'Suma',
		purpose: 'Položka',
		recurringDonation: 'Pravidelný dar',
		recurringPayment: 'Pravidelná platba',
		donation: 'Dar',
		payment: 'Platba',
		swapFor: 'Zaměnit za',
		split: 'Rozdělit',
		iban: 'IBAN',
		bic: 'BIC',
		beneficiary: 'Příjemce',
		bicOroric: 'BIC / ORIC',
		accountNumber: 'Číslo účtu',
		routingNumber: 'Směrovací číslo',
		accountAlias: 'Alias účtu',
		message: 'Zpráva',
		id: 'ID',
		accountId: 'ID účtu',
		pay: 'Zaplatit',
		paypass: 'PayPass',
		scanToDonate: 'Skenovat pro dar',
		scanToPay: 'Skenovat pro platbu',
		paymentLocation: 'Místo platby',
		navigateToLocation: 'Navigovat na místo',
		viewTransactions: 'Zobrazit transakce',
		onlinePaypass: 'Online PayPass',
		topUpCryptoCard: 'Dobít krypto kartu',
		swapCurrency: 'Zaměnit měnu',
		activatePro: 'Aktivovat Pro',
		sendOfflineTransaction: 'Odeslat offline transakci'
	}
}

const cs_CZ: Translation = deepMergeDict(en as any, cs_CZPartial as DeepPartial<Translation>)
export default cs_CZ
