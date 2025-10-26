import type { Translation } from '../i18n-types'
import type { DeepPartial } from '$lib/helpers/i18n'
import { deepMergeDict } from '$lib/helpers/i18n'
import en from '../en/index'

const jaPartial: DeepPartial<Translation> = {
	walletCard: {
		customAmount: '金額を指定',
		tap: 'タップ',
		scan: 'スキャン',
		hereTo: 'こちらで',
		withCash: '現金で',
		via: '経由',
		expiresIn: '有効期限',
		for: '対象',
		noPayment: '支払いなし',
		expired: '期限切れ',
		amount: '金額',
		close: '閉じる',
		switchMode: 'モード切替',
		navigate: 'ナビゲート',
		donate: '寄付',
		pay: '支払い',
		payment: '支払い',
		purposePay: '支払い',
		purposeDonate: '寄付',
		verifiedBusiness: '認証済みビジネス'
	},
	paymentButton: {
		Recurring: '定期',
		via: '経由'
	},
	common: {
		dates: {
			day: '日',
			days: '日'
		},
		recurring: {
			day: '日',
			week: '週',
			month: '月',
			year: '年'
		}
	}
}

const ja: Translation = deepMergeDict(en as any, jaPartial as DeepPartial<Translation>)
export default ja
