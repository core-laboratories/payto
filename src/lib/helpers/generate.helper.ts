import { META_CONTENT } from '$lib/data/meta-content.data';
import { checkValidity } from '$lib/helpers/check-validity.helper';
import { calculateColorDistance } from '$lib/helpers/euclidean-distance.helper';

/**
 * It takes a list of payloads and a set of props, and returns a link
 * @param {IPayload[]} payload - IPayload[] - the payload is an array of objects that contain the value
 * and placeholder of each field.
 * @param props - The props object that was used to initialized store.
 */
const generateLink = (payload: IPayload[], props: Record<string, any>, donate: boolean = false) => {
	let link = payload
		.filter((payload) => (payload.value !== undefined || payload.query === true))
		.reduce((acc, payload) => acc.concat('/', payload.value || (payload.placeholder ? payload.placeholder : '')), 'payto:/');

	const { amount, currency, design, split, fiat, swap, ...rest } = props.params;
	const validParams = Object.entries<{ value: string | undefined; mandatory?: boolean }>(rest)
		.filter(([_, param]) => param.mandatory || Boolean(param.value))
		.map(([key, param]) => [kebabize(key), param.value]);

	const searchParams = new URLSearchParams(validParams as string[][]);

	if (props.params) {
		// Amount transformer
		if (amount.mandatory) {
			searchParams.set(
				'amount',
				currency.value
				? caseCurrency(currency.value) + ':' + amount.value
				: amount.value
			);
		} else if (amount.value || currency.value) {
			searchParams.set(
				'amount',
				(amount.value && currency.value)
				? caseCurrency(currency.value) + ':' + amount.value
				: (currency.value ? caseCurrency(currency.value) + ':' : amount.value)
			);
		}

		if (fiat && fiat.value) {
			searchParams.set('fiat', fiat.value.toLowerCase());
		}

		if (swap && swap.value) {
			searchParams.set('swap', swap.value.toLowerCase());
		}

		// Split transformer
		if (split && split.value && split.address && amount.value>0 && ((!split.isPercent && split.value<amount.value) || (split.isPercent && split.value<100))) {
			searchParams.set(
				'split',
				split.isPercent
				? 'p:' + split.value + '@' + split.address
				: split.value + '@' + split.address
			);
		}

		// Design transformer
		if (design) {
			const { org, item, colorF, colorB, barcode, rtl } = design;
			if (org) searchParams.set('org', org);
			if (item) searchParams.set('item', item);
			if (colorB && colorF && colorB !== '#77bc65' && colorF !== '#192a14') {
				const similar = calculateColorDistance(colorB, colorF);
				if (similar >= 100) {
					searchParams.set('color-f', colorF.substring(1));
					searchParams.set('color-b', colorB.substring(1));
				} else {
					searchParams.delete('color-f');
					searchParams.delete('color-b');
				}
			} else if (colorF && colorF !== '#192a14') {
				const similar = calculateColorDistance('#77bc65', colorF);
				if (similar >= 100) {
					searchParams.set('color-f', colorF.substring(1));
				} else {
					searchParams.delete('color-f');
				}
			} else if (colorB && colorB !== '#77bc65') {
				const similar = calculateColorDistance('#192a14', colorB);
				if (similar >= 100) {
					searchParams.set('color-b', colorB.substring(1));
				} else {
					searchParams.delete('color-b');
				}
			}
			if (rtl) {
				searchParams.set('rtl', '1');
			}
			if (barcode !== 'qr') {
				if (barcode) searchParams.set('barcode', barcode);
			}
		}
	}

	if (donate) {
		searchParams.set('donate', '1');
	}

	if (searchParams.toString()) {
		link += '?' + uriNormalize(searchParams.toString());
	}

	return link;
};

/**
 * camelCase to kebab-case
 * @param str - String to be kebabized
 */
