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
		verifiedBusiness: '認証済みビジネス',
		verifiedWebsite: '認証済みウェブサイト'
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
	},
	paypass: {
		address: 'アカウントアドレス',
		network: 'ネットワーク',
		cash: '現金',
		chain: 'チェーンタイプ',
		amount: '金額',
		purpose: 'アイテム',
		recurringDonation: '定期寄付',
		recurringPayment: '定期支払い',
		donation: '寄付',
		payment: '支払い',
		swapFor: '交換先',
		split: '分割',
		iban: 'IBAN',
		bic: 'BIC',
		beneficiary: '受取人',
		bicOroric: 'BIC / ORIC',
		accountNumber: '口座番号',
		routingNumber: 'ルーティング番号',
		accountAlias: '口座エイリアス',
		message: 'メッセージ',
		id: 'ID',
		accountId: 'アカウントID',
		pay: '支払う',
		paypass: 'PayPass',
		scanToDonate: '寄付するにはスキャン',
		scanToPay: '支払うにはスキャン',
		paymentLocation: '支払い場所',
		navigateToLocation: '場所へナビ',
		viewTransactions: '取引を表示',
		onlinePaypass: 'オンライン PayPass',
		topUpCryptoCard: '暗号カードをチャージ',
		swapCurrency: '通貨を交換',
		activatePro: 'Pro を有効化',
		sendOfflineTransaction: 'オフライン取引を送信'
	}
}

const ja: Translation = deepMergeDict(en as any, jaPartial as DeepPartial<Translation>)
export default ja
