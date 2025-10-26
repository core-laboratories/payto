import type { Translation } from '../i18n-types'
import type { DeepPartial } from '$lib/helpers/i18n'
import { deepMergeDict } from '$lib/helpers/i18n'
import en from '../en/index'

const th_THPartial: DeepPartial<Translation> = {
	walletCard: {
		customAmount: 'จำนวนกำหนดเอง',
		tap: 'แตะ',
		scan: 'สแกน',
		hereTo: 'ที่นี่เพื่อ',
		withCash: 'ด้วยเงินสด',
		via: 'ผ่าน',
		expiresIn: 'หมดอายุใน',
		for: 'สำหรับ',
		noPayment: 'ไม่มีการชำระเงิน',
		expired: 'หมดอายุแล้ว',
		amount: 'จำนวนเงิน',
		close: 'ปิด',
		switchMode: 'สลับโหมด',
		navigate: 'นำทาง',
		donate: 'บริจาค',
		pay: 'ชำระเงิน',
		payment: 'การชำระเงิน',
		purposePay: 'การชำระเงิน',
		purposeDonate: 'การบริจาค',
		verified: 'ยืนยันแล้ว'
	},
	paymentButton: {
		Recurring: 'เป็นประจำ',
		via: 'ผ่าน'
	},
	common: {
		dates: {
			day: 'วัน',
			days: 'วัน'
		},
		recurring: {
			day: 'ว',
			week: 'ส',
			month: 'ด',
			year: 'ป'
		}
	}
}

const th_TH: Translation = deepMergeDict(en as any, th_THPartial as DeepPartial<Translation>)
export default th_TH
