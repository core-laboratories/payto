import type { Translation } from '../i18n-types'
import type { DeepPartial } from '$lib/helpers/i18n'
import { deepMergeDict } from '$lib/helpers/i18n'
import en from '../en/index'

const ptBRPartial: DeepPartial<Translation> = {
	walletCard: {
		customAmount: 'Valor próprio',
		day: 'dia',
		days: 'dias',
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
	}
}

const ptBR: Translation = deepMergeDict(en as any, ptBRPartial as DeepPartial<Translation>)
export default ptBR
