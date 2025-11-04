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
	nameLabel?: string;
	nameText?: string;
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
		amountText,
		nameLabel,
		nameText,
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

		// Build address text for display on card
	const addressText = payload.props.destination ? (() => {
		const addr = payload.props.destination;
		if (payload.props.network === 'xcb' || payload.props.network === 'xab' || payload.props.network === 'xce') {
			return addr.match(/.{1,4}/g)?.join(' ').toUpperCase() || addr.toUpperCase();
		}
		return addr.match(/.{1,4}/g)?.join(' ') || addr;
	})() : null;

	// Build all text modules - will be displayed both on card (via template) and in details
	const allTextModules: Array<{ id?: string; header: string; body: string }> = [];

	// Address module (index 0)
	if (addressText) {
		allTextModules.push({ id: 'address', header: 'Address', body: addressText });
	}

	// Name module (index 1 if address exists, else 0)
	if (nameLabel && nameText) {
		allTextModules.push({ id: 'name', header: nameLabel, body: nameText });
	}

	// Network module (details only)
	if (payload.props.network) {
		const networkText = payload.props.network.toUpperCase() + (payload.chainId ? ` / Chain: ${payload.chainId}` : '');
		allTextModules.push({ header: 'Network', body: networkText });
	}

	// Normalize text modules
	const normalizedTextModules = allTextModules
		.map(m => ({
			...(m.id ? { id: m.id } : {}),
			header: (m.header && String(m.header).trim()),
			body: (m.body && String(m.body).trim())
		}))
		.filter(m => m.header.length > 0 && m.body.length > 0);

		// Build card row template info - try referencing by ID
	const cardRowTemplateInfos: any[] = [];

	if (addressText) {
		cardRowTemplateInfos.push({
			twoColumns: {
				startColumn: {
					firstValue: {
						fields: [
							{
								fieldPath: 'textModulesData.address.header'
							}
						]
					},
					secondValue: {
						fields: [
							{
								fieldPath: 'textModulesData.address.body'
							}
						]
					}
				}
			}
		});
	}

	if (nameLabel && nameText) {
		cardRowTemplateInfos.push({
			twoColumns: {
				startColumn: {
					firstValue: {
						fields: [
							{
								fieldPath: 'textModulesData.name.header'
							}
						]
					},
					secondValue: {
						fields: [
							{
								fieldPath: 'textModulesData.name.body'
							}
						]
					}
				}
			}
		});
	}

	const gwClass: any = {
		id: classId,
		issuerName: payload.companyName || 'PayPass',
		...(hexBackgroundColor ? { hexBackgroundColor } : {}),
		...(cardRowTemplateInfos.length > 0 ? {
			classTemplateInfo: {
				cardRowTemplateInfos: cardRowTemplateInfos
			}
		} : {})
	};

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

		textModulesData: normalizedTextModules.map((m: { id?: string; header: string; body: string }) => ({
			...(m.id ? { id: m.id } : {}),
			header: m.header,
			body: m.body
		})),

		linksModuleData: {
			uris: [
				// Navigation to location
				...(payload.props.params.lat?.value && payload.props.params.lon?.value ? [{ kind: 'walletobjects#uri', uri: `geo:${payload.props.params.lat?.value},${payload.props.params.lon?.value}`, description: 'Navigate to location' }] : []),
				// View transactions
				...(payload.explorerUrl ? [{ kind: 'walletobjects#uri', uri: payload.explorerUrl, description: 'View transactions' }] : []),
				// Online PayPass
				...(payload.externalLink ? [{ kind: 'walletobjects#uri', uri: payload.externalLink, description: 'Online PayPass' }] : []),
				// Send to Card
				...(payload.props.network === 'xcb' ? [{ kind: 'walletobjects#uri', uri: `https://card.payto.money`, description: 'Send to CryptoCard' }] : []),
				// Swap Currency
				{ kind: 'walletobjects#uri', uri: `https://swap.payto.money`, description: 'Swap Currency' },
				// Activate Pro
				...(payload.proUrl ? [{ kind: 'walletobjects#uri', uri: payload.proUrl, description: 'Activate Pro' }] : []),
				// Send Offline Transaction
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
