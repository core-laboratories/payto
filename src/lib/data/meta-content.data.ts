export const META_CONTENT = {
	ican: (props: Record<string, any>) => props.destination || '',
	iban: (props: Record<string, any>) => props.iban || '',
	bic: (props: Record<string, any>) => props.bic || '',
	upi: (props: Record<string, any>) => props.accountAlias || '',
	pix: (props: Record<string, any>) => props.accountAlias || '',
	ach: (props: { accountNumber?: string }) => {
		let account = /^\d+$/.test(props.accountNumber || '') ? props.accountNumber : '';
		return account;
	},
	void: (props: Record<string, any>) => {
		if(props.transport === 'intra') {
			return props.bic && props.params.id.value ? props.params.id.value.toLowerCase() : '';
		} else {
			return props.params.loc.value || '';
		}
	},
};
