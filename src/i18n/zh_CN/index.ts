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
		purposeDonate: '捐赠'
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
			month: '月',
			year: '年'
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

const zh_CN: Translation = deepMergeDict(en as any, zh_CNPartial as DeepPartial<Translation>)
export default zh_CN
