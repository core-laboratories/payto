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
	},
	paypass: {
		address: 'Kontoadresse',
		network: 'Netzwerk',
		cash: 'Bargeld',
		chain: 'Kettentyp',
		amount: 'Betrag',
		purpose: 'Artikel',
		recurringDonation: 'Wiederkehrende Spende',
		recurringPayment: 'Wiederkehrende Zahlung',
		donation: 'Spende',
		payment: 'Zahlung',
		swapFor: 'Tauschen gegen',
		split: 'Aufteilen',
		iban: 'IBAN',
		bic: 'BIC',
		beneficiary: 'Empfänger',
		bicOroric: 'BIC / ORIC',
		accountNumber: 'Kontonummer',
		routingNumber: 'Routing-Nummer',
		accountAlias: 'Kontoalias',
		message: 'Nachricht',
		id: 'ID',
		accountId: 'Konto-ID',
		pay: 'Bezahlen',
		paypass: 'PayPass',
		scanToDonate: 'Zum Spenden scannen',
		scanToPay: 'Zum Bezahlen scannen',
		paymentLocation: 'Zahlungsort',
		navigateToLocation: 'Zum Ort navigieren',
		viewTransactions: 'Transaktionen anzeigen',
		onlinePaypass: 'Online PayPass',
		topUpCryptoCard: 'Krypto-Karte aufladen',
		swapCurrency: 'Währung tauschen',
		activatePro: 'Pro aktivieren',
		sendOfflineTransaction: 'Offline-Transaktion senden'
	}
}

const de: Translation = deepMergeDict(en as any, dePartial as DeepPartial<Translation>)
export default de
