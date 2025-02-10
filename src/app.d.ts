declare namespace App {
	// interface Error {}
	// interface Locals {}
	// interface PageData {}
	// interface Platform {}
}

declare namespace svelteHTML {
	interface HTMLAttributes<T> {
		'on:tabchange'?: (event: CustomEvent<{ selected: string }>) => void;
		'on:listboxchange'?: (event: CustomEvent<{ selected: { value: string } }>) => void;
		'on:pointerdown'?: (event: PointerEvent) => void;
	}
}

type ITransitionType = 'ican' | 'iban' | 'ach' | 'upi' | 'pix' | 'bic' | 'void';

interface ITypesObject {
	[K in ITransitionType]: ITypeDetails;
}

interface ITypeDetails {
	value: string;
	label: string;
	link: string;
}

interface ITransportType {
	value: string;
	label: string;
	ticker: string;
	symbol?: string;
	tokens?: boolean;
}

interface ITransportTypes {
	ican: ITransportType[];
	iban: ITransportType[];
	upi: ITransportType[];
	pix: ITransportType[];
	ach: ITransportType[];
	bic: ITransportType[];
	void: ITransportType[];
}

interface IPayload {
	placeholder?: string;
	value: string | undefined;
	query?: boolean;
}

interface IOutput {
	label: string;
	value: string;
	note?: string;
	previewable?: boolean;
}

interface IState {
	[K in ITransitionType]: ITransactionState;
}

interface ITransactionState {
	network: string;
	transport?: string;
	other?: string;
	destination?: string;
	chain?: string;
	isSplit?: boolean;
	isFiat?: boolean;
	isSwap?: boolean;
	isDl?: boolean;
	isRc?: boolean;
	isId?: boolean;
	isDesc?: boolean;
	iban?: string;
	bic?: string;
	accountAlias?: string;
	routingNumber?: string;
	accountNumber?: string;
	params?: any;
}

interface IValue {
	value: string | number | undefined;
}

interface IDlValue {
	value: number | undefined;
}

interface IRcValue {
	value: string | undefined;
}

interface IDesignState {
	org?: string;
	item?: string;
	colorF?: string;
	colorB?: string;
	barcode?: string;
	rtl?: boolean;
}

interface ILocValue extends IValue {
	lat?: string;
	lon?: string;
	plus?: string;
	other?: string;
}

interface ISplitValue extends IValue {
	value?: number;
	isPercent?: boolean;
	address?: string;
}

interface IComplexState {
	networks: {
		[K in ITransitionType]: ITransactionState;
	};
	design: IDesignState;
	isCleared: boolean;
	paymentType: string
}

/*interface IStateParams {
	currency: IValue;
	amount: IValue;
	dl?: IDlValue;
	rc?: IRcValue;
	fiat?: IValue;
	swap?: IValue;
	receiverName?: IValue;
	message?: IValue;
	id?: IValue;
	loc?: ILocValue;
	split?: ISplitValue;
}*/
