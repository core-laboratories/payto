import type { Translation } from '../i18n-types'
import type { DeepPartial } from '$lib/helpers/i18n'
import { deepMergeDict } from '$lib/helpers/i18n'
import en from '../en/index'

const ptBRPartial: DeepPartial<Translation> = {
	walletCard: {
		customAmount: 'Valor próprio',
		tap: 'Toque',
		scan: 'Escanear',
		hereTo: 'aqui para',
		withCash: 'em dinheiro',
		via: 'via',
		expiresIn: 'Expira em',
		for: 'por',
		noPayment: 'Nenhum pagamento',
		expired: 'Expirado',
		amount: 'Valor',
		close: 'Fechar',
		switchMode: 'Mudar modo',
		navigate: 'Navegar',
		donate: 'Doar',
		pay: 'Pagar',
		payment: 'pagamento',
		purposePay: 'pagamento',
		purposeDonate: 'doação'
	},
	paymentButton: {
		Recurring: 'Recorrente',
		via: 'via'
	},
	common: {
		dates: {
			day: 'dia',
			days: 'dias'
		},
		recurring: {
			day: 'd',
			month: 'm',
			year: 'a'
		},
		numbers: {
			0: '0',
			1: '1',
			2: '2',
			3: '3',
			4: '4',
			5: '5',
			6: '6',
			7: '7',
			8: '8',
			9: '9'
		}
	}
}

const ptBR: Translation = deepMergeDict(en as any, ptBRPartial as DeepPartial<Translation>)
export default ptBR
