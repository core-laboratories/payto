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
		address: 'Adresse de compte',
		network: 'Réseau',
		cash: 'Espèces',
		chain: 'Chaîne',
		amount: 'Montant'
	}
}

const fr: Translation = deepMergeDict(en as any, frPartial as DeepPartial<Translation>)
export default fr
