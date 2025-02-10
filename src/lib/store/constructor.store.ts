import { TRANSPORT } from '$lib/data/transports.data';
import { createStore } from '$lib/helpers/create-store.helper';
import { generate } from '$lib/helpers/generate.helper';
import { checkValidity } from '$lib/helpers/check-validity.helper';

const INITIAL_STATE: IComplexState = {
	networks: {
		ican: {
			network: TRANSPORT.ican[0].value,
			other: undefined,
			destination: undefined,
			chain: undefined,
			isSplit: false,
			isFiat: false,
			isSwap: false,
			isDl: false,
			isRc: false,
			params: {
				currency: { value: undefined },
				amount: { value: undefined },
				dl: { value: undefined },
				rc: { value: undefined },
				fiat: { value: undefined },
				swap: { value: undefined },
				split: { value: undefined, isPercent: false, address: undefined },
			}
		},

		iban: {
			network: TRANSPORT.iban[0].value,
			iban: undefined,
			bic: undefined,
			isDl: false,
			isRc: false,
			params: {
				currency: { value: undefined },
				amount: { value: undefined },
				receiverName: { value: undefined },
				message: { value: undefined },
				dl: { value: undefined },
				rc: { value: undefined },
			}
		},

		upi: {
			network: TRANSPORT.upi[0].value,
			accountAlias: undefined,
			isRc: false,
			params: {
				currency: { value: undefined },
				amount: { value: undefined },
				receiverName: { value: undefined },
				message: { value: undefined },
				rc: { value: undefined },
			}
		},

		pix: {
			network: TRANSPORT.pix[0].value,
			accountAlias: undefined,
			isId: false,
			isDesc: false,
			isRc: false,
			params: {
				currency: { value: 'brl' },
				amount: { value: undefined },
				receiverName: { value: undefined },
				message: { value: undefined },
				id: { value: undefined },
				rc: { value: undefined },
			}
		},

		ach: {
			network: TRANSPORT.ach[0].value,
			routingNumber: undefined,
			accountNumber: undefined,
			isRc: false,
			params: {
				currency: { value: 'usd' },
				amount: { value: undefined },
				receiverName: { value: undefined },
				rc: { value: undefined },
			}
		},

		bic: {
			network: TRANSPORT.bic[0].value,
			bic: undefined,
			isRc: false,
			params: {
				currency: { value: undefined },
				amount: { value: undefined },
				rc: { value: undefined },
			}
		},

		void: {
			network: 'void',
			transport: TRANSPORT.void[0].value,
			other: undefined,
			isRc: false,
			params: {
				loc: { value: undefined, lat: undefined, lon: undefined, plus: undefined, other: undefined },
				currency: { value: undefined },
				amount: { value: undefined },
				receiverName: { value: undefined },
				message: { value: undefined },
				rc: { value: undefined },
			}
		},
	},
	design: {
		org: undefined,
		item: undefined,
		colorF: '#192a14',
		colorB: '#77bc65',
		barcode: 'qr',
		rtl: false
	},
	isCleared: false,
	paymentType: 'ican',
};

