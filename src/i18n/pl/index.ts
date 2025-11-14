import type { Translation } from '../i18n-types'
import type { DeepPartial } from '$lib/helpers/i18n'
import { deepMergeDict } from '$lib/helpers/i18n'
import en from '../en/index'

const pl_PLPartial: DeepPartial<Translation> = {
	walletCard: {
		customAmount: 'Własna kwota',
		tap: 'Stuknij',
		scan: 'Skanuj',
		hereTo: 'tutaj, aby',
		withCash: 'gotówką',
		via: 'przez',
		expiresIn: 'Wygasa za',
		for: 'na',
		noPayment: 'Brak płatności',
		expired: 'Wygasło',
		amount: 'Kwota',
		close: 'Zamknij',
		switchMode: 'Zmień tryb',
		navigate: 'Nawiguj',
		donate: 'Wesprzyj',
		pay: 'Zapłać',
		payment: 'płatność',
		purposePay: 'płatność',
		purposeDonate: 'darowiznę',
		verifiedBusiness: 'Zweryfikowana firma',
		verifiedWebsite: 'Zweryfikowana strona internetowa'
	},
	paymentButton: {
		Recurring: 'Cykliczne',
		via: 'przez'
	},
	common: {
		dates: {
			day: 'Dzień',
			days: 'Dni'
		},
		recurring: {
			day: 'd',
			week: 't',
			month: 'm',
			year: 'r'
		}
	},
	paypass: {
		address: 'Adres konta',
		network: 'Sieć',
		cash: 'Gotówka',
		chain: 'Typ sieci',
		amount: 'Kwota',
		purpose: 'Pozycja',
		recurringDonation: 'Cykliczna darowizna',
		recurringPayment: 'Cykliczna płatność',
		donation: 'Darowizna',
		payment: 'Płatność',
		swapFor: 'Wymień na',
		split: 'Podziel',
		iban: 'IBAN',
		bic: 'BIC',
		beneficiary: 'Beneficjent',
		bicOroric: 'BIC / ORIC',
		accountNumber: 'Numer konta',
		routingNumber: 'Numer rozliczeniowy',
		accountAlias: 'Alias konta',
		message: 'Wiadomość',
		id: 'ID',
		accountId: 'ID konta',
		pay: 'Zapłać',
		paypass: 'PayPass',
		scanToDonate: 'Skanuj, by dać',
		scanToPay: 'Skanuj, by zapłacić',
		paymentLocation: 'Miejsce płatności',
		navigateToLocation: 'Nawiguj do miejsca',
		viewTransactions: 'Zobacz transakcje',
		onlinePaypass: 'PayPass online',
		topUpCryptoCard: 'Doładuj kartę krypto',
		swapCurrency: 'Wymień walutę',
		activatePro: 'Aktywuj Pro',
		sendOfflineTransaction: 'Wyślij transakcję offline'
	}
}

const pl_PL: Translation = deepMergeDict(en as any, pl_PLPartial as DeepPartial<Translation>)
export default pl_PL
