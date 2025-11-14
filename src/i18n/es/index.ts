import type { Translation } from '../i18n-types'
import type { DeepPartial } from '$lib/helpers/i18n'
import { deepMergeDict } from '$lib/helpers/i18n'
import en from '../en/index'

const esPartial: DeepPartial<Translation> = {
	walletCard: {
		customAmount: 'Monto propio',
		tap: 'Tocar',
		scan: 'Escanear',
		hereTo: 'aquí para',
		withCash: 'en efectivo',
		via: 'a través de',
		expiresIn: 'Expira en',
		for: 'por',
		noPayment: 'Sin pago',
		expired: 'Expirado',
		amount: 'Monto',
		close: 'Cerrar',
		switchMode: 'Cambiar modo',
		navigate: 'Navegar',
		donate: 'Donar',
		pay: 'Pagar',
		payment: 'pago',
		purposePay: 'pago',
		purposeDonate: 'donación',
		verifiedBusiness: 'Empresa Verificada',
		verifiedWebsite: 'Sitio Web Verificado'
	},
	paymentButton: {
		Recurring: 'Recurrente',
		via: 'a través de'
	},
	common: {
		dates: {
			day: 'día',
			days: 'días'
		},
		recurring: {
			day: 'd',
			week: 's',
			month: 'm',
			year: 'y'
		}
	},
	paypass: {
		address: 'Dirección de cuenta',
		network: 'Red',
		cash: 'Efectivo',
		chain: 'Tipo de cadena',
		amount: 'Cantidad',
		purpose: 'Artículo',
		recurringDonation: 'Donación recurrente',
		recurringPayment: 'Pago recurrente',
		donation: 'Donación',
		payment: 'Pago',
		swapFor: 'Cambiar por',
		split: 'Dividir',
		iban: 'IBAN',
		bic: 'BIC',
		beneficiary: 'Beneficiario',
		bicOroric: 'BIC / ORIC',
		accountNumber: 'Número de cuenta',
		routingNumber: 'Número de enrutamiento',
		accountAlias: 'Alias de cuenta',
		message: 'Mensaje',
		id: 'ID',
		accountId: 'ID de cuenta',
		pay: 'Pagar',
		paypass: 'PayPass',
		scanToDonate: 'Escanear para donar',
		scanToPay: 'Escanear para pagar',
		paymentLocation: 'Lugar de pago',
		navigateToLocation: 'Navegar al lugar',
		viewTransactions: 'Ver transacciones',
		onlinePaypass: 'PayPass en línea',
		topUpCryptoCard: 'Recargar tarjeta cripto',
		swapCurrency: 'Cambiar moneda',
		activatePro: 'Activar Pro',
		sendOfflineTransaction: 'Enviar transacción sin conexión'
	}
}

const es: Translation = deepMergeDict(en as any, esPartial as DeepPartial<Translation>)
export default es
