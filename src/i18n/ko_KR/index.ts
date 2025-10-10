import type { Translation } from '../i18n-types'
import type { DeepPartial } from '$lib/helpers/i18n'
import { deepMergeDict } from '$lib/helpers/i18n'
import en from '../en/index'

const ko_KRPartial: DeepPartial<Translation> = {
	walletCard: {
		customAmount: '직접 입력',
		tap: '탭하기',
		scan: '스캔',
		hereTo: '여기에서',
		withCash: '현금으로',
		via: '통해',
		expiresIn: '만료일',
		for: '대상',
		noPayment: '결제 없음',
		expired: '만료됨',
		amount: '금액',
		close: '닫기',
		switchMode: '모드 전환',
		navigate: '이동',
		donate: '기부',
		pay: '결제',
		payment: '결제',
		purposePay: '결제',
		purposeDonate: '기부'
	},
	paymentButton: {
		Recurring: '정기 결제',
		via: '통해'
	},
	common: {
		dates: {
			day: '일',
			days: '일'
		},
		recurring: {
			day: '일',
			month: '월',
			year: '년'
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

const ko_KR: Translation = deepMergeDict(en as any, ko_KRPartial as DeepPartial<Translation>)
export default ko_KR
