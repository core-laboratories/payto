import type { Translation } from '../i18n-types'
import type { DeepPartial } from '$lib/helpers/i18n'
import { deepMergeDict } from '$lib/helpers/i18n'
import en from '../en/index'

const it_ITPartial: DeepPartial<Translation> = {
	walletCard: {
		customAmount: 'Importo personalizzato',
		tap: 'Tocca',
		scan: 'Scansiona',
		hereTo: 'qui per',
		withCash: 'in contanti',
		via: 'tramite',
		expiresIn: 'Scade tra',
		for: 'per',
		noPayment: 'Nessun pagamento',
		expired: 'Scaduto',
		amount: 'Importo',
		close: 'Chiudi',
		switchMode: 'Cambia modalità',
		navigate: 'Naviga',
		donate: 'Dona',
		pay: 'Paga',
		payment: 'pagamento',
		purposePay: 'pagamento',
		purposeDonate: 'donazione',
		verifiedBusiness: 'Attività Verificata',
		verifiedWebsite: 'Sito Web Verificato'
	},
	paymentButton: {
		Recurring: 'Ricorrente',
		via: 'tramite'
	},
	common: {
		dates: {
			day: 'Giorno',
			days: 'Giorni'
		},
		recurring: {
			day: 'g',
			week: 's',
			month: 'm',
			year: 'a'
		}
	},
	paypass: {
		address: 'Indirizzo del conto',
		network: 'Rete',
		cash: 'Contanti',
		chain: 'Tipo di rete',
		amount: 'Importo',
		purpose: 'Articolo',
		recurringDonation: 'Donazione ricorrente',
		recurringPayment: 'Pagamento ricorrente',
		donation: 'Donazione',
		payment: 'Pagamento',
		swapFor: 'Scambia con',
		split: 'Dividi',
		iban: 'IBAN',
		bic: 'BIC',
		beneficiary: 'Beneficiario',
		bicOroric: 'BIC / ORIC',
		accountNumber: 'Numero di conto',
		routingNumber: 'Numero di instradamento',
		accountAlias: 'Alias del conto',
		message: 'Messaggio',
		id: 'ID',
		accountId: 'ID conto',
		pay: 'Paga',
		paypass: 'PayPass',
		scanToDonate: 'Scansiona per donare',
		scanToPay: 'Scansiona per pagare',
		paymentLocation: 'Luogo di pagamento',
		navigateToLocation: 'Naviga al luogo',
		viewTransactions: 'Visualizza transazioni',
		onlinePaypass: 'PayPass online',
		topUpCryptoCard: 'Ricarica carta crypto',
		swapCurrency: 'Cambia valuta',
		activatePro: 'Attiva Pro',
		sendOfflineTransaction: 'Invia transazione offline'
	}
}

const it_IT: Translation = deepMergeDict(en as any, it_ITPartial as DeepPartial<Translation>)
export default it_IT
