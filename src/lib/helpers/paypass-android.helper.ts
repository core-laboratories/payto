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
	amountText?: string | null;
	subheaderText?: string;
	hexBackgroundColor?: string;
	barcode: any;
	donate?: boolean;
	payload: any; // Full payload with all data
}

export interface GoogleWalletPayPassResult {
	saveUrl: string;
	classId: string;
	gwObject: any;
	gwClass: any;
}

/**
 * Build Google Wallet PayPass save link by creating a GenericClass and GenericObject,
 * signing them with a JWT, and returning the "Save to Google Wallet" URL
 * @param config - Configuration object with all required parameters
 * @returns Promise with save URL, class ID, and the generated class/object
 * @throws Error if Google Wallet signing configuration is missing
 */
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
		subheaderText,
		hexBackgroundColor,
		barcode,
		donate,
		payload
	} = config;

	// Validate Google Wallet signing configuration
	if (!issuerId || !saEmail || !saPrivateKeyPem) {
		throw new Error('Google signing configuration missing (issuer/service account).');
	}

	// Reuse a stable class (create once; reuse forever). If it doesn't exist,
	// Google will auto-create it via the Save-to-Wallet JWT.
	const gwClass: any = {
		id: classId,
		issuerName: payload.companyName || 'PayPass',
		...(hexBackgroundColor ? { hexBackgroundColor } : {})
	};

	let textModules: Array<{ header: string; body: string }> = [
		...(payload.props.destination ? [{ header: 'Address', body: (() => {
			const addr = payload.props.destination;
			if (payload.props.network === 'xcb' || payload.props.network === 'xab') {
				return addr.match(/.{1,4}/g)?.join(' ').toUpperCase() || addr.toUpperCase();
			}
			return addr;
		})() }] : []),
		...(payload.props.network ? [{ header: 'Network', body: payload.props.network.toUpperCase() + (payload.chainId ? ` / Chain: ${payload.chainId}` : '') }] : [])
	];

	// Normalize text modules
	textModules = textModules
		.map(m => ({
			header: (m.header && String(m.header).trim()),
			body: (m.body && String(m.body).trim())
		}))
		.filter(m => m.header.length > 0 && m.body.length > 0);

	const gwObject: any = {
		id: payload.id,
		classId: classId,
		state: 'active',
		...(payload.expirationDate ? {
			validTimeInterval: {
				end: payload.expirationDate
			}
		} : {}),

		appLinkData: {
			displayText: {
				defaultValue: { language: 'en-US', value: 'Pay' }
			},

			webAppLinkInfo: {
				appTarget: {
					targetUri: {
						uri: payload.fullLink,
						description: 'Pay'
					}
				}
			}

			// If instead you want to open your Android app, use this block
			// (and remove webAppLinkInfo above):
			// androidAppLinkInfo: {
			// 	appTarget: {
			// 		// Prefer packageName when it's your own app
			// 		packageName: 'com.yourcompany.yourapp'
			// 		// or deep link to a specific screen:
			// 		// targetUri: { uri: 'yourapp://rate', description: 'Open app' }
			// 	}
			// }
		},

		cardTitle: { defaultValue: { language: 'en-US', value: payload.companyName || 'PayPass'} },
		header:    { defaultValue: { language: 'en-US', value: titleText } },
		...(subheaderText
			? { subheader: { defaultValue: { language: 'en-US', value: subheaderText } } }
			: {}),

		...(logoUrl ? { logo: { sourceUri: { uri: logoUrl } } } : {}),
		...(heroUrl ? { heroImage: { sourceUri: { uri: heroUrl } } } : {}),
		...(hexBackgroundColor ? { hexBackgroundColor } : {}),

		barcode: barcode || {
			type: 'qrCode',
			value: payload.basicLink,
			alternateText: donate ? 'Scan to donate' : 'Scan to pay'
		},

		smartTapRedemptionValue: payload.basicLink,

		locations: payload.props.params.lat?.value && payload.props.params.lon?.value ? [
			{
				latitude: payload.props.params.lat?.value,
				longitude: payload.props.params.lon?.value,
				relevantText: payload.props.params.message?.value ? payload.props.params.message.value : 'Payment location'
			}
		] : [],

		textModulesData: textModules.map(m => ({ header: m.header, body: m.body })),

		linksModuleData: {
			uris: [
				...(payload.explorerUrl ? [{ kind: 'walletobjects#uri', uri: payload.explorerUrl, description: 'View transactions' }] : []),
				...(payload.props.params.lat?.value && payload.props.params.lon?.value ? [{ kind: 'walletobjects#uri', uri: `geo:${payload.props.params.lat?.value},${payload.props.params.lon?.value}`, description: 'Navigate to location' }] : []),
				...(payload.externalLink ? [{ kind: 'walletobjects#uri', uri: payload.externalLink, description: 'Online PayPass' }] : []),
				...(payload.proUrl ? [{ kind: 'walletobjects#uri', uri: payload.proUrl, description: 'Activate Pro' }] : []),
				{ kind: 'walletobjects#uri', uri: `https://exchange.payto.money`, description: 'Exchange Currency' },
				...(payload.props.network === 'xcb' ? [{ kind: 'walletobjects#uri', uri: 'sms:+12019715152', description: 'Send Offline Transaction' }] : [])
			]
		},

		imageModulesData: [
			...(iconUrl ? [{
				id: 'icon',
				mainImage: {
					sourceUri: { uri: iconUrl },
					contentDescription: { defaultValue: { language: 'en-US', value: 'Icon' } }
				}
			}] : []),
		]
	};

	// Build Save to Google Wallet JWT
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

	return { saveUrl: `https://pay.google.com/gp/v/save/${jwt}`, classId, gwObject, gwClass };
}
