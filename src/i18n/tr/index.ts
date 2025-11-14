import type { Translation } from '../i18n-types'
import type { DeepPartial } from '$lib/helpers/i18n'
import { deepMergeDict } from '$lib/helpers/i18n'
import en from '../en/index'

const tr_TRPartial: DeepPartial<Translation> = {
	walletCard: {
		customAmount: 'Özel tutar',
		tap: 'Dokun',
		scan: 'Tara',
		hereTo: 'buraya',
		withCash: 'Nakit ile',
		via: 'ile',
		expiresIn: 'Sona ermesine',
		for: 'için',
		noPayment: 'Ödeme yok',
		expired: 'Süresi doldu',
		amount: 'Tutar',
		close: 'Kapat',
		switchMode: 'Mod değiştir',
		navigate: 'Yol tarifi',
		donate: 'Bağış yap',
		pay: 'Öde',
		payment: 'ödeme',
		purposePay: 'ödeme',
		purposeDonate: 'bağış',
		verifiedBusiness: 'Doğrulanmış İşletme',
		verifiedWebsite: 'Doğrulanmış Website'
	},
	paymentButton: {
		Recurring: 'Yinelenen',
		via: 'ile'
	},
	common: {
		dates: {
			day: 'Gün',
			days: 'Günler'
		},
		recurring: {
			day: 'g',
			week: 'h',
			month: 'a',
			year: 'y'
		}
	},
	paypass: {
		address: 'Hesap adresi',
		network: 'Ağ',
		cash: 'Nakit',
		chain: 'Ağ türü',
		amount: 'Tutar',
		purpose: 'Öğe',
		recurringDonation: 'Düzenli bağış',
		recurringPayment: 'Düzenli ödeme',
		donation: 'Bağış',
		payment: 'Ödeme',
		swapFor: 'Şununla değiştir',
		split: 'Böl',
		iban: 'IBAN',
		bic: 'BIC',
		beneficiary: 'Lehdar',
		bicOroric: 'BIC / ORIC',
		accountNumber: 'Hesap numarası',
		routingNumber: 'Yönlendirme numarası',
		accountAlias: 'Hesap takma adı',
		message: 'Mesaj',
		id: 'ID',
		accountId: 'Hesap ID',
		pay: 'Öde',
		paypass: 'PayPass',
		scanToDonate: 'Bağış için tara',
		scanToPay: 'Ödeme için tara',
		paymentLocation: 'Ödeme konumu',
		navigateToLocation: 'Konuma git',
		viewTransactions: 'İşlemleri görüntüle',
		onlinePaypass: 'Çevrimiçi PayPass',
		topUpCryptoCard: 'Kripto kartı yükle',
		swapCurrency: 'Para birimi değiştir',
		activatePro: 'Pro’yu etkinleştir',
		sendOfflineTransaction: 'Çevrimdışı işlem gönder'
	}
}

const tr_TR: Translation = deepMergeDict(en as any, tr_TRPartial as DeepPartial<Translation>)
export default tr_TR
