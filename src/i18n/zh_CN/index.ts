import type { Translation } from '../i18n-types'
import type { DeepPartial } from '$lib/helpers/i18n'
import { deepMergeDict } from '$lib/helpers/i18n'
import en from '../en/index'

const zh_CNPartial: DeepPartial<Translation> = {
	walletCard: {
		customAmount: '自定义金额',
		tap: '点击',
		scan: '扫码',
		hereTo: '此处以',
		withCash: '使用现金',
		via: '通过',
		expiresIn: '到期于',
		for: '用于',
		noPayment: '无付款',
		expired: '已过期',
		amount: '金额',
		close: '关闭',
		switchMode: '切换模式',
		navigate: '导航',
		donate: '捐赠',
		pay: '支付',
		payment: '支付',
		purposePay: '支付',
		purposeDonate: '捐赠',
		verifiedBusiness: '经过验证的企业',
		verifiedWebsite: '经过验证的网站'
	},
	paymentButton: {
		Recurring: '定期',
		via: '通过'
	},
	common: {
		dates: {
			day: '日',
			days: '日'
		},
		recurring: {
			day: '日',
			week: '周',
			month: '月',
			year: '年'
		}
	},
	paypass: {
		address: '账户地址',
		network: '网络',
		cash: '现金',
		chain: '链类型',
		amount: '金额',
		purpose: '项目',
		recurringDonation: '定期捐赠',
		recurringPayment: '定期付款',
		donation: '捐赠',
		payment: '付款',
		swapFor: '交换为',
		split: '分割',
		iban: 'IBAN',
		bic: 'BIC',
		beneficiary: '受益人',
		bicOroric: 'BIC / ORIC',
		accountNumber: '账户号码',
		routingNumber: '路由号码',
		accountAlias: '账户别名',
		message: '消息',
		id: 'ID',
		accountId: '账户 ID',
		pay: '支付',
		paypass: 'PayPass',
		scanToDonate: '扫码捐赠',
		scanToPay: '扫码支付',
		paymentLocation: '支付地点',
		navigateToLocation: '导航到地点',
		viewTransactions: '查看交易',
		onlinePaypass: '在线 PayPass',
		topUpCryptoCard: '充值加密卡',
		swapCurrency: '兑换货币',
		activatePro: '激活 Pro',
		sendOfflineTransaction: '发送离线交易'
	}
}

const zh_CN: Translation = deepMergeDict(en as any, zh_CNPartial as DeepPartial<Translation>)
export default zh_CN
