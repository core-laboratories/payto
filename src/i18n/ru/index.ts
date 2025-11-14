import type { Translation } from '../i18n-types'
import type { DeepPartial } from '$lib/helpers/i18n'
import { deepMergeDict } from '$lib/helpers/i18n'
import en from '../en/index'

const ruPartial: DeepPartial<Translation> = {
	walletCard: {
		customAmount: 'Своя сумма',
		tap: 'Нажмите',
		scan: 'Сканировать',
		hereTo: 'чтобы',
		withCash: 'наличными',
		via: 'через',
		expiresIn: 'Истекает через',
		for: 'за',
		noPayment: 'Нет платежа',
		expired: 'Истекло',
		amount: 'Сумма',
		close: 'Закрыть',
		switchMode: 'Сменить режим',
		navigate: 'Перейти',
		donate: 'Пожертвовать',
		pay: 'Оплатить',
		payment: 'платёж',
		purposePay: 'оплату',
		purposeDonate: 'пожертвование',
		verifiedBusiness: 'Проверенный бизнес',
		verifiedWebsite: 'Проверенный сайт'
	},
	paymentButton: {
		Recurring: 'Регулярный',
		via: 'через'
	},
	common: {
		dates: {
			day: 'день',
			days: 'дни'
		},
		recurring: {
			day: 'д',
			week: 'н',
			month: 'м',
			year: 'г'
		}
	},
	paypass: {
		address: 'Адрес счёта',
		network: 'Сеть',
		cash: 'Наличные',
		chain: 'Тип сети',
		amount: 'Сумма',
		purpose: 'Позиция',
		recurringDonation: 'Регулярное пожертвование',
		recurringPayment: 'Регулярный платёж',
		donation: 'Пожертвование',
		payment: 'Платёж',
		swapFor: 'Обменять на',
		split: 'Разделить',
		iban: 'IBAN',
		bic: 'BIC',
		beneficiary: 'Получатель',
		bicOroric: 'BIC / ORIC',
		accountNumber: 'Номер счёта',
		routingNumber: 'Маршрутный номер',
		accountAlias: 'Псевдоним счёта',
		message: 'Сообщение',
		id: 'ID',
		accountId: 'ID счёта',
		pay: 'Оплатить',
		paypass: 'PayPass',
		scanToDonate: 'Сканируйте для помощи',
		scanToPay: 'Сканируйте для оплаты',
		paymentLocation: 'Место оплаты',
		navigateToLocation: 'Навигировать к месту',
		viewTransactions: 'Просмотр транзакций',
		onlinePaypass: 'Онлайн PayPass',
		topUpCryptoCard: 'Пополнить криптокарту',
		swapCurrency: 'Обмен валюты',
		activatePro: 'Активировать Pro',
		sendOfflineTransaction: 'Отправить офлайн-транзакцию'
	}
}

const ru: Translation = deepMergeDict(en as any, ruPartial as DeepPartial<Translation>)
export default ru
