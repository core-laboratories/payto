import * as jose from 'jose';
import { env as publicEnv } from '$env/dynamic/public';
import { calculateNotifications } from './paypass-notifications.helper';
import { getPaypassLocalizedString, type LocalizedText } from './paypass-i18n.helper';

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
	amountLabel?: string;
	amountText?: string | null;
	purposeLabel?: string;
	purposeText?: string;
	subheaderText?: string;
	hexBackgroundColor?: string;
	barcode: any;
	donate?: boolean;
	rtl?: boolean;	// Right-to-left support (manual swap)
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
		amountLabel,
		amountText,
		purposeLabel,
		purposeText,
		subheaderText,
		hexBackgroundColor,
		barcode,
		donate,
		payload,
		rtl = false
	} = config;

	// Validate configuration
	if (!issuerId || !saEmail || !saPrivateKeyPem) {
		throw new Error('Google signing configuration missing (issuer/service account).');
	}

	// ---------------- Address formatting ----------------
	const addressText = payload.props.destination ? (() => {
		const addr = payload.props.destination;
		if (['xcb', 'xce'].includes(payload.props.network)) {
			return addr.match(/.{1,4}/g)?.join(' ').toUpperCase() || addr.toUpperCase();
		} else if (payload.props.network === "other" && ['xab'].includes(payload.props.other)) {
			return addr.match(/.{1,4}/g)?.join(' ').toUpperCase() || addr.toUpperCase();
		}
		return addr.match(/.{1,4}/g)?.join(' ') || addr;
	})() : null;

	// Defaults
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

	if (purposeLabel && purposeText) {
		const purposeLangI18nKey = 'paypass.purpose';
		const purposeHeaderLoc = getPaypassLocalizedString(purposeLangI18nKey);
		textMods.push({
			id: 'purpose',
			header: purposeHeaderLoc?.defaultValue || 'Purpose',
			headerI18nKey: purposeLangI18nKey,
			body: purposeText,
			onPass: true
		});
	}

	if (amountText) {
		// If a custom amountLabel is provided, we treat it as literal (no i18n key).
		// Otherwise, use paypass.amount translations.
		const amountLangI18nKey = 'paypass.amount';
		const amountHeaderLoc = getPaypassLocalizedString(amountLangI18nKey);
		const useAmountI18n = !amountLabel;
		const headerText = amountLabel || amountHeaderLoc?.defaultValue || 'Amount';

		textMods.push({
			id: 'amount',
			header: headerText,
			headerI18nKey: useAmountI18n ? amountLangI18nKey : undefined,
			body: amountText,
			onPass: true
		});
	}

	// Swap
	if (payload.swap) {
		textMods.push({
			id: 'swap',
			header: 'Swap for',
			body: payload.swap,
			onPass: false
		});
	}

	// Split payment
	if (payload.splitPayment) {
		textMods.push({
			id: 'split',
			header: 'Split',
			body: `${payload.splitPayment.isPercent ? payload.splitPayment.value.toString() + '%' : payload.splitPayment.formattedValue} to ${payload.splitPayment.address}`,
			onPass: false
		});
	}

	if (payload.props.network === 'iban') {
		const iban = payload.props.iban?.match(/.{1,4}/g)?.join(' ').toUpperCase() || payload.props.iban?.toUpperCase();
		if (iban) textMods.push({ id: 'iban', header: 'IBAN', body: iban, onPass: false });
		const bic = payload.props.bic?.toUpperCase();
		if (bic) textMods.push({ id: 'bic', header: 'BIC', body: bic, onPass: false });
		const receiverName = payload.props.params?.receiverName?.value;
		if (receiverName) textMods.push({ id: 'beneficiary', header: 'Beneficiary', body: receiverName, onPass: false });
		const messageText = payload.props.params?.message?.value;
		if (messageText) textMods.push({ id: 'message', header: 'Message', body: messageText, onPass: false });
	} else if (payload.props.network === 'ach') {
		const accountNumber = payload.props.accountNumber;
		if (accountNumber) textMods.push({ id: 'accountNumber', header: 'Account Number', body: accountNumber, onPass: false });
		const routingNumber = payload.props.routingNumber?.toUpperCase();
		if (routingNumber) textMods.push({ id: 'routingNumber', header: 'Routing Number', body: routingNumber, onPass: false });
		const receiverName = payload.props.params?.receiverName?.value;
		if (receiverName) textMods.push({ id: 'beneficiary', header: 'Beneficiary', body: receiverName, onPass: false });
	} else if (payload.props.network === 'upi') {
		const accountAlias = payload.props.accountAlias;
		if (accountAlias) textMods.push({ id: 'accountAlias', header: 'Account Alias', body: accountAlias, onPass: false });
		const receiverName = payload.props.params?.receiverName?.value;
		if (receiverName) textMods.push({ id: 'beneficiary', header: 'Beneficiary', body: receiverName, onPass: false });
		const messageText = payload.props.params?.message?.value;
		if (messageText) textMods.push({ id: 'message', header: 'Message', body: messageText, onPass: false });
	} else if (payload.props.network === 'pix') {
		const accountAlias = payload.props.accountAlias;
		if (accountAlias) textMods.push({ id: 'accountAlias', header: 'Account Alias', body: accountAlias, onPass: false });
		const receiverName = payload.props.params?.receiverName?.value;
		if (receiverName) textMods.push({ id: 'beneficiary', header: 'Beneficiary', body: receiverName, onPass: false });
		const idText = payload.props.params?.id?.value;
		if (idText) textMods.push({ id: 'id', header: 'ID', body: idText, onPass: false });
		const messageText = payload.props.params?.message?.value;
		if (messageText) textMods.push({ id: 'message', header: 'Message', body: messageText, onPass: false });
	} else if (payload.props.network === 'bic') {
		const bic = payload.props.bic?.toUpperCase();
		if (bic) textMods.push({ id: 'bic', header: 'BIC / ORIC', body: bic, onPass: false });
	} else if (payload.props.network === 'intra') {
		const bic = payload.props.bic?.toUpperCase();
		if (bic) textMods.push({ id: 'bic', header: 'BIC / ORIC', body: bic, onPass: false });
		const intraId = payload.props.id;
		if (intraId) textMods.push({ id: 'id', header: 'Account ID', body: intraId, onPass: false });
		const receiverName = payload.props.params?.receiverName?.value;
		if (receiverName) textMods.push({ id: 'beneficiary', header: 'Beneficiary', body: receiverName, onPass: false });
		const messageText = payload.props.params?.message?.value;
		if (messageText) textMods.push({ id: 'message', header: 'Message', body: messageText, onPass: false });
	} else if (payload.props.network === 'void') {
		const receiverName = payload.props.params?.receiverName?.value;
		if (receiverName) textMods.push({ id: 'beneficiary', header: 'Beneficiary', body: receiverName, onPass: false });
		const messageText = payload.props.params?.message?.value;
		if (messageText) textMods.push({ id: 'message', header: 'Message', body: messageText, onPass: false });
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
	const hasAmount = !!(amountMod?.onPass && amountText && amountText.trim().length);

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

	const callbackUrl = publicEnv.PUBLIC_GW_CALLBACK_URL ? publicEnv.PUBLIC_GW_CALLBACK_URL : `${payload.linkBaseUrl}/pass/gw/callback`;
	const updateRequestUrl = publicEnv.PUBLIC_GW_UPDATE_REQUEST_URL ? publicEnv.PUBLIC_GW_UPDATE_REQUEST_URL : `${payload.linkBaseUrl}/pass/gw/update`;
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
		id: classId,
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

	const gwObject: any = {
		id: payload.id,
		classId: classId,
		state: 'active',
		...(validTimeInterval ? {
			validTimeInterval
		} : {}),

		appLinkData: {
			displayText: { defaultValue: { language: 'en-US', value: 'Pay' } },
			webAppLinkInfo: {
				appTarget: {
					targetUri: { uri: payload.fullLink, description: 'Pay' }
				}
			}
		},

		cardTitle: { defaultValue: { language: 'en-US', value: (orgName && orgName.trim()) || 'PayPass' } },
		header: { defaultValue: { language: 'en-US', value: (titleText && titleText.trim()) || 'Payment' } },
		...(subheaderText && subheaderText.trim() ? {
			subheader: { defaultValue: { language: 'en-US', value: subheaderText.trim() } }
		} : {}),

		...(logoUrl ? { logo: { sourceUri: { uri: logoUrl } } } : {}),
		...(heroUrl ? { heroImage: { sourceUri: { uri: heroUrl } } } : {}),
		...(hexBackgroundColor ? { hexBackgroundColor } : {}),

		barcode: barcode || {
			type: 'qrCode',
			value: payload.basicLink,
			alternateText: donate ? 'Scan to donate' : 'Scan to pay'
		},

		smartTapRedemptionValue: payload.basicLink,

		locations: payload.props.params.loc?.lat && payload.props.params.loc.lon ? [
			{
				latitude: payload.props.params.loc.lat,
				longitude: payload.props.params.loc.lon,
				relevantText: payload.props.params.message?.value
					? payload.props.params.message.value
					: 'Payment Location'
			}
		] : [],

		textModulesData: normalizedTextModules,

		linksModuleData: {
			uris: [
				...(payload.props.params.loc?.lat && payload.props.params.loc.lon ? [{
					kind: 'walletobjects#uri',
					uri: `https://www.google.com/maps/dir/?api=1&origin=Current+Location&destination=${payload.props.params.loc.lat},${payload.props.params.loc.lon}`,
					description: 'Navigate to Location'
				}] : []),
				...(payload.explorerUrl ? [{
					kind: 'walletobjects#uri',
					uri: payload.explorerUrl,
					description: 'View Transactions'
				}] : []),
				...(payload.externalLink ? [{
					kind: 'walletobjects#uri',
					uri: payload.externalLink,
					description: 'Online PayPass'
				}] : []),
				...(payload.props.network === 'xcb' ? [{
					kind: 'walletobjects#uri',
					uri: `${payload.linkBaseUrl}/card`,
					description: 'Top up Crypto Card'
				}] : []),
				{ kind: 'walletobjects#uri', uri: payload.swapUrl, description: 'Swap Currency' },
				...(payload.proUrl && payload.props.network == 'xcb' ? [{
					kind: 'walletobjects#uri',
					uri: payload.proUrl,
					description: 'Activate Pro'
				}] : []),
				...(payload.props.network === 'xcb' ? [{
					kind: 'walletobjects#uri',
					uri: 'sms:+12019715152',
					description: 'Send Offline Transaction'
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
		classId,
		gwObject,
		gwClass
	};
}
