import type { Translation } from '../i18n-types'
import type { DeepPartial } from '$lib/helpers/i18n'
import { deepMergeDict } from '$lib/helpers/i18n'
import en from '../en/index'

const vi_VNPartial: DeepPartial<Translation> = {
	walletCard: {
		customAmount: 'Số tiền tùy chỉnh',
		tap: 'Chạm',
		scan: 'Quét',
		hereTo: 'tại đây để',
		withCash: 'bằng tiền mặt',
		via: 'qua',
		expiresIn: 'Hết hạn trong',
		for: 'cho',
		noPayment: 'Không có thanh toán',
		expired: 'Đã hết hạn',
		amount: 'Số tiền',
		close: 'Đóng',
		switchMode: 'Chuyển chế độ',
		navigate: 'Điều hướng',
		donate: 'Quyên góp',
		pay: 'Thanh toán',
		payment: 'thanh toán',
		purposePay: 'thanh toán',
		purposeDonate: 'quyên góp',
		verifiedBusiness: 'Doanh nghiệp đã xác minh',
		verifiedWebsite: 'Website đã xác minh'
	},
	paymentButton: {
		Recurring: 'Định kỳ',
		via: 'qua'
	},
	common: {
		dates: {
			day: 'Ngày',
			days: 'Ngày'
		},
		recurring: {
			day: 'ng',   // ngày
			week: 't',   // tuần
			month: 'th', // tháng
			year: 'n'    // năm
		}
	},
	paypass: {
		address: 'Địa chỉ tài khoản',
		network: 'Mạng',
		cash: 'Tiền mặt',
		chain: 'Loại mạng',
		amount: 'Số tiền',
		purpose: 'Mục',
		recurringDonation: 'Quyên góp định kỳ',
		recurringPayment: 'Thanh toán định kỳ',
		donation: 'Quyên góp',
		payment: 'Thanh toán',
		swapFor: 'Đổi sang',
		split: 'Chia',
		iban: 'IBAN',
		bic: 'BIC',
		beneficiary: 'Người thụ hưởng',
		bicOroric: 'BIC / ORIC',
		accountNumber: 'Số tài khoản',
		routingNumber: 'Số định tuyến',
		accountAlias: 'Bí danh tài khoản',
		message: 'Tin nhắn',
		id: 'ID',
		accountId: 'ID tài khoản',
		pay: 'Thanh toán',
		paypass: 'PayPass',
		scanToDonate: 'Quét để quyên góp',
		scanToPay: 'Quét để thanh toán',
		paymentLocation: 'Địa điểm thanh toán',
		navigateToLocation: 'Đi đến địa điểm',
		viewTransactions: 'Xem giao dịch',
		onlinePaypass: 'PayPass trực tuyến',
		topUpCryptoCard: 'Nạp thẻ crypto',
		swapCurrency: 'Đổi tiền tệ',
		activatePro: 'Kích hoạt Pro',
		sendOfflineTransaction: 'Gửi giao dịch ngoại tuyến'
	}
}

const vi_VN: Translation = deepMergeDict(en as any, vi_VNPartial as DeepPartial<Translation>)
export default vi_VN
