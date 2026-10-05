import { z } from 'zod';
import {
	payQrSchemes,
	serializePayQr,
	validatePayQrIdentifier,
	validatePayQrParameters
} from 'payto-rl';
import type { PayQrCountry } from 'payto-rl';

const optionalText = z
	.string()
	.max(512)
	.refine((value) => !/[\u0000-\u001f\u007f]/.test(value), 'Control characters are not allowed')
	.default('');
export const payQrBaseSchema = z
	.object({
		country: z.string(),
		scheme: z.string(),
		identifier: z.string().min(1, 'Enter the payment identifier'),
		identifierType: z.string(),
		amount: optionalText,
		currency: optionalText,
		receiverName: optionalText,
		reference: optionalText,
		message: optionalText,
		organization: optionalText,
		acquirerId: optionalText,
		recipientType: optionalText,
		merchantId: optionalText,
		acquiringBank: optionalText,
		accountInformation: optionalText,
		billNumber: optionalText,
		storeLabel: optionalText,
		terminalLabel: optionalText,
		merchantMobile: optionalText,
		postalCode: optionalText,
		expiryDate: optionalText,
		amountEditable: optionalText,
		creationTimestamp: optionalText,
		expirationTimestamp: optionalText,

		applicationId: optionalText,
		merchantCity: optionalText,
		mcc: optionalText,
		schemeId: optionalText,
		localName: optionalText,
		paymentMode: z.enum(['', 'p2p', 'p2m']).default(''),
		qrType: z.enum(['', 'static', 'dynamic']).default('')
	})
	.strict();
