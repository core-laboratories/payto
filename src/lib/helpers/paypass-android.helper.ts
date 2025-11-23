import * as jose from 'jose';
import { env as publicEnv } from '$env/dynamic/public';
import { calculateNotifications } from './paypass-notifications.helper';
import { getPaypassLocalizedString, type LocalizedText, getPaypassLocalizedValueForLocale as getPaypassLocalizedValue } from './paypass-i18n.helper';
import { formatAmount, formatAddressText } from './paypass-operator.helper';

const isDebug = false;

type TextModConfig = {
	id?: string;
	header: string;
	headerI18nKey?: string;	// i18n key for header (e.g. 'paypass.address')
	body: string;
	bodyI18nKey?: string;	// optional i18n key for body (full string per locale)
	onPass?: boolean;
};

export interface GoogleWalletPayPassConfig {
	issuerId: string | undefined;
	saEmail: string | undefined;
	saPrivateKeyPem: string | undefined;
	classId: string;
	companyName: string | null;
	orgName: string;
	logoUrl: string;
	iconUrl: string;
	heroUrl?: string;
	titleText?: string;
	amountType?: { recurring: boolean; donate: boolean };
	amountObject?: { value: string; recurrence?: { value?: string } };
	purposeText?: string;
	subheaderText?: string;
	hexBackgroundColor?: string;
	barcode: any;
	donate?: boolean;
	rtl?: boolean;	// Right-to-left support (manual swap)
	locale?: string;
	payload: any;	// Full payload with all data
}

export interface GoogleWalletPayPassResult {
	saveUrl: string;
	classId: string;
	gwObject: any;
	gwClass: any;
}

/**
 * Convert our internal LocalizedText shape (defaultValue + translatedValues map)
 * into the Google Wallet LocalizedString shape.
 */
function toGoogleLocalizedString(
	src: LocalizedText | undefined,
	fallbackLanguage = 'en'
): {
	defaultValue: { language: string; value: string };
	translatedValues?: { language: string; value: string }[];
} | undefined {
	if (!src || !src.defaultValue) return undefined;

	// If we know the real language of defaultValue, use it.
	// Otherwise fall back to 'en' to avoid invalid payloads.
	const language = src.defaultLanguage || fallbackLanguage;

	const result: {
		defaultValue: { language: string; value: string };
		translatedValues?: { language: string; value: string }[];
	} = {
		defaultValue: {
			language,
			value: src.defaultValue
		}
	};

	if (src.translatedValues && Object.keys(src.translatedValues).length > 0) {
		result.translatedValues = Object.entries(src.translatedValues).map(
			([lang, value]) => ({
				language: lang,
				value
			})
		);
	}

	return result;
}

