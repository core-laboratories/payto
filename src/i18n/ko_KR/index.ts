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
		purposeDonate: '기부',
		verifiedBusiness: '인증된 비즈니스',
		verifiedWebsite: '인증된 웹사이트'
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
			week: '주',
			month: '월',
			year: '년'
		}
	},
	paypass: {
		address: '계정 주소',
		network: '네트워크',
		cash: '현금',
		chain: '체인 유형',
		amount: '금액',
		purpose: '항목',
		recurringDonation: '정기 기부',
		recurringPayment: '정기 결제',
		donation: '기부',
		payment: '결제',
		swapFor: '교환 대상',
		split: '분할',
		iban: 'IBAN',
		bic: 'BIC',
		beneficiary: '수혜자',
		bicOroric: 'BIC / ORIC',
		accountNumber: '계좌 번호',
		routingNumber: '라우팅 번호',
		accountAlias: '계정 별칭',
		message: '메시지',
		id: 'ID',
		accountId: '계정 ID',
		pay: '결제하기',
		paypass: 'PayPass',
		scanToDonate: '기부하려면 스캔',
		scanToPay: '결제하려면 스캔',
		paymentLocation: '결제 장소',
		navigateToLocation: '위치로 이동',
		viewTransactions: '거래 보기',
		onlinePaypass: '온라인 PayPass',
		topUpCryptoCard: '암호화 카드 충전',
		swapCurrency: '통화 교환',
		activatePro: 'Pro 활성화',
		sendOfflineTransaction: '오프라인 거래 전송'
	}
}

const ko_KR: Translation = deepMergeDict(en as any, ko_KRPartial as DeepPartial<Translation>)
export default ko_KR
