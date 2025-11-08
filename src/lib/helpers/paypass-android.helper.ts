import * as jose from 'jose';

export interface GoogleWalletPayPassConfig {
	issuerId: string | undefined;
	saEmail: string | undefined;
	saPrivateKeyPem: string | undefined;
	classId: string;
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

export async function buildGoogleWalletPayPassSaveLink(config: GoogleWalletPayPassConfig): Promise<GoogleWalletPayPassResult> {
	const {
		issuerId,
		saEmail,
		saPrivateKeyPem,
		classId,
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
		if (['xcb', 'xab', 'xce'].includes(payload.props.network)) {
			return addr.match(/.{1,4}/g)?.join(' ').toUpperCase() || addr.toUpperCase();
		}
		return addr.match(/.{1,4}/g)?.join(' ') || addr;
	})() : null;

	// Defaults
	const issuerName = payload.companyName || 'PayPass';

	// ---------------- Text Modules ----------------
	const textMods: Array<{ id?: string; header: string; body: string }> = [];

	if (addressText) textMods.push({ id: 'address', header: 'Address', body: addressText });
	if (payload.props.network) {
		const networkText = payload.props.network.toUpperCase() + (payload.chainId ? ` / Chain: ${payload.chainId}` : '');
		textMods.push({ header: 'Network', body: networkText });
	}
	if (purposeLabel && purposeText) textMods.push({ id: 'purpose', header: purposeLabel, body: purposeText });
	if (amountText) textMods.push({ id: 'amount', header: amountLabel || 'Amount', body: amountText });

	const normalizedTextModules = textMods
		.map(m => ({
			...(m.id ? { id: m.id } : {}),
			header: String(m.header ?? '').trim(),
			body: String(m.body ?? '').trim()
		}))
		.filter(m => m.header.length > 0 && m.body.length > 0);

	// ---------------- Card Row Template ----------------
	const rows: any[] = [];

	// Item / Amount dynamic row
	const hasItem = !!(purposeLabel && purposeText);
	const hasAmount = !!amountText;

	if (hasItem || hasAmount) {
		const row: any = { twoItems: {} as any };

		// Prepare left/right items depending on RTL flag
		const left = rtl ? 'amount' : 'purpose';
		const right = rtl ? 'purpose' : 'amount';

		if (hasItem || hasAmount) {
			if ((rtl && hasAmount) || (!rtl && hasItem)) {
				row.twoItems.startItem = {
					firstValue: {
						fields: [{ fieldPath: `object.textModulesData['${left}'].body` }]
					}
				};
			}
			if ((rtl && hasItem) || (!rtl && hasAmount)) {
				row.twoItems.endItem = {
					firstValue: {
						fields: [{ fieldPath: `object.textModulesData['${right}'].body` }]
					}
				};
			}
		}

		rows.push(row);
	}

	const gwClass: any = {
		id: classId,
		issuerName: issuerName,
		...(hexBackgroundColor ? { hexBackgroundColor } : {}),
		...(rows.length > 0 ? {
			classTemplateInfo: {
				cardTemplateOverride: {
					cardRowTemplateInfos: rows
				}
			}
		} : {})
	};

	// ---------------- Object ----------------
	const gwObject: any = {
		id: payload.id,
		classId: classId,
		state: 'active',
		...(payload.expirationDate ? {
			validTimeInterval: { end: payload.expirationDate }
		} : {}),

		appLinkData: {
			displayText: { defaultValue: { language: 'en-US', value: 'Pay' } },
			webAppLinkInfo: {
				appTarget: {
					targetUri: { uri: payload.fullLink, description: 'Pay' }
				}
			}
		},

		cardTitle: { defaultValue: { language: 'en-US', value: issuerName } },
		header: { defaultValue: { language: 'en-US', value: titleText } },
		...(subheaderText ? {
			subheader: { defaultValue: { language: 'en-US', value: subheaderText } }
		} : {}),

		...(logoUrl ? { logo: { sourceUri: { uri: logoUrl } } } : {}),
		...(heroUrl ? { heroImage: { sourceUri: { uri: heroUrl } } } : {}),
		...(hexBackgroundColor ? { hexBackgroundColor } : {}),

		barcode: barcode || {
			type: 'qrCode',
			value: payload.basicLink,
			alternateText: donate ? 'Scan to donate' : 'Scan to pay' // This is backup defaults
		},

		smartTapRedemptionValue: payload.basicLink,

		locations: payload.props.params.lat?.value && payload.props.params.lon?.value ? [
			{
				latitude: payload.props.params.lat?.value,
				longitude: payload.props.params.lon?.value,
				relevantText: payload.props.params.message?.value
					? payload.props.params.message.value
					: 'Payment Location'
			}
		] : [],

		textModulesData: normalizedTextModules.map((m: { id?: string; header: string; body: string }) => ({
			...(m.id ? { id: m.id } : {}),
			header: m.header,
			body: m.body
		})),

		linksModuleData: {
			uris: [
				...(payload.props.params.lat?.value && payload.props.params.lon?.value ? [{
					kind: 'walletobjects#uri',
					uri: `geo:${payload.props.params.lat?.value},${payload.props.params.lon?.value}`,
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
					uri: `${payload.linkBaseUrl}/card/${payload.props.destination}`,
					description: 'Top up Crypto Card'
				}] : []),
				{ kind: 'walletobjects#uri', uri: payload.swapUrl, description: 'Swap Currency' },
				...(payload.proUrl ? [{
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
		]
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
