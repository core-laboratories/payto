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
		verifiedBusiness: 'सत्यापित व्यवसाय',
		verifiedWebsite: 'सत्यापित वेबसाइट'
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
	},
	paypass: {
		address: 'खाता पता',
		network: 'नेटवर्क',
		cash: 'नकद',
		chain: 'नेटवर्क प्रकार',
		amount: 'राशि',
		purpose: 'आइटम',
		recurringDonation: 'आवर्ती दान',
		recurringPayment: 'आवर्ती भुगतान',
		donation: 'दान',
		payment: 'भुगतान',
		swapFor: 'इसके लिए बदलें',
		split: 'विभाजित करें',
		iban: 'IBAN',
		bic: 'BIC',
		beneficiary: 'लाभार्थी',
		bicOroric: 'BIC / ORIC',
		accountNumber: 'खाता संख्या',
		routingNumber: 'रूटिंग नंबर',
		accountAlias: 'खाता उपनाम',
		message: 'संदेश',
		id: 'आईडी',
		accountId: 'खाता आईडी',
		pay: 'भुगतान करें',
		paypass: 'PayPass',
		scanToDonate: 'दान करने के लिए स्कैन करें',
		scanToPay: 'भुगतान करने के लिए स्कैन करें',
		paymentLocation: 'भुगतान स्थान',
		navigateToLocation: 'स्थान पर नेविगेट करें',
		viewTransactions: 'लेनदेन देखें',
		onlinePaypass: 'ऑनलाइन PayPass',
		topUpCryptoCard: 'क्रिप्टो कार्ड रिचार्ज करें',
		swapCurrency: 'मुद्रा बदलें',
		activatePro: 'Pro सक्रिय करें',
		sendOfflineTransaction: 'ऑफ़लाइन लेनदेन भेजें'
	}
}

const hi_IN: Translation = deepMergeDict(en as any, hi_INPartial as DeepPartial<Translation>)
export default hi_IN
