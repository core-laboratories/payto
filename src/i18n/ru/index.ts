import type { Translation } from '../i18n-types'
import type { DeepPartial } from '$lib/helpers/i18n'
import { deepMergeDict } from '$lib/helpers/i18n'
import en from '../en/index'

const ruPartial: DeepPartial<Translation> = {
	walletCard: {
		customAmount: 'Своя сумма',
		tap: 'Нажмите',
		scan: 'Сканировать',
		hereTo: 'чтобы',
		withCash: 'наличными',
		via: 'через',
		expiresIn: 'Истекает через',
		for: 'за',
		noPayment: 'Нет платежа',
		expired: 'Истекло',
		amount: 'Сумма',
		close: 'Закрыть',
		switchMode: 'Сменить режим',
		navigate: 'Перейти',
		donate: 'Пожертвовать',
		pay: 'Оплатить',
		payment: 'платёж',
		purposePay: 'оплату',
		purposeDonate: 'пожертвование'
	},
	paymentButton: {
		Recurring: 'Регулярный',
		via: 'через'
	},
	common: {
		dates: {
			day: 'день',
			days: 'дни'
		},
		recurring: {
			day: 'д',
			month: 'м',
			year: 'г'
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

const ru: Translation = deepMergeDict(en as any, ruPartial as DeepPartial<Translation>)
export default ru
