import type { Translation } from '../i18n-types'
import type { DeepPartial } from '$lib/helpers/i18n'
import { deepMergeDict } from '$lib/helpers/i18n'
import en from '../en/index'

const ptBRPartial: DeepPartial<Translation> = {
	walletCard: {
		customAmount: 'Valor próprio',
		tap: 'Toque',
		scan: 'Escanear',
		hereTo: 'aqui para',
		withCash: 'em dinheiro',
		via: 'via',
		expiresIn: 'Expira em',
		for: 'por',
		noPayment: 'Nenhum pagamento',
		expired: 'Expirado',
		amount: 'Valor',
		close: 'Fechar',
		switchMode: 'Mudar modo',
		navigate: 'Navegar',
		donate: 'Doar',
		pay: 'Pagar',
		payment: 'pagamento',
		purposePay: 'pagamento',
		purposeDonate: 'doação',
		verifiedBusiness: 'Negócio Verificado',
		verifiedWebsite: 'Site Web Verificado'
	},
	paymentButton: {
		Recurring: 'Recorrente',
		via: 'via'
	},
	common: {
		dates: {
			day: 'dia',
			days: 'dias'
		},
		recurring: {
			day: 'd',
			week: 's',
			month: 'm',
			year: 'a'
		}
	},
	paypass: {
		address: 'Endereço da conta',
		network: 'Rede',
		cash: 'Dinheiro',
		chain: 'Tipo de rede',
		amount: 'Valor',
		purpose: 'Item',
		recurringDonation: 'Doação recorrente',
		recurringPayment: 'Pagamento recorrente',
		donation: 'Doação',
		payment: 'Pagamento',
		swapFor: 'Trocar por',
		split: 'Dividir',
		iban: 'IBAN',
		bic: 'BIC',
		beneficiary: 'Beneficiário',
		bicOroric: 'BIC / ORIC',
		accountNumber: 'Número da conta',
		routingNumber: 'Número de roteamento',
		accountAlias: 'Apelido da conta',
		message: 'Mensagem',
		id: 'ID',
		accountId: 'ID da conta',
		pay: 'Pagar',
		paypass: 'PayPass',
		scanToDonate: 'Escanear para doar',
		scanToPay: 'Escanear para pagar',
		paymentLocation: 'Local de pagamento',
		navigateToLocation: 'Navegar até o local',
		viewTransactions: 'Ver transações',
		onlinePaypass: 'PayPass online',
		topUpCryptoCard: 'Recarregar cartão cripto',
		swapCurrency: 'Trocar moeda',
		activatePro: 'Ativar Pro',
		sendOfflineTransaction: 'Enviar transação offline'
	}
}

const ptBR: Translation = deepMergeDict(en as any, ptBRPartial as DeepPartial<Translation>)
export default ptBR
