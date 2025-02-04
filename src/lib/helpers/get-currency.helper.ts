/**
* Export main identifier
* @param {ITransactionState} state - object with potential properties
* @param {ITransitionType | undefined} type - string indicating the address type
*/
export const getCurrency = (state: ITransactionState, type: ITransitionType | undefined): string | undefined => {
	if (!state || !state.params) return undefined;

	switch (type) {
		case 'ican':
			return state.params.fiat.value !== undefined ? String(state.params.fiat.value) : // Fiat value
				state.params.currency.value !== undefined ? String(state.params.currency.value) : // Token value
				state.other !== undefined ? String(state.other) : // Other value - custom currency
				(state.network !== undefined && state.network !== 'other') ? String(state.network) : // Network value
				undefined;
		case 'iban':
		case 'ach':
		case 'upi':
		case 'pix':
		case 'bic':
		case 'void':
			return state.params.currency.value !== undefined ? String(state.params.currency.value) : undefined;
		default:
			return undefined;
	}
};
