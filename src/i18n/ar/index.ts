import type { Translation } from '../i18n-types'
import type { DeepPartial } from '$lib/helpers/i18n'
import { deepMergeDict } from '$lib/helpers/i18n'
import en from '../en/index'

const arPartial: DeepPartial<Translation> = {
	walletCard: {
		customAmount: 'مبلغ مخصص',
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
		purposeDonate: 'تبرع',
		verifiedBusiness: 'مؤسسة موثقة',
		verifiedWebsite: 'موقع موثق'
	},
	paymentButton: {
		Recurring: 'متكرر',
		via: 'عبر'
	},
	common: {
		dates: {
			day: 'يوم',
			days: 'أيام'
		},
		recurring: {
			day: 'ي',
			week: 'أ',
			month: 'ش',
			year: 'س'
		}
	},
	paypass: {
		address: 'عنوان الحساب',
		network: 'الشبكة',
		cash: 'نقد',
		chain: 'نوع الشبكة',
		amount: 'المبلغ',
		purpose: 'البند',
		recurringDonation: 'تبرع متكرر',
		recurringPayment: 'دفعة متكررة',
		donation: 'تبرع',
		payment: 'دفعة',
		swapFor: 'استبدال بـ',
		split: 'تقسيم',
		iban: 'IBAN',
		bic: 'BIC',
		beneficiary: 'المستفيد',
		bicOroric: 'BIC / ORIC',
		accountNumber: 'رقم الحساب',
		routingNumber: 'رقم التوجيه',
		accountAlias: 'اسم مستعار للحساب',
		message: 'رسالة',
		id: 'المعرف',
		accountId: 'معرف الحساب',
		pay: 'ادفع',
		paypass: 'PayPass',
		scanToDonate: 'امسح للتبرع',
		scanToPay: 'امسح للدفع',
		paymentLocation: 'موقع الدفع',
		navigateToLocation: 'انتقل إلى الموقع',
		viewTransactions: 'عرض المعاملات',
		onlinePaypass: 'PayPass عبر الإنترنت',
		topUpCryptoCard: 'إعادة شحن بطاقة التشفير',
		swapCurrency: 'استبدال العملة',
		activatePro: 'تفعيل Pro',
		sendOfflineTransaction: 'إرسال معاملة دون اتصال'
	}
}

const ar: Translation = deepMergeDict(en as any, arPartial as DeepPartial<Translation>)
export default ar