const kebabize = (str: string | undefined) => str ? str.replace(/[A-Z]+(?![a-z])|[A-Z]/g, ($: any, ofs: any) => (ofs ? "-" : "") + $.toLowerCase()): str;

/**
 * Convert required characters back from encodeURIComponent
 * @param str - String to be decoded
 */
const uriNormalize = (str: string | undefined): string | undefined => {
	if (!str) return str;

	const replacements: { [key: string]: string } = {
		'%3A': ':',
		'%40': '@',
		'%2C': ','
	};

	const regex = new RegExp(Object.keys(replacements).join('|'), 'g');
	return str.replace(regex, (match) => replacements[match]);
};

/**
 * Convert currency to lower case except Smart Contracts
 * @param str - String to be converted
 */
const caseCurrency = (str: string | undefined) => (str && str.startsWith("0x")) ? str : (str ? str.toLowerCase(): str);

/**
 * Shorten name for title
 * @param str - String to be shorten
 */
const shortenTitle = (str: string | undefined) => (str && str.length > 10) ? `${str.slice(0,4)}…${str.slice(-4)}` : str;

/**
 * It takes a prefix and a props object, and returns a title
 * @param {'Pay' | 'Donate'} prefix - 'pay' | 'donate'
 * @param props - The props object that was used to initialized store.
 */
const getTitle = (prefix: 'pay' | 'donate', props: Record<string, any>) => {
	let network
	if (props.network === 'void') {
		network = props.transport !== 'other'
		? shortenTitle(props.transport)
		: shortenTitle(props.other);
	} else {
		network = props.network !== 'other'
		? shortenTitle(props.network)
		: (checkValidity(props.other)
		? shortenTitle(props.other)
		: '');
	}
	let namePrefix;
	if (typeof props.params !== 'undefined' && typeof props.params.rc !== 'undefined' && typeof props.params.rc.value !== 'undefined') {
		namePrefix = `Recurring ${prefix}`;
	} else {
		namePrefix = prefix[0].toUpperCase() + prefix.slice(1);
	}
	let title = `${namePrefix} via ${network ? network.toUpperCase() : ''}`;
	if (props.chain > 0 && (props.network === 'eth' || props.network === 'other')) {
		title += `@${props.chain}`;
	}
	if (props.params.currency.value) {
		if (props.params.currency.value.length > 10) {
			if(props.params.currency.value.startsWith("0x")) {
				title += ` with ${shortenTitle(props.params.currency.value)}`;
			} else {
				title += ` with ${shortenTitle(props.params.currency.value.toUpperCase())}`;
			}
		} else {
			title += ` with ${props.params.currency.value.toUpperCase()}`;
		}

	}

	return title;
};

/**
 * It takes a link and a props object and returns a markdown string
 * @param {string} link - The link to the payment page.
 * @param props - The props object that was used to initialized store.
 */
const generateMarkDown = (link: string, props: Record<string, any>) => {
	return `[${getTitle('pay', props)}](${link})`;
};

/**
 * It takes a link and a props object and returns an HTML link
 * @param {string} link - The link to the payment page.
 * @param props - The props object that was used to initialized store.
 * @returns A string that contains an anchor tag with a link and a title.
 */
const generateHtmlLink = (link: string, props: Record<string, any>) => {
	return `<a href="${link}">${getTitle('pay', props)}</a>`;
};

/**
 * It generates an HTML link with a payment button
 * @param {string} link - The link to the payment page.
 * @param props - The props object that was used to initialized store.
 * @returns A string of HTML code that will be used to create a button that will link to the payment
 * page.
 */
const generateHtmlPaymentButton = (link: string, props: Record<string, any>) => {
	const style = `
cursor:pointer;
color:#72bd5e;
padding:6px 12px;
background:#72bd5e20;
font:15px/20px BlinkMacSystemFont, -apple-system, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
border:1px solid #639953;
border-radius:16px;
text-decoration:none;
height:fit-content;
transition: all .15s cubic-bezier(.4,0,.2,1);
white-space:nowrap;
`;
	return `<a href="${link}" class="ptPay" style="${style}">💸 ${getTitle('pay', props)}</a><style>a.ptPay:hover{border-color:#95e87f !important;color:#95e87f !important}</style>`;
};