const BUILDER = {
	networks: {
		ican: (props: typeof INITIAL_STATE.networks.ican, design: typeof INITIAL_STATE.design) => {
			const fullProps = {
				...props,
				params: {
					...props.params,
					design
				}
			};
			const payload = [
				{
					placeholder: '',
					value: fullProps.network === 'other'
						? (checkValidity(fullProps.other ?? '')
							? encodeURIComponent(fullProps.other ? fullProps.other.toLowerCase() : '')
							: '')
						: encodeURIComponent(fullProps.network)
				},
				{
					placeholder: '',
					value: fullProps.destination && fullProps.chain && (fullProps.network === 'eth' || fullProps.network === 'other')
						? encodeURIComponent(fullProps.destination) + '@' + encodeURIComponent(fullProps.chain)
						: encodeURIComponent(fullProps.destination ? fullProps.destination : '')
				}
			];
			return generate('ican', fullProps, payload);
		},
		iban: (props: typeof INITIAL_STATE.networks.iban, design: typeof INITIAL_STATE.design) => {
			const fullProps = {
				...props,
				params: {
					...props.params,
					design
				}
			};
			const payload = [
				{
					placeholder: '',
					value: encodeURIComponent(fullProps.network)
				},
				{
					placeholder: '',
					value: fullProps.bic && fullProps.iban ? encodeURIComponent(fullProps.bic) : undefined
				},
				{
					placeholder: '',
					value: fullProps.iban ? encodeURIComponent(fullProps.iban) : undefined
				}
			];
			return generate('iban', fullProps, payload);
		},
		upi: (props: typeof INITIAL_STATE.networks.upi, design: typeof INITIAL_STATE.design) => {
			const fullProps = {
				...props,
				params: {
					...props.params,
					design
				}
			};
			const payload = [
				{
					placeholder: '',
					value: encodeURIComponent(fullProps.network)
				},
				{
					placeholder: '',
					value: fullProps.accountAlias ? encodeURI(fullProps.accountAlias) : undefined
				}
			];
			return generate('upi', fullProps, payload);
		},
		pix: (props: typeof INITIAL_STATE.networks.pix, design: typeof INITIAL_STATE.design) => {
			const fullProps = {
				...props,
				params: {
					...props.params,
					design
				}
			};
			const payload = [
				{
					placeholder: '',
					value: encodeURIComponent(fullProps.network)
				},
				{
					placeholder: '',
					value: fullProps.accountAlias ? encodeURI(fullProps.accountAlias) : undefined
				}
			];
			return generate('pix', fullProps, payload);
		},
		ach: (props: typeof INITIAL_STATE.networks.ach, design: typeof INITIAL_STATE.design) => {
			const fullProps = {
				...props,
				params: {
					...props.params,
					design
				}
			};
			const payload = [
				{
					placeholder: '',
					value: encodeURIComponent(fullProps.network)
				},
				{
					placeholder: '',
					value: (fullProps.routingNumber && fullProps.accountNumber && /^\d+$/.test(fullProps.routingNumber) && /^\d+$/.test(fullProps.accountNumber)) ? fullProps.routingNumber : undefined
				},
				{
					placeholder: '',
					value: (fullProps.accountNumber && /^\d+$/.test(fullProps.accountNumber)) ? fullProps.accountNumber : undefined
				}
			];
			return generate('ach', fullProps, payload);
		},
		bic: (props: typeof INITIAL_STATE.networks.bic, design: typeof INITIAL_STATE.design) => {
			const fullProps = {
				...props,
				params: {
					...props.params,
					design
				}
			};
			const payload = [
				{
					placeholder: '',
					value: encodeURIComponent(fullProps.network)
				},
				{
					placeholder: '',
					value: fullProps.bic ? encodeURIComponent(fullProps.bic) : undefined
				}
			];
			return generate('bic', fullProps, payload);
		},
		void: (props: typeof INITIAL_STATE.networks.void, design: typeof INITIAL_STATE.design) => {
			const fullProps = {
				...props,
				params: {
					...props.params,
					design
				}
			};
			if (fullProps.transport === 'geo' &&
				fullProps.params &&
				fullProps.params.loc &&
				fullProps.params.loc.lat &&
				fullProps.params.loc.lon) {
				fullProps.params.loc.value = `${fullProps.params.loc.lat},${fullProps.params.loc.lon}`;
			}
			else if (fullProps.params &&
				fullProps.params.loc &&
				fullProps.params.loc.plus &&
				fullProps.transport === 'plus') {
				fullProps.params.loc.value = fullProps.params.loc.plus.toUpperCase();
			}
			else if (fullProps.params &&
				fullProps.params.loc &&
				fullProps.transport === 'other') {
				fullProps.params.loc.value = fullProps.params.loc.other;
			} else {
				fullProps.params.loc.value = '';
			}
			const payload = [
				{
					placeholder: '',
					value: fullProps.network
				},
				{
					placeholder: '',
					value: fullProps.transport === 'other'
						? (fullProps.other ? encodeURIComponent(fullProps.other) : undefined)
						: (fullProps.transport ? encodeURIComponent(fullProps.transport) : undefined)
				}
			];
			return generate('void', fullProps, payload);
		}
	}
};

export const constructor = createStore(INITIAL_STATE, BUILDER);
