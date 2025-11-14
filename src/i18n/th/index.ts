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
		verifiedBusiness: 'ธุรกิจที่ยืนยันแล้ว',
		verifiedWebsite: 'เว็บไซต์ที่ยืนยันแล้ว'
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
	},
	paypass: {
		address: 'ที่อยู่บัญชี',
		network: 'เครือข่าย',
		cash: 'เงินสด',
		chain: 'ประเภทเครือข่าย',
		amount: 'จำนวนเงิน',
		purpose: 'รายการ',
		recurringDonation: 'การบริจาคประจำ',
		recurringPayment: 'การชำระเงินประจำ',
		donation: 'การบริจาค',
		payment: 'การชำระเงิน',
		swapFor: 'แลกเปลี่ยนเป็น',
		split: 'แยก',
		iban: 'IBAN',
		bic: 'BIC',
		beneficiary: 'ผู้รับผลประโยชน์',
		bicOroric: 'BIC / ORIC',
		accountNumber: 'หมายเลขบัญชี',
		routingNumber: 'หมายเลขเส้นทาง',
		accountAlias: 'ชื่อเล่นบัญชี',
		message: 'ข้อความ',
		id: 'ID',
		accountId: 'ID บัญชี',
		pay: 'จ่าย',
		paypass: 'PayPass',
		scanToDonate: 'สแกนเพื่อบริจาค',
		scanToPay: 'สแกนเพื่อชำระเงิน',
		paymentLocation: 'สถานที่ชำระเงิน',
		navigateToLocation: 'นำทางไปยังสถานที่',
		viewTransactions: 'ดูธุรกรรม',
		onlinePaypass: 'PayPass ออนไลน์',
		topUpCryptoCard: 'เติมเงินบัตรคริปโต',
		swapCurrency: 'แลกเปลี่ยนสกุลเงิน',
		activatePro: 'เปิดใช้งาน Pro',
		sendOfflineTransaction: 'ส่งธุรกรรมออฟไลน์'
	}
}

const th_TH: Translation = deepMergeDict(en as any, th_THPartial as DeepPartial<Translation>)
export default th_TH
