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
			case 'iban':
			case 'ach':
			case 'upi':
			case 'pix':
			case 'bic':
			case 'intra':
				return address;
			case 'void':
				// For void, use location from paytoData if available
				return paytoData?.location || address;
			default:
				return address;
		}
	}

	// Helper to normalize address values
	const normalizeAddress = (value: any): string | undefined => {
		return (value && typeof value === 'string' && value.trim()) ? value.trim() : undefined;
	};

	// Handle ITransactionState case (from constructor)
	switch (type) {
		case 'ican':
			return normalizeAddress(address.destination);
		case 'iban':
			return normalizeAddress(address.iban);
		case 'ach':
			return normalizeAddress(address.accountNumber);
		case 'upi':
		case 'pix':
			return normalizeAddress(address.accountAlias);
		case 'bic':
			return normalizeAddress(address.bic);
		case 'intra':
			return normalizeAddress(address.id);
		case 'void':
			if (address.transport === 'geo') {
				if (address.params?.loc?.lat && address.params?.loc?.lon) {
					return normalizeAddress(address.params.loc.value);
				} else {
					return undefined;
				}
			} else if (address.transport === 'plus') {
				return normalizeAddress(address.params?.loc?.plus);
			} else if (address.other) {
				return normalizeAddress(address.other);
			}
			return undefined;
		default:
			return undefined;
	}
};
