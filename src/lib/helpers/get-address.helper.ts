/**
* Export main identifier
* @param {ITransactionState | string} address - object with potential properties or string address
* @param {ITransitionType} type - string indicating the address type
* @param {any} paytoData - additional PayTo data for string addresses
*/
export const getAddress = (address: ITransactionState | string | null | undefined, type: ITransitionType, paytoData?: any): string | undefined => {
	if (!address) return undefined;

	// Handle string case (from parsed PayTo)
	if (typeof address === 'string') {
		switch (type) {
			case 'ican':
				return address;
			case 'iban':
				return address;
			case 'ach':
				return address;
			case 'upi':
			case 'pix':
				return address;
			case 'bic':
				return address;
			case 'void':
				// For void, use location from paytoData if available
				return paytoData?.location || address;
			default:
				return address;
		}
	}

	// Handle ITransactionState case (from constructor)
	switch (type) {
		case 'ican':
			return address.destination || undefined;
		case 'iban':
			return address.iban || undefined;
		case 'ach':
			return address.accountNumber || undefined;
		case 'upi':
		case 'pix':
			return address.accountAlias || undefined;
		case 'bic':
			return address.bic || undefined;
		case 'void':
			if (address.transport === 'geo') {
				if(address.params.loc.lat && address.params.loc.lon) {
					return address.params.loc.value || undefined;
				} else {
					return undefined;
				}
			} else if (address.transport === 'plus') {
				return address.params.loc.plus || undefined;
			} else if (address.transport === 'intra') {
				return address.params.id.value || undefined;
			} else if (address.other) {
				return address.other || undefined;
			}
			return undefined;
		default:
			return undefined;
	}
};