export async function buildGoogleWalletPayPassSaveLink(config: GoogleWalletPayPassConfig): Promise<GoogleWalletPayPassResult> {
	const {
		issuerId,
		saEmail,
		saPrivateKeyPem,
		classId,
		companyName,
		orgName,
		logoUrl,
		iconUrl,
		heroUrl,
		titleText,
		amountType,
		amountObject,
		purposeText,
		subheaderText,
		hexBackgroundColor,
		barcode,
		donate,
		payload,
		rtl = false,
		locale = 'en'
	} = config;

	// Validate configuration
	if (!issuerId || !saEmail || !saPrivateKeyPem) {
		throw new Error('Google signing configuration missing (issuer/service account).');
	}

	// ---------------- Address formatting ----------------
	const addressText = formatAddressText(
		payload.props.destination,
		payload.props.network,
		payload.props.other
	);

	// Defaults
	const fullClassId = classId;
	const issuerName = companyName || 'PayPass';

	// ---------------- Text Modules ----------------
	const textMods: TextModConfig[] = [];

	if (addressText) {
		const addressLangI18nKey = 'paypass.address';
		const addressHeaderLoc = getPaypassLocalizedString(addressLangI18nKey);
		textMods.push({
			id: 'address',
			header: addressHeaderLoc?.defaultValue || 'Address',
			headerI18nKey: addressLangI18nKey,
			body: addressText,
			onPass: false
		});
	}

	if (payload.props.network) {
		const networkLangI18nKey = 'paypass.network';
		const networkHeaderLoc = getPaypassLocalizedString(networkLangI18nKey);
		if (payload.props.network === 'void') {
			// Cash / TRANSPORT
			const cashLangI18nKey = 'paypass.cash';
			const cashLoc = getPaypassLocalizedString(cashLangI18nKey);
			const cashText = cashLoc?.defaultValue || 'Cash';
			const transportText = payload.props.transport?.toUpperCase() || '';
			textMods.push({
				id: 'network',
				header: networkHeaderLoc?.defaultValue || 'Network',
				headerI18nKey: cashLangI18nKey,
				body: `${cashText} / ${transportText}`,
				onPass: false
			});
		} else {
			// NETWORK / Chain: ID
			const chainLangI18nKey = 'paypass.chain';
			const chainLoc = getPaypassLocalizedString(chainLangI18nKey);
			const chainWord = chainLoc?.defaultValue || 'Chain';
			const chainPart = payload.chainId ? ` / ${chainWord}: ${payload.chainId}` : '';
			const networkText = (payload.props.network === "other" ? payload.props.other : payload.props.network).toUpperCase() + chainPart;
			textMods.push({
				id: 'network',
				header: networkHeaderLoc?.defaultValue || 'Network',
				headerI18nKey: networkLangI18nKey,
				body: networkText,
				onPass: false
			});
		}
	}

	if (purposeText) {
		const purposeLangI18nKey = 'paypass.purpose';
		const purposeHeaderLoc = getPaypassLocalizedString(purposeLangI18nKey);
		textMods.push({
			id: 'purpose',
			header: purposeHeaderLoc?.defaultValue || 'Item',
			headerI18nKey: purposeLangI18nKey,
			body: purposeText,
			onPass: true
		});
	}

	if (amountObject) {
		let headerText: string | undefined = undefined;
		let headerI18nKey: string | undefined = undefined;
		if (amountType?.recurring && amountType?.donate) {
			headerI18nKey = 'paypass.recurringDonation';
			headerText = getPaypassLocalizedString(headerI18nKey)?.defaultValue || 'Recurring Donation';
		} else if (amountType?.recurring) {
			headerI18nKey = 'paypass.recurringPayment';
			headerText = getPaypassLocalizedString(headerI18nKey)?.defaultValue || 'Recurring Payment';
		} else if (amountType?.donate) {
			headerI18nKey = 'paypass.donation';
			headerText = getPaypassLocalizedString(headerI18nKey)?.defaultValue || 'Donation';
		} else {
			headerI18nKey = 'paypass.payment';
			headerText = getPaypassLocalizedString(headerI18nKey)?.defaultValue || 'Payment';
		}

		const translations = {
			day: getPaypassLocalizedValue('common.recurring.day', locale) || 'd',
			week: getPaypassLocalizedValue('common.recurring.week', locale) || 'w',
			month: getPaypassLocalizedValue('common.recurring.month', locale) || 'm',
			year: getPaypassLocalizedValue('common.recurring.year', locale) || 'y'
		};

		textMods.push({
			id: 'amount',
			header: headerText,
			headerI18nKey: headerI18nKey,
			body: formatAmount(amountObject, translations, rtl),
			onPass: true
		});
	}

	if (payload.props.network === 'iban') {
		const iban = payload.props.iban?.match(/.{1,4}/g)?.join(' ').toUpperCase() || payload.props.iban?.toUpperCase();
		if (iban) {
			const ibanLangI18nKey = 'paypass.iban';
			const ibanHeaderLoc = getPaypassLocalizedString(ibanLangI18nKey);
			textMods.push({
				id: 'iban',
				header: ibanHeaderLoc?.defaultValue || 'IBAN',
				headerI18nKey: ibanLangI18nKey,
				body: iban,
				onPass: false
			});
		}
		const bic = payload.props.bic?.toUpperCase();
		if (bic) {
			const bicLangI18nKey = 'paypass.bic';
			const bicHeaderLoc = getPaypassLocalizedString(bicLangI18nKey);
			textMods.push({
				id: 'bic',
				header: bicHeaderLoc?.defaultValue || 'BIC',
				headerI18nKey: bicLangI18nKey,
				body: bic,
				onPass: false
			});
		}
		const receiverName = payload.props.params?.receiverName?.value;
		if (receiverName) {
			const receiverNameLangI18nKey = 'paypass.beneficiary';
			const receiverNameHeaderLoc = getPaypassLocalizedString(receiverNameLangI18nKey);
			textMods.push({
				id: 'beneficiary',
				header: receiverNameHeaderLoc?.defaultValue || 'Beneficiary',
				headerI18nKey: receiverNameLangI18nKey,
				body: receiverName,
				onPass: false
			});
		}
		const messageText = payload.props.params?.message?.value;
		if (messageText) {
			const messageLangI18nKey = 'paypass.message';
			const messageHeaderLoc = getPaypassLocalizedString(messageLangI18nKey);
			textMods.push({
				id: 'message',
				header: messageHeaderLoc?.defaultValue || 'Message',
				headerI18nKey: messageLangI18nKey,
				body: messageText,
				onPass: false
			});
		}
	} else if (payload.props.network === 'ach') {
		const accountNumber = payload.props.accountNumber;
		if (accountNumber) {
			const accountNumberLangI18nKey = 'paypass.accountNumber';
			const accountNumberHeaderLoc = getPaypassLocalizedString(accountNumberLangI18nKey);
			textMods.push({
				id: 'accountNumber',
				header: accountNumberHeaderLoc?.defaultValue || 'Account Number',
				headerI18nKey: accountNumberLangI18nKey,
				body: accountNumber,
				onPass: false
			});
		}
		const routingNumber = payload.props.routingNumber?.toUpperCase();
		if (routingNumber) {
			const routingNumberLangI18nKey = 'paypass.routingNumber';
			const routingNumberHeaderLoc = getPaypassLocalizedString(routingNumberLangI18nKey);
			textMods.push({
				id: 'routingNumber',
				header: routingNumberHeaderLoc?.defaultValue || 'Routing Number',
				headerI18nKey: routingNumberLangI18nKey,
				body: routingNumber,
				onPass: false
			});
		}
		const receiverName = payload.props.params?.receiverName?.value;
		if (receiverName) {
			const receiverNameLangI18nKey = 'paypass.beneficiary';
			const receiverNameHeaderLoc = getPaypassLocalizedString(receiverNameLangI18nKey);
			textMods.push({
				id: 'beneficiary',
				header: receiverNameHeaderLoc?.defaultValue || 'Beneficiary',
				headerI18nKey: receiverNameLangI18nKey,
				body: receiverName,
				onPass: false
			});
		}
	} else if (payload.props.network === 'upi') {
		const accountAlias = payload.props.accountAlias;
		if (accountAlias) {
			const accountAliasLangI18nKey = 'paypass.accountAlias';
			const accountAliasHeaderLoc = getPaypassLocalizedString(accountAliasLangI18nKey);
			textMods.push({
				id: 'accountAlias',
				header: accountAliasHeaderLoc?.defaultValue || 'Account Alias',
				headerI18nKey: accountAliasLangI18nKey,
				body: accountAlias,
				onPass: false
			});
		}
		const receiverName = payload.props.params?.receiverName?.value;
		if (receiverName) {
			const receiverNameLangI18nKey = 'paypass.beneficiary';
			const receiverNameHeaderLoc = getPaypassLocalizedString(receiverNameLangI18nKey);
			textMods.push({
				id: 'beneficiary',
				header: receiverNameHeaderLoc?.defaultValue || 'Beneficiary',
				headerI18nKey: receiverNameLangI18nKey,
				body: receiverName,
				onPass: false
			});
		}
		const messageText = payload.props.params?.message?.value;
		if (messageText) {
			const messageLangI18nKey = 'paypass.message';
			const messageHeaderLoc = getPaypassLocalizedString(messageLangI18nKey);
			textMods.push({
				id: 'message',
				header: messageHeaderLoc?.defaultValue || 'Message',
				headerI18nKey: messageLangI18nKey,
				body: messageText,
				onPass: false
			});
		}
	} else if (payload.props.network === 'pix') {
		const accountAlias = payload.props.accountAlias;
		if (accountAlias) {
			const accountAliasLangI18nKey = 'paypass.accountAlias';
			const accountAliasHeaderLoc = getPaypassLocalizedString(accountAliasLangI18nKey);
			textMods.push({
				id: 'accountAlias',
				header: accountAliasHeaderLoc?.defaultValue || 'Account Alias',
				headerI18nKey: accountAliasLangI18nKey,
				body: accountAlias,
				onPass: false
			});
		}
		const receiverName = payload.props.params?.receiverName?.value;
		if (receiverName) {
			const receiverNameLangI18nKey = 'paypass.beneficiary';
			const receiverNameHeaderLoc = getPaypassLocalizedString(receiverNameLangI18nKey);
			textMods.push({
				id: 'beneficiary',
				header: receiverNameHeaderLoc?.defaultValue || 'Beneficiary',
				headerI18nKey: receiverNameLangI18nKey,
				body: receiverName,
				onPass: false
			});
		}
		const idText = payload.props.params?.id?.value;
		if (idText) {
			const idLangI18nKey = 'paypass.id';
			const idHeaderLoc = getPaypassLocalizedString(idLangI18nKey);
			textMods.push({
				id: 'id',
				header: idHeaderLoc?.defaultValue || 'ID',
				headerI18nKey: idLangI18nKey,
				body: idText,
				onPass: false
			});
		}
		const messageText = payload.props.params?.message?.value;
		if (messageText) {
			const messageLangI18nKey = 'paypass.message';
			const messageHeaderLoc = getPaypassLocalizedString(messageLangI18nKey);
			textMods.push({
				id: 'message',
				header: messageHeaderLoc?.defaultValue || 'Message',
				headerI18nKey: messageLangI18nKey,
				body: messageText,
				onPass: false
			});
		}
	} else if (payload.props.network === 'bic') {
		const bic = payload.props.bic?.toUpperCase();
		if (bic) {
			const bicLangI18nKey = 'paypass.bicOroric';
			const bicHeaderLoc = getPaypassLocalizedString(bicLangI18nKey);
			textMods.push({
				id: 'bic',
				header: bicHeaderLoc?.defaultValue || 'BIC / ORIC',
				headerI18nKey: bicLangI18nKey,
				body: bic,
				onPass: false
			});
		}
	} else if (payload.props.network === 'intra') {
		const bic = payload.props.bic?.toUpperCase();
		if (bic) {
			const bicLangI18nKey = 'paypass.bicOroric';
			const bicHeaderLoc = getPaypassLocalizedString(bicLangI18nKey);
			textMods.push({
				id: 'bic',
				header: bicHeaderLoc?.defaultValue || 'BIC / ORIC',
				headerI18nKey: bicLangI18nKey,
				body: bic,
				onPass: false
			});
		}
		const intraId = payload.props.id;
		if (intraId) {
			const intraIdLangI18nKey = 'paypass.accountId';
			const intraIdHeaderLoc = getPaypassLocalizedString(intraIdLangI18nKey);
			textMods.push({
				id: 'id',
				header: intraIdHeaderLoc?.defaultValue || 'Account ID',
				headerI18nKey: intraIdLangI18nKey,
				body: intraId,
				onPass: false
			});
		}
		const receiverName = payload.props.params?.receiverName?.value;
		if (receiverName) {
			const receiverNameLangI18nKey = 'paypass.beneficiary';
			const receiverNameHeaderLoc = getPaypassLocalizedString(receiverNameLangI18nKey);
			textMods.push({
				id: 'beneficiary',
				header: receiverNameHeaderLoc?.defaultValue || 'Beneficiary',
				headerI18nKey: receiverNameLangI18nKey,
				body: receiverName,
				onPass: false
			});
		}
		const messageText = payload.props.params?.message?.value;
		if (messageText) {
			const messageLangI18nKey = 'paypass.message';
			const messageHeaderLoc = getPaypassLocalizedString(messageLangI18nKey);
			textMods.push({
				id: 'message',
				header: messageHeaderLoc?.defaultValue || 'Message',
				headerI18nKey: messageLangI18nKey,
				body: messageText,
				onPass: false
			});
		}
	} else if (payload.props.network === 'void') {
		const receiverName = payload.props.params?.receiverName?.value;
		if (receiverName) {
			const receiverNameLangI18nKey = 'paypass.beneficiary';
			const receiverNameHeaderLoc = getPaypassLocalizedString(receiverNameLangI18nKey);
			textMods.push({ id: 'beneficiary', header: receiverNameHeaderLoc?.defaultValue || 'Beneficiary',
				headerI18nKey: receiverNameLangI18nKey,
				body: receiverName,
				onPass: false
			});
		}
		const messageText = payload.props.params?.message?.value;
		if (messageText) {
			const messageLangI18nKey = 'paypass.message';
			const messageHeaderLoc = getPaypassLocalizedString(messageLangI18nKey);
			textMods.push({ id: 'message', header: messageHeaderLoc?.defaultValue || 'Message',
				headerI18nKey: messageLangI18nKey,
				body: messageText,
				onPass: false
			});
		}
	}

	// Swap
	if (payload.swap) {
		const swapLangI18nKey = 'paypass.swapFor';
		const swapHeaderLoc = getPaypassLocalizedString(swapLangI18nKey);
		textMods.push({
			id: 'swap',
			header: swapHeaderLoc?.defaultValue || 'Swap for',
			headerI18nKey: swapLangI18nKey,
			body: payload.swap,
			onPass: false
		});
	}

	// Split payment
	if (payload.splitPayment && payload.splitPayment.value > 0) {
		const splitLangI18nKey = 'paypass.split';
		const splitHeaderLoc = getPaypassLocalizedString(splitLangI18nKey);

		textMods.push({
			id: 'split',
			header: splitHeaderLoc?.defaultValue || 'Split',
			headerI18nKey: splitLangI18nKey,
			body: rtl ? `${payload.splitPayment.address} ← ${payload.splitPayment.isPercent ? payload.splitPayment.value.toString() + '%' : payload.splitPayment.formattedValue}` : `${payload.splitPayment.isPercent ? payload.splitPayment.value.toString() + '%' : payload.splitPayment.formattedValue} ➜ ${payload.splitPayment.address}`,
			onPass: false
		});
	}

	// Debug mode
	if (isDebug) {
		textMods.push({
			id: 'debug',
			header: 'Debug',
			body: JSON.stringify(payload),
			onPass: false
		});
	}

	const normalizedTextModules = textMods
		.map(m => {
			const header = m.header.trim();
			const body = String(m.body ?? '').trim();

			const headerLoc = m.headerI18nKey ? getPaypassLocalizedString(m.headerI18nKey) : undefined;
			const localizedHeader = headerLoc ? toGoogleLocalizedString(headerLoc, 'en') : undefined;

			const bodyLoc = m.bodyI18nKey ? getPaypassLocalizedString(m.bodyI18nKey) : undefined;
			const localizedBody = bodyLoc ? toGoogleLocalizedString(bodyLoc, 'en') : undefined;

			return {
				...(m.id ? { id: m.id } : {}),
				header,
				body,
				...(localizedHeader ? { localizedHeader } : {}),
				...(localizedBody ? { localizedBody } : {})
			};
		})
		.filter(m => m.header.length > 0 && m.body.length > 0);

	// ---------------- Card Row Template ----------------
	const rows: any[] = [];

	// Look up per-field visibility
	const purposeMod = textMods.find(m => m.id === 'purpose');
	const amountMod = textMods.find(m => m.id === 'amount');

	const hasItem = !!(purposeMod?.onPass && purposeText && purposeText.trim().length);
	const hasAmount = !!(amountMod?.onPass && amountObject && amountObject.value && amountObject.value.trim().length);

	// Item / Amount row only if their own onPass is true
	if (hasItem || hasAmount) {
		const row: any = { twoItems: {} as any };

		if (!rtl) {
			// LTR: Item on the left, Amount on the right
			if (hasItem) {
				row.twoItems.startItem = {
					firstValue: {
						fields: [{ fieldPath: "object.textModulesData['purpose']" }]
					}
				};
			}
			if (hasAmount) {
				row.twoItems.endItem = {
					firstValue: {
						fields: [{ fieldPath: "object.textModulesData['amount']" }]
					}
				};
			}
		} else {
			// RTL: swap sides
			if (hasAmount) {
				row.twoItems.startItem = {
					firstValue: {
						fields: [{ fieldPath: "object.textModulesData['amount']" }]
					}
				};
			}
			if (hasItem) {
				row.twoItems.endItem = {
					firstValue: {
						fields: [{ fieldPath: "object.textModulesData['purpose']" }]
					}
				};
			}
		}

		rows.push(row);
	}

	const callbackUrl = publicEnv.PUBLIC_GW_CALLBACK_URL ? publicEnv.PUBLIC_GW_CALLBACK_URL : `${payload.linkBaseUrl}/pass/gw/callback`; // For later if needed
	const updateRequestUrl = publicEnv.PUBLIC_GW_UPDATE_REQUEST_URL ? publicEnv.PUBLIC_GW_UPDATE_REQUEST_URL : `${payload.linkBaseUrl}/pass/gw/update`; // For later if needed
	const enableSmartTap = payload.enableSmartTap ? payload.enableSmartTap : true;

	// Process merchantLocations: validate and limit to 10 items max
	const merchantLocations = (() => {
		const locations = payload.merchantLocations || [];
		if (!Array.isArray(locations) || locations.length === 0) return undefined;

		const validLocations = locations
			.filter((loc: any) => {
				// Validate that location has latitude and longitude
				if (typeof loc?.latitude !== 'number' || typeof loc?.longitude !== 'number') {
					return false;
				}
				// Validate latitude range: -90.0 to +90.0
				if (loc.latitude < -90.0 || loc.latitude > 90.0) {
					return false;
				}
				// Validate longitude range: -180.0 to +180.0
				if (loc.longitude < -180.0 || loc.longitude > 180.0) {
					return false;
				}
				return true;
			})
			.slice(0, 10) // Limit to 10 items max
			.map((loc: any) => ({
				latitude: loc.latitude,
				longitude: loc.longitude
			}));

		return validLocations.length > 0 ? validLocations : undefined;
	})();

	const gwClass: any = {
		id: fullClassId,
		issuerName: issuerName,
		multipleDevicesAndHoldersAllowedStatus: publicEnv.PUBLIC_GW_MULTIPLE_STATUS ? publicEnv.PUBLIC_GW_MULTIPLE_STATUS : 'ONE_USER_ALL_DEVICES',
		...(hexBackgroundColor ? { hexBackgroundColor } : {}),
		...(rows.length > 0 ? {
			classTemplateInfo: {
				cardTemplateOverride: {
					cardRowTemplateInfos: rows
				}
			}
		} : {}),
		...(enableSmartTap ? { enableSmartTap: true } : {}),
		...(payload.redemptionIssuers?.length
			? { redemptionIssuers: payload.redemptionIssuers }
			: {}),
		...(merchantLocations ? { merchantLocations } : {}),
		...(callbackUrl || updateRequestUrl
			? {
				callbackOptions: {
					...(callbackUrl ? { url: callbackUrl } : {}),
					...(updateRequestUrl ? { updateRequestUrl: updateRequestUrl } : {})
				}
				}
			: {})
	};

	const validTimeInterval = (() => {
		const raw = payload.expirationDate;
		if (!raw) return undefined;

		const date = new Date(raw);
		if (Number.isNaN(date.getTime())) return undefined;

		// Always use full ISO 8601 format with time and timezone offset
		const iso = date.toISOString();

		return {
			end: {
				date: iso
			}
		};
	})();

	// Calculate notifications based on expiration date
	const notifications = calculateNotifications(payload.expirationDate);

	const paypassLangI18nKey = 'paypass.paypass';
	const paypassHeaderLoc = getPaypassLocalizedString(paypassLangI18nKey);
	const paymentLangI18nKey = 'paypass.payment';
	const paymentHeaderLoc = getPaypassLocalizedString(paymentLangI18nKey);

	const barcodeAlternateText =
		donate
			? getPaypassLocalizedValue('paypass.scanToDonate', locale) || 'Scan to donate'
			: getPaypassLocalizedValue('paypass.scanToPay', locale) || 'Scan to pay';

	const normalizedBarcode = barcode && typeof barcode === 'object'
		? {
			...barcode,
			alternateText: barcodeAlternateText
		}
		: {
			type: 'qrCode',
			value: payload.basicLink,
			alternateText: barcodeAlternateText
		};

	const gwObject: any = {
		id: payload.id,
		classId: fullClassId,
		state: 'active',
		...(validTimeInterval ? {
			validTimeInterval
		} : {}),

		appLinkData: {
			displayText: { defaultValue: { language: locale, value: getPaypassLocalizedValue('paypass.pay', locale) || 'Pay' } },
			webAppLinkInfo: {
				appTarget: {
					targetUri: { uri: payload.fullLink, description: getPaypassLocalizedValue('paypass.pay', locale) || 'Pay' }
				}
			}
		},

		cardTitle: { defaultValue: { language: locale, value: (orgName && orgName.trim()) || paypassHeaderLoc?.defaultValue || 'PayPass' } },

		header: { defaultValue: { language: locale, value: (titleText && titleText.trim()) } },
		...(subheaderText && subheaderText.trim() ? {
			subheader: { defaultValue: { language: locale, value: subheaderText.trim() } }
		} : {}),

		...(logoUrl ? { logo: { sourceUri: { uri: logoUrl } } } : {}),
		...(heroUrl ? { heroImage: { sourceUri: { uri: heroUrl } } } : {}),
		...(hexBackgroundColor ? { hexBackgroundColor } : {}),

		barcode: normalizedBarcode,

		smartTapRedemptionValue: payload.basicLink,

		locations: payload.props?.params?.loc?.lat && payload.props?.params?.loc?.lon ? [
			{
				latitude: payload.props.params.loc.lat,
				longitude: payload.props.params.loc.lon,
				relevantText: payload.props.params?.message?.value
					? payload.props.params.message.value
					: getPaypassLocalizedValue('paypass.paymentLocation', locale) || 'Payment Location'
			}
		] : [],

		textModulesData: normalizedTextModules,

		linksModuleData: {
			uris: [
				...(payload.props?.params?.loc?.lat && payload.props?.params?.loc?.lon ? [{
					kind: 'walletobjects#uri',
					uri: `https://www.google.com/maps/dir/?api=1&origin=Current+Location&destination=${payload.props.params.loc.lat},${payload.props.params.loc.lon}`,
					description: getPaypassLocalizedValue('paypass.navigateToLocation', locale) || 'Navigate to Location'
				}] : []),
				...(payload.explorerUrl ? [{
					kind: 'walletobjects#uri',
					uri: payload.explorerUrl,
					description: getPaypassLocalizedValue('paypass.viewTransactions', locale) || 'View Transactions'
				}] : []),
				...(payload.externalLink ? [{
					kind: 'walletobjects#uri',
					uri: payload.externalLink,
					description: getPaypassLocalizedValue('paypass.onlinePaypass', locale) || 'Online PayPass'
				}] : []),
				...(payload.props.network === 'xcb' ? [{
					kind: 'walletobjects#uri',
					uri: `${payload.linkBaseUrl}/card`,
					description: getPaypassLocalizedValue('paypass.topUpCryptoCard', locale) || 'Top up Crypto Card'
				}] : []),
				...(payload.swapUrl ? [{
					kind: 'walletobjects#uri',
					uri: payload.swapUrl,
					description: getPaypassLocalizedValue('paypass.swapCurrency', locale) || 'Swap Currency'
				}] : []),
				...(payload.proUrl && payload.props.network == 'xcb' ? [{
					kind: 'walletobjects#uri',
					uri: payload.proUrl,
					description: getPaypassLocalizedValue('paypass.activatePro', locale) || 'Activate Pro'
				}] : []),
				...(payload.props.network === 'xcb' ? [{
					kind: 'walletobjects#uri',
					uri: 'sms:+12019715152',
					description: getPaypassLocalizedValue('paypass.sendOfflineTransaction', locale) || 'Send Offline Transaction'
				}] : [])
			]
		},

		imageModulesData: [
			...(iconUrl ? [{
				id: 'icon',
				mainImage: {
					sourceUri: { uri: iconUrl },
					contentDescription: { defaultValue: { language: 'en-US', value: 'Icon' } }
				}
			}] : [])
		],

		...(notifications ? { notifications } : {})
	};

	// ---------------- Sign JWT ----------------
	const now = Math.floor(Date.now() / 1000);
	const jwtPayload = {
		iss: saEmail,
		aud: 'google',
		typ: 'savetowallet',
		iat: now,
		payload: {
			genericClasses: [gwClass],
			genericObjects: [gwObject]
		}
	};

	const alg = 'RS256';
	const privateKey = await jose.importPKCS8(saPrivateKeyPem, alg);
	const jwt = await new jose.SignJWT(jwtPayload as any)
		.setProtectedHeader({ alg, typ: 'JWT' })
		.sign(privateKey);

	return {
		saveUrl: `https://pay.google.com/gp/v/save/${jwt}`,
		classId: fullClassId,
		gwObject,
		gwClass
	};
}
