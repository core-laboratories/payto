import type { Translation } from '../i18n-types'
import type { DeepPartial } from '$lib/helpers/i18n'
import { deepMergeDict } from '$lib/helpers/i18n'
import en from '../en/index'

const esPartial: DeepPartial<Translation> = {
	walletCard: {
		customAmount: 'Monto propio',
		tap: 'Tocar',
		scan: 'Escanear',
		hereTo: 'aquí para',
		withCash: 'en efectivo',
		via: 'a través de',
		expiresIn: 'Expira en',
		for: 'por',
		noPayment: 'Sin pago',
		expired: 'Expirado',
		amount: 'Monto',
		close: 'Cerrar',
		switchMode: 'Cambiar modo',
		navigate: 'Navegar',
		donate: 'Donar',
		pay: 'Pagar',
		payment: 'pago',
		purposePay: 'pago',
		purposeDonate: 'donación'
	},
	paymentButton: {
		Recurring: 'Recurrente',
		via: 'a través de'
	},
	common: {
		dates: {
			day: 'día',
			days: 'días'
		},
		recurring: {
			day: 'd',
			month: 'm',
			year: 'y'
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

const es: Translation = deepMergeDict(en as any, esPartial as DeepPartial<Translation>)
export default es
