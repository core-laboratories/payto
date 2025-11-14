import type { Translation } from '../i18n-types'
import type { DeepPartial } from '$lib/helpers/i18n'
import { deepMergeDict } from '$lib/helpers/i18n'
import en from '../en/index'

const frPartial: DeepPartial<Translation> = {
	walletCard: {
		customAmount: 'Montant perso',
		tap: 'Appuyer',
		scan: 'Scanner',
		hereTo: 'ici pour',
		withCash: 'en espèces',
		via: 'via',
		expiresIn: 'Expire dans',
		for: 'pour',
		noPayment: 'Aucun paiement',
		expired: 'Expiré',
		amount: 'Montant',
		close: 'Fermer',
		switchMode: 'Changer de mode',
		navigate: 'Naviguer',
		donate: 'Faire un don',
		pay: 'Payer',
		payment: 'paiement',
		purposePay: 'paiement',
		purposeDonate: 'don',
		verifiedBusiness: 'Entreprise Vérifiée',
		verifiedWebsite: 'Site Web Vérifié'
	},
	paymentButton: {
		Recurring: 'Récurrent',
		via: 'via'
	},
	common: {
		dates: {
			day: 'jour',
			days: 'jours'
		},
		recurring: {
			day: 'j',
			week: 's',
			month: 'm',
			year: 'a'
		}
	},
	paypass: {
		address: 'Adresse du compte',
		network: 'Réseau',
		cash: 'Espèces',
		chain: 'Type de réseau',
		amount: 'Montant',
		purpose: 'Article',
		recurringDonation: 'Don récurrent',
		recurringPayment: 'Paiement récurrent',
		donation: 'Don',
		payment: 'Paiement',
		swapFor: 'Échanger contre',
		split: 'Diviser',
		iban: 'IBAN',
		bic: 'BIC',
		beneficiary: 'Bénéficiaire',
		bicOroric: 'BIC / ORIC',
		accountNumber: 'Numéro de compte',
		routingNumber: 'Numéro de routage',
		accountAlias: 'Alias du compte',
		message: 'Message',
		id: 'ID',
		accountId: 'ID du compte',
		pay: 'Payer',
		paypass: 'PayPass',
		scanToDonate: 'Scanner pour donner',
		scanToPay: 'Scanner pour payer',
		paymentLocation: 'Lieu de paiement',
		navigateToLocation: 'Naviguer vers le lieu',
		viewTransactions: 'Voir les transactions',
		onlinePaypass: 'PayPass en ligne',
		topUpCryptoCard: 'Recharger la carte crypto',
		swapCurrency: 'Échanger la monnaie',
		activatePro: 'Activer Pro',
		sendOfflineTransaction: 'Envoyer une transaction hors ligne'
	}
}

const fr: Translation = deepMergeDict(en as any, frPartial as DeepPartial<Translation>)
export default fr
