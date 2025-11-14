import type { Translation } from '../i18n-types'
import type { DeepPartial } from '$lib/helpers/i18n'
import { deepMergeDict } from '$lib/helpers/i18n'
import en from '../en/index'

const hu_HUPartial: DeepPartial<Translation> = {
	walletCard: {
		customAmount: 'Egyéni összeg',
		tap: 'Érintsd meg',
		scan: 'Szkenneld be',
		hereTo: 'itt a',
		withCash: 'készpénzzel',
		via: 'keresztül',
		expiresIn: 'Lejár',
		for: 'részére',
		noPayment: 'Nincs fizetés',
		expired: 'Lejárt',
		amount: 'Összeg',
		close: 'Bezárás',
		switchMode: 'Mód váltása',
		navigate: 'Navigálás',
		donate: 'Adományozás',
		pay: 'Fizetés',
		payment: 'fizetés',
		purposePay: 'fizetés',
		purposeDonate: 'adomány',
		verifiedBusiness: 'Ellenőrzött vállalat',
		verifiedWebsite: 'Ellenőrzött weboldal'
	},
	paymentButton: {
		Recurring: 'Ismétlődő',
		via: 'keresztül'
	},
	common: {
		dates: {
			day: 'Nap',
			days: 'Napok'
		},
		recurring: {
			day: 'n',   // nap
			week: 'h',  // hét
			month: 'hó', // hónap
			year: 'év'  // év
		}
	},
	paypass: {
		address: 'Számlacím',
		network: 'Hálózat',
		cash: 'Készpénz',
		chain: 'Hálózat típusa',
		amount: 'Összeg',
		purpose: 'Tétel',
		recurringDonation: 'Rendszeres adomány',
		recurringPayment: 'Rendszeres fizetés',
		donation: 'Adomány',
		payment: 'Fizetés',
		swapFor: 'Csere erre',
		split: 'Felosztás',
		iban: 'IBAN',
		bic: 'BIC',
		beneficiary: 'Kedvezményezett',
		bicOroric: 'BIC / ORIC',
		accountNumber: 'Számlaszám',
		routingNumber: 'Irányítószám',
		accountAlias: 'Számla álneve',
		message: 'Üzenet',
		id: 'ID',
		accountId: 'Számla ID',
		pay: 'Fizetés',
		paypass: 'PayPass',
		scanToDonate: 'Adományozáshoz szkenneljen',
		scanToPay: 'Fizetéshez szkenneljen',
		paymentLocation: 'Fizetési hely',
		navigateToLocation: 'Navigálás a helyre',
		viewTransactions: 'Tranzakciók megtekintése',
		onlinePaypass: 'Online PayPass',
		topUpCryptoCard: 'Kriptokártya feltöltése',
		swapCurrency: 'Pénznem csere',
		activatePro: 'Pro aktiválása',
		sendOfflineTransaction: 'Offline tranzakció küldése'
	}
}

const hu_HU: Translation = deepMergeDict(en as any, hu_HUPartial as DeepPartial<Translation>)
export default hu_HU
