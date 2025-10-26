import type { Translation } from '../i18n-types'
import type { DeepPartial } from '$lib/helpers/i18n'
import { deepMergeDict } from '$lib/helpers/i18n'
import en from '../en/index'

const fa_IRPartial: DeepPartial<Translation> = {
	walletCard: {
		customAmount: 'مبلغ دلخواه',
		tap: 'ضربه بزنید',
		scan: 'اسکن کنید',
		hereTo: 'اینجا برای',
		withCash: 'با پول نقد',
		via: 'از طریق',
		expiresIn: 'تا انقضا',
		for: 'برای',
		noPayment: 'بدون پرداخت',
		expired: 'منقضی شده',
		amount: 'مبلغ',
		close: 'بستن',
		switchMode: 'تغییر حالت',
		navigate: 'مسیر‌یابی',
		donate: 'اهدا',
		pay: 'پرداخت',
		payment: 'پرداخت',
		purposePay: 'پرداخت',
		purposeDonate: 'اهدا',
		verified: 'تایید شده'
	},
	paymentButton: {
		Recurring: 'دوره‌ای',
		via: 'از طریق'
	},
	common: {
		dates: {
			day: 'روز',
			days: 'روزها'
		},
		recurring: {
			day: 'ر',
			week: 'ه',
			month: 'م',
			year: 'س'
		}
	}
}

const fa_IR: Translation = deepMergeDict(en as any, fa_IRPartial as DeepPartial<Translation>)
export default fa_IR