export type PayQrForm = z.input<typeof payQrBaseSchema>;
export const payQrParameterFields = {
	'identifier-type': 'identifierType',
	'receiver-name': 'receiverName',
	reference: 'reference',
	message: 'message',
	org: 'organization',
	'acquirer-id': 'acquirerId',
	'application-id': 'applicationId',
	'merchant-city': 'merchantCity',
	mcc: 'mcc',
	'scheme-id': 'schemeId',
	'local-name': 'localName',
	'qr-type': 'qrType',
	'payment-mode': 'paymentMode',
	'recipient-type': 'recipientType',
	'merchant-id': 'merchantId',
	'acquiring-bank': 'acquiringBank',
	'account-information': 'accountInformation',
	'bill-number': 'billNumber',
	'store-label': 'storeLabel',
	'terminal-label': 'terminalLabel',
	'merchant-mobile': 'merchantMobile',
	'postal-code': 'postalCode',
	'expiry-date': 'expiryDate',
	'amount-editable': 'amountEditable',
	'creation-timestamp': 'creationTimestamp',
	'expiration-timestamp': 'expirationTimestamp'
} as const satisfies Record<string, keyof PayQrForm>;
export function payQrParameters(form: PayQrForm): Record<string, string> {
	const pairs: Record<string, string | undefined> = Object.fromEntries(
		Object.entries(payQrParameterFields).map(([key, field]) => [key, form[field]])
	);
	pairs.amount = form.amount ? `${form.currency}:${form.amount}` : '';
	pairs['qr-currency'] = form.country === 'kh' ? form.currency : '';
	return Object.fromEntries(
		Object.entries(pairs).filter((pair): pair is [string, string] => !!pair[1])
	);
}
function countrySchema(country: PayQrCountry) {
	return payQrBaseSchema
		.extend({ country: z.literal(country), scheme: z.literal(payQrSchemes[country].scheme) })
		.superRefine(refinePayQr);
}
export const bruneiPayQrSchema = countrySchema('bn');
export const cambodiaPayQrSchema = countrySchema('kh');
export const indonesiaPayQrSchema = countrySchema('id');
export const laosPayQrSchema = countrySchema('la');
export const malaysiaPayQrSchema = countrySchema('my');
export const myanmarPayQrSchema = countrySchema('mm');
export const philippinesPayQrSchema = countrySchema('ph');
export const singaporePayQrSchema = countrySchema('sg');
export const thailandPayQrSchema = countrySchema('th');
export const vietnamPayQrSchema = countrySchema('vn');
export const payQrFormSchema = z.discriminatedUnion('country', [
	bruneiPayQrSchema,
	cambodiaPayQrSchema,
	indonesiaPayQrSchema,
	laosPayQrSchema,
	malaysiaPayQrSchema,
	myanmarPayQrSchema,
	philippinesPayQrSchema,
	singaporePayQrSchema,
	thailandPayQrSchema,
	vietnamPayQrSchema
]);
function refinePayQr(form: z.output<typeof payQrBaseSchema>, ctx: z.RefinementCtx) {
	const country = form.country as PayQrCountry;
	const add = (path: string, message: string) =>
		ctx.addIssue({ code: 'custom', path: [path], message });
	try {
		if (form.identifier) validatePayQrIdentifier(country, form.identifier, form.identifierType);
	} catch (error) {
		add('identifier', (error as Error).message);
	}
	try {
		validatePayQrParameters(country, payQrParameters(form));
	} catch (error) {
		const message = (error as Error).message;
		const fields: Record<string, string> = {
			'receiver-name': 'receiverName',
			'merchant-city': 'merchantCity',
			'merchant category': 'mcc',
			acquirer: 'acquirerId',
			'recipient-type': 'recipientType',
			'merchant-id': 'merchantId',
			'acquiring-bank': 'acquiringBank',
			'account-information': 'accountInformation',
			'bill-number': 'billNumber',
			'store-label': 'storeLabel',
			'terminal-label': 'terminalLabel',
			'merchant-mobile': 'merchantMobile',
			'postal-code': 'postalCode',
			'expiry-date': 'expiryDate',
			'amount-editable': 'amountEditable',
			'creation-timestamp': 'creationTimestamp',
			'expiration-timestamp': 'expirationTimestamp',

			'application-id': 'applicationId',
			'scheme-id': 'schemeId',
			'local-name': 'localName',
			'qr-currency': 'currency',
			'payment-mode': 'paymentMode',
			'QR type': 'qrType'
		};
		const field = Object.entries(fields).find(([text]) => message.includes(text))?.[1] ?? 'amount';
		add(field, message);
	}
	if (
		form.currency &&
		!(payQrSchemes[country].currencies as readonly string[]).includes(form.currency)
	)
		add('currency', 'Currency is not verified for this scheme');
	if (!['my', 'vn', 'la'].includes(form.country) && form.acquirerId)
		add('acquirerId', 'Acquirer ID is only supported for DuitNow, VietQR and LaoQR');
	if (
		!['my', 'th', 'kh', 'mm', 'sg', 'la', 'vn'].includes(form.country) &&
		(form.mcc || form.merchantCity || (form.qrType && !['ph', 'id'].includes(country)))
	)
		add('country', 'These national QR fields are not supported for this country');
	if (form.country === 'la' && form.identifier && !/^[\x21-\x7e]{1,25}$/.test(form.identifier))
		add('identifier', 'Use 1–25 ASCII characters for the LaoQR receiver ID');
	if (form.country === 'my') {
		if (form.acquirerId && !/^[0-9]{6}$/.test(form.acquirerId))
			add('acquirerId', 'Use the six-digit ID supplied by your acquirer');
	}
	if (['my', 'th', 'kh', 'mm', 'sg', 'la', 'vn'].includes(form.country)) {
		if (form.receiverName && !/^[\x20-\x7e]{1,25}$/.test(form.receiverName))
			add('receiverName', 'Use 1–25 printable ASCII characters for this QR profile');
		if (form.merchantCity && !/^[\x20-\x7e]{1,15}$/.test(form.merchantCity))
			add('merchantCity', 'Use 1–15 printable ASCII characters');
		if (form.mcc && !/^[0-9]{4}$/.test(form.mcc))
			add('mcc', 'Use a four-digit merchant category code');
	}
	if (form.country === 'la' && form.amount && form.qrType !== 'dynamic')
		add('amount', 'Choose Dynamic for a LaoQR with an amount');
	if (form.country === 'kh') {
		if (form.qrType === 'static' && form.amount)
			add('amount', 'A KHQR with an amount must be dynamic');
		if (
			form.creationTimestamp &&
			form.expirationTimestamp &&
			form.expirationTimestamp <= form.creationTimestamp
		)
			add('expirationTimestamp', 'Expiry must be after creation');
	}
	if (form.qrType === 'dynamic' && !form.amount)
		add('amount', 'Enter an amount for this dynamic QR profile');
}

