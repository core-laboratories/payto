import type { Translation } from '../i18n-types'
import type { DeepPartial } from '$lib/helpers/i18n'
import { deepMergeDict } from '$lib/helpers/i18n'
import en from '../en/index'

const arPartial: DeepPartial<Translation> = {
	walletCard: {
		customAmount: 'مبلغ مخصص',
		day: 'يوم',
		days: 'أيام',
		tap: 'اضغط',
		scan: 'امسح',
		hereTo: 'هنا لـ',
		withCash: 'نقدًا',
		via: 'عبر',
		expiresIn: 'تنتهي خلال',
		for: 'لـ',
		noPayment: 'لا توجد دفعة',
		expired: 'منتهي الصلاحية',
		amount: 'المبلغ',
		close: 'إغلاق',
		switchMode: 'تبديل الوضع',
		navigate: 'انتقل',
		donate: 'تبرع',
		pay: 'ادفع',
		payment: 'دفعة',
		purposePay: 'دفع',
		purposeDonate: 'تبرع'
	},
	paymentButton: {
		Recurring: 'متكرر',
		via: 'عبر'
	}
}

const ar: Translation = deepMergeDict(en as any, arPartial as DeepPartial<Translation>)
export default ar
