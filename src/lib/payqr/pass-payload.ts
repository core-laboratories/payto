import { generateNationalQr } from './national';
import {
	payQrGenerationSchema,
	initialPayQrForm,
	payQrParameterFields
} from '#lib/validators/payqr.validator.js';
import { parsePayQr, serializePayQr } from '$payqr';

/** Shared by the online preview and both downloadable wallet pass formats. */
export function payQrPassPayload(uri: string, format?: string): { value: string; label: string } {
	const target = parsePayQr(uri);
	const selectedFormat = format ?? target.parameters.format ?? 'payto';
	if (!['native', 'payto', target.scheme].includes(selectedFormat))
		throw new Error('Invalid payment QR format');
	// Presentation metadata is not part of the national payment instruction.
	for (const key of [
		'org',
		'item',
		'color-f',
		'color-b',
		'barcode',
		'format',
		'rtl',
		'lang',
		'mode',
		'donate'
	]) {
		delete target.parameters[key];
	}
	if (selectedFormat === 'payto') return { value: serializePayQr(target), label: 'PayTo' };
	const form = {
		...initialPayQrForm(target.country),
		identifier: target.identifier,
		identifierType: target.identifierType
	};
	for (const [key, field] of Object.entries(payQrParameterFields)) {
		if (target.parameters[key] !== undefined)
			Object.assign(form, { [field]: target.parameters[key] });
	}
	if (target.parameters.amount) [form.currency, form.amount] = target.parameters.amount.split(':');
	if (target.parameters['qr-currency']) form.currency = target.parameters['qr-currency'];
	const validated = payQrGenerationSchema.safeParse(form);
	if (!validated.success) throw new Error(validated.error.issues[0].message);
	if (
		target.country === 'kh' &&
		target.parameters['expiration-timestamp'] &&
		Number(target.parameters['expiration-timestamp']) <= Date.now()
	)
		throw new Error('This KHQR has expired');
	return { value: generateNationalQr(target), label: 'National payment QR' };
}
