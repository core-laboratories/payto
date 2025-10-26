import type { Translation } from '../i18n-types'
import type { DeepPartial } from '$lib/helpers/i18n'
import { deepMergeDict } from '$lib/helpers/i18n'
import en from '../en/index'

const hi_INPartial: DeepPartial<Translation> = {
	walletCard: {
		customAmount: 'कस्टम राशि',
		tap: 'टैप करें',
		scan: 'स्कैन करें',
		hereTo: 'यहाँ',
		withCash: 'नकद से',
		via: 'के माध्यम से',
		expiresIn: 'समाप्ति में',
		for: 'के लिए',
		noPayment: 'कोई भुगतान नहीं',
		expired: 'समाप्त हो गया',
		amount: 'राशि',
		close: 'बंद करें',
		switchMode: 'मोड बदलें',
		navigate: 'नेविगेट करें',
		donate: 'दान करें',
		pay: 'भुगतान करें',
		payment: 'भुगतान',
		purposePay: 'भुगतान',
		purposeDonate: 'दान',
		verifiedBusiness: 'सत्यापित व्यवसाय'
	},
	paymentButton: {
		Recurring: 'आवर्ती',
		via: 'के माध्यम से'
	},
	common: {
		dates: {
			day: 'दिन',
			days: 'दिन'
		},
		recurring: {
			day: 'द',
			week: 'स',
			month: 'म',
			year: 'व'
		}
	}
}

const hi_IN: Translation = deepMergeDict(en as any, hi_INPartial as DeepPartial<Translation>)
export default hi_IN