/**
 * It takes a link and a set of properties and returns a string of HTML that can be used to render a
 * donation button
 * @param {string} link - The link to the donation page.
 * @param props - The props object that was used to initialized store.
 * @returns A string of HTML code that will be used to create a donation button.
 */
const generateHtmlDonationButton = (link: string, props: Record<string, any>) => {
	const style = `
cursor:pointer;
color:#849dfc;
padding:6px 12px;
background:#849dfc20;
font:15px/20px BlinkMacSystemFont, -apple-system, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
border:1px solid #878fc5;
border-radius:16px;
text-decoration:none;
height:fit-content;
transition:all .15s cubic-bezier(.4, 0, .2, 1);
white-space:nowrap;
`;
	return `<a href="${link}" class="ptDonate" style="${style}">💠 ${getTitle('donate', props)}</a><style>a.ptDonate:hover{border-color:#b6c2f4 !important;color:#b6c2f4 !important}</style>`;
};

/**
 * It takes a type and a set of properties, and returns a meta tag
 * @param {ITransitionType} type - The type of the meta tag.
 * @param props - The props object that was used to initialized store.
 * @returns A string of HTML that will be used to create a meta tag.
 */
const generateMetaTag = (type: ITransitionType, props: Record<string, any>) => {
	let property = `${type}`;
	if (type === 'ican' && props.network) {
		if (props.network !== 'other') {
			if (props.network === 'eth' && props.chain > 0) {
				property += `:${props.network}@${props.chain}`;
			} else {
				property += `:${props.network}`;
			}
		} else {
			if (checkValidity(props.other)) {
				if (props.chain > 0) {
					property += `:${props.other ? props.other.toLowerCase() : props.other}@${props.chain}`;
				} else {
					property += `:${props.other ? props.other.toLowerCase() : props.other}`;
				}
			}
		}
	} else if (type === 'iban' && props.bic) {
		property += `:${props.bic.toLowerCase()}`;
	} else if (type === 'ach' && props.routingNumber) {
		property += `:${props.routingNumber}`;
	} else if (type === 'void') {
		if(props.transport !== 'other') {
			property += `:${props.transport}`;
		} else {
			property += `:${props.other ? props.other.toLowerCase(): props.other}`;
		}
	}

	if (props.params.currency.value) {
		property += `:${props.params.currency.value.toLowerCase()}`;
	}
	if (props.params.fiat && props.params.fiat.value) {
		property += `:${props.params.fiat.value.toLowerCase()}`;
	}

	const content = META_CONTENT[type](props);

	return `<meta property="${property}" content="${content}" />`;
};

/**
 * It takes in a type, props, and payload, and returns an array of objects
 * @param {ITransitionType} type - The type of the link. This is used to generate the meta tag.
 * @param props - The props object that was used to initialized store.
 * @param {IPayload[]} payload - The payload that was generated by the user.
 */
export const generate = (type: ITransitionType, props: any, payload: IPayload[]): IOutput[] => {
	const link = generateLink(payload, props);

	return [
		{ label: 'Link', value: link },
		{ label: 'Markdown', value: generateMarkDown(link, props) },
		{ label: 'Html link', value: generateHtmlLink(link, props) },
		{
			label: 'Html payment button',
			value: generateHtmlPaymentButton(link, props),
			previewable: true
		},
		{
			label: 'Html donation button',
			value: generateHtmlDonationButton(generateLink(payload, props, true), props),
			previewable: true
		},
		{ label: 'Meta tag', note: 'Basic payment instructions only.', value: generateMetaTag(type, props) }
	];
};