export function buildPayQrUri(form: PayQrForm): string {
	const result = payQrFormSchema.safeParse(form);
	if (!result.success) return '';
	return serializePayQr({
		country: result.data.country,
		identifier: result.data.identifier,
		parameters: payQrParameters(result.data)
	});
}
export function initialPayQrForm(country: PayQrCountry): PayQrForm {
	const scheme = payQrSchemes[country];
	return {
		country,
		scheme: scheme.scheme,
		identifier: '',
		identifierType: scheme.identifierTypes[0],
		currency: scheme.currencies[0] ?? '',
		amount: '',
		receiverName: '',
		reference: '',
		message: '',
		organization: '',
		acquirerId: '',
		recipientType: '',
		merchantId: '',
		acquiringBank: '',
		accountInformation: '',
		billNumber: '',
		storeLabel: '',
		terminalLabel: '',
		merchantMobile: '',
		postalCode: '',
		expiryDate: '',
		amountEditable: '',
		creationTimestamp: '',
		expirationTimestamp: '',

		applicationId: '',
		merchantCity: '',
		mcc: '',
		schemeId: '',
		localName: '',
		paymentMode: '',
		qrType: ''
	};
}

/** Match constructor field feedback without treating undocumented issuer syntax as verified. */
export function payQrFieldFeedback(form: PayQrForm, field: keyof PayQrForm) {
	if (!form[field]) return { state: 'empty', message: '' } as const;
	const result = payQrGenerationSchema.safeParse(form);
	const issue = result.success
		? undefined
		: result.error.issues.find((issue) => issue.path[0] === field);
	if (issue) return { state: 'invalid', message: issue.message } as const;
	if (field === 'identifier' && form.identifierType === 'issuer' && form.country !== 'la') {
		return {
			state: 'unverified',
			message: 'National identifier format is not yet verified.'
		} as const;
	}
	return { state: 'valid', message: '' } as const;
}

/** National-required fields are separate from the portable URI/draft schema. */
export const payQrGenerationSchema = payQrFormSchema.superRefine((form, ctx) => {
	const required = (field: keyof PayQrForm, pattern: RegExp, message: string) => {
		if (!pattern.test(String(form[field] ?? '')))
			ctx.addIssue({ code: 'custom', path: [field], message });
	};
	const country = form.country;
	if (['kh', 'la', 'my', 'mm', 'sg', 'th'].includes(country))
		required(
			'receiverName',
			/^[\x20-\x7e]{1,25}$/,
			'Enter a receiver name (1–25 ASCII characters)'
		);
	if (['my', 'mm'].includes(country))
		required(
			'merchantCity',
			/^[\x20-\x7e]{1,15}$/,
			'Enter the merchant city (1–15 ASCII characters)'
		);
	if (['my', 'la', 'vn'].includes(country))
		required('acquirerId', /^[0-9]{6}$/, 'Enter the six-digit institution ID');
	if (['my', 'mm'].includes(country))
		required('mcc', /^[0-9]{4}$/, 'Enter the four-digit merchant category code');
	if (country === 'la')
		required('applicationId', /^[A-Za-z0-9]{16}$/, 'Enter the 16-character institution AID');
	if (country === 'mm') {
		required(
			'schemeId',
			/^[A-Za-z0-9]+(?:\.[A-Za-z0-9-]+)+$/,
			'Enter the scheme ID supplied by your acquirer'
		);
		required('localName', /\p{Script=Myanmar}/u, 'Enter the receiver name in Myanmar');
	}
	if (country === 'kh') {
		if (form.recipientType === 'merchant') {
			required('merchantId', /^[\x20-\x7e]{1,32}$/, 'Enter the assigned merchant ID');
			required('acquiringBank', /^[\x20-\x7e]{1,32}$/, 'Enter the acquiring bank');
		}
		if (form.amount) {
			required('creationTimestamp', /^[0-9]{13}$/, 'Choose the creation date and time');
			required('expirationTimestamp', /^[0-9]{13}$/, 'Choose the expiry date and time');
		}
	}
	if (form.reference && ['my', 'mm', 'la', 'sg'].includes(country))
		required(
			'reference',
			new RegExp(`^[\\x20-\\x7e]{1,${country === 'sg' ? 35 : 25}}$`),
			'Reference exceeds the national field format'
		);
	if (form.message && ['kh', 'vn', 'la', 'mm'].includes(country))
		required('message', /^[\x20-\x7e]{1,25}$/, 'Use 1–25 ASCII characters for payment purpose');
});
