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
		verified: 'Đã xác minh'
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
	}
}

const vi_VN: Translation = deepMergeDict(en as any, vi_VNPartial as DeepPartial<Translation>)
export default vi_VN
