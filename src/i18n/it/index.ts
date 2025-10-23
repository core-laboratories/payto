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
		purposeDonate: 'donazione'
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
	}
}

const it_IT: Translation = deepMergeDict(en as any, it_ITPartial as DeepPartial<Translation>)
export default it_IT
