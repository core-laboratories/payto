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
		verifiedBusiness: 'کسب و کار تأیید شده',
		verifiedWebsite: 'وبسایت تأیید شده'
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
	},
	paypass: {
		address: 'آدرس حساب',
		network: 'شبکه',
		cash: 'نقدی',
		chain: 'نوع زنجیره',
		amount: 'مبلغ',
		purpose: 'آیتم',
		recurringDonation: 'اهدای مکرر',
		recurringPayment: 'پرداخت مکرر',
		donation: 'اهداء',
		payment: 'پرداخت',
		swapFor: 'تعویض با',
		split: 'تقسیم',
		iban: 'IBAN',
		bic: 'BIC',
		beneficiary: 'ذینفع',
		bicOroric: 'BIC / ORIC',
		accountNumber: 'شماره حساب',
		routingNumber: 'شماره مسیریابی',
		accountAlias: 'لقب حساب',
		message: 'پیام',
		id: 'شناسه',
		accountId: 'شناسه حساب',
		pay: 'پرداخت',
		paypass: 'PayPass',
		scanToDonate: 'اسکن برای اهدا',
		scanToPay: 'اسکن برای پرداخت',
		paymentLocation: 'محل پرداخت',
		navigateToLocation: 'رفتن به محل',
		viewTransactions: 'مشاهده تراکنش‌ها',
		onlinePaypass: 'PayPass آنلاین',
		topUpCryptoCard: 'شارژ کارت کریپتو',
		swapCurrency: 'تعویض ارز',
		activatePro: 'فعال‌سازی Pro',
		sendOfflineTransaction: 'ارسال تراکنش آفلاین'
	}
}

const fa_IR: Translation = deepMergeDict(en as any, fa_IRPartial as DeepPartial<Translation>)
export default fa_IR
