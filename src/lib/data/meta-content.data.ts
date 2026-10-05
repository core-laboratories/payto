import { buildPayQrUri } from '#lib/validators/payqr.validator.js';

export const META_CONTENT = {
	qr: (props: Pick<ITransactionState, 'payQrForm'>) => {
		const uri = props.payQrForm ? buildPayQrUri(props.payQrForm) : '';
		return uri ? props.payQrForm!.identifier : '';
	},
	ican: (props: Record<string, any>) => props.destination || '',
	iban: (props: Record<string, any>) => props.iban || '',
	bic: (props: Record<string, any>) => props.bic || '',
	upi: (props: Record<string, any>) => props.accountAlias || '',
	pix: (props: Record<string, any>) => props.accountAlias || '',
	ach: (props: { accountNumber?: string }) => {
		let account = /^\d+$/.test(props.accountNumber || '') ? props.accountNumber : '';
		return account;
	},
	intra: (props: Record<string, any>) => props.bic && props.id ? props.id.toLowerCase() : '',
	void: (props: Record<string, any>) =>  props.params.loc.value || '',
};
