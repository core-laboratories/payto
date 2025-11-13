/**
* Export main identifier
* @param {any} state - object with potential properties
* @param {ITransitionType | undefined} type - string indicating the address type
*/
export const getCurrency = (state: any, type: ITransitionType | undefined, pass: boolean = false): string | undefined => {
	if (pass && Object.keys(state).length > 0 && state.params) {
		//return state.network;
		switch (type) {
			case 'iban':
			case 'ach':
			case 'upi':
			case 'pix':
			case 'bic':
			case 'intra':
			case 'void':
				return state.params.currency?.value;
			default: // All the rest - including ICAN
				return state.params.fiat?.value ?? // Fiat value
					state.params.currency?.value ?? // Token value
					state.other ?? // Other value - custom currency
					state.network ?? // Network value
					undefined;
		}
	} else if (state && state.params) {
		switch (type) {
			case 'ican':
				return state.params.fiat?.value !== undefined ? String(state.params.fiat.value) :
					state.params.currency?.value !== undefined ? String(state.params.currency.value) :
					state.other !== undefined ? String(state.other) :
					(state.network !== undefined && state.network !== 'other') ? String(state.network) :
					undefined;
			case 'iban':
			case 'ach':
			case 'upi':
			case 'pix':
			case 'bic':
			case 'intra':
			case 'void':
				return state.params.currency?.value !== undefined ? String(state.params.currency.value) : undefined;
			default:
				return undefined;
		}
	}
	return undefined;
};
