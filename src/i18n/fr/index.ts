import type { Translation } from '../i18n-types'
import type { DeepPartial } from '$lib/helpers/i18n'
import { deepMergeDict } from '$lib/helpers/i18n'
import en from '../en/index'

const frPartial: DeepPartial<Translation> = {
	walletCard: {
		customAmount: 'Montant perso',
		day: 'jour',
		days: 'jours',
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
		purposeDonate: 'don'
	},
	paymentButton: {
		Recurring: 'Récurrent',
		via: 'via'
	}
}

const fr: Translation = deepMergeDict(en as any, frPartial as DeepPartial<Translation>)
export default fr
