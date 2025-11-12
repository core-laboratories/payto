import { META_CONTENT } from '$lib/data/meta-content.data';
import { checkValidity } from '$lib/helpers/check-validity.helper';
import { calculateColorDistance } from '$lib/helpers/euclidean-distance.helper';
import { standardizeOrg } from '$lib/helpers/standardize.helper';
import { setLocaleFromPaytoData } from '$i18n';
import { i18nObject } from '$i18n/i18n-util';
import type { Locales } from '$i18n/i18n-types';
import { env as publicEnv } from '$env/dynamic/public';

/**
 * It takes a list of payloads and a set of props, and returns a link
 * @param {IPayload[]} payload - IPayload[] - the payload is an array of objects that contain the value
 * and placeholder of each field.
 * @param props - The props object that was used to initialized store.
 */
export const generateLink = (payload: IPayload[] = [], props: Record<string, any>, donate: boolean = false) => {
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

		// PayPass transformer
		if (design) {
			const { org, item, colorF, colorB, barcode, rtl, lang, mode } = design;
			if (org) {
				searchParams.set('org', standardizeOrg(org) || '');
			}
			if (item) searchParams.set('item', item);

			// Handle colors: validate distance if BOTH colors are provided
			if (colorB && colorF && colorB !== '#2A3950' && colorF !== '#9AB1D6') {
				const distance = calculateColorDistance(colorB, colorF);
				if (distance >= 100) {
					searchParams.set('color-f', colorF.substring(1));
					searchParams.set('color-b', colorB.substring(1));
				}
			} else if (colorF && colorF !== '#9AB1D6') {
				// Only foreground provided, use it without distance check
				searchParams.set('color-f', colorF.substring(1));
			} else if (colorB && colorB !== '#2A3950') {
				// Only background provided, use it without distance check
				searchParams.set('color-b', colorB.substring(1));
			}
			if (rtl) {
				searchParams.set('rtl', '1');
			}
			if (barcode !== 'qr') {
				if (barcode) searchParams.set('barcode', barcode);
			}
			if (mode) {
				if (mode === 'auto') {
					searchParams.delete('mode');
				} else {
					searchParams.set('mode', mode);
				}
			}
			if (lang) {
				searchParams.set('lang', lang);
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

const recurringIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2h4"/><path d="M12 14v-4"/><path d="M4 13a8 8 0 0 1 8-7 8 8 0 1 1-5.3 14L4 17.6"/><path d="M9 17H4v5"/></svg>`;

/**
 * It takes a prefix and a props object, and returns a title
 * @param {'Pay' | 'Donate'} prefix - 'pay' | 'donate'
 * @param props - The props object that was used to initialized store.
 * @param html - Whether to return the title for HTML output
 */
const getTitle = (prefix: 'pay' | 'donate', props: Record<string, any>, code: string | boolean = false) => {
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
		if (prefix === 'donate') {
			if (code === 'html') {
				namePrefix = `${recurringIcon}&nbsp;<strong>Donate<span>To:</span></strong>`;
			} else if (code === 'tailwind') {
				namePrefix = `${recurringIcon}&nbsp;<strong class="italic mr-1">Donate<span class="text-[#5675ff]">To:</span></strong>`;
			} else {
				const LL = i18nObject(props.language as Locales || 'en');
				namePrefix = `${LL.paymentButton.Recurring()} DonateTo:`;
			}
		} else {
			if (code === 'html') {
				namePrefix = `${recurringIcon}&nbsp;<strong>Pay<span>To:</span></strong>`;
			} else if (code === 'tailwind') {
				namePrefix = `${recurringIcon}&nbsp;<strong class="italic mr-1">Pay<span class="text-[#059669]">To:</span></strong>`;
			} else {
				const LL = i18nObject(props.language as Locales || 'en');
				namePrefix = `${LL.paymentButton.Recurring()} PayTo:`;
			}
		}
	} else {
		if (prefix === 'donate') {
			if (code === 'html') {
				namePrefix = `<strong>Donate<span>To:</span></strong>`;
			} else if (code === 'tailwind') {
				namePrefix = `<strong class="italic mr-1">Donate<span class="text-[#5675ff]">To:</span></strong>`;
			} else {
				namePrefix = `DonateTo:`;
			}
		} else {
			if (code === 'html') {
				namePrefix = `<strong>Pay<span>To:</span></strong>`;
			} else if (code === 'tailwind') {
				namePrefix = `<strong class="italic mr-1">Pay<span class="text-[#059669]">To:</span></strong>`;
			} else {
				namePrefix = `PayTo:`;
			}
		}
	}

	let title = composeTitle(namePrefix, network, props.language);
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

const composeTitle = (namePrefix: string | undefined, network: string | undefined, language?: string) => {
	if (!namePrefix) return '';

	const LL = i18nObject((language as Locales) || 'en');
	const viaText = LL.paymentButton.via();

	if (network === 'intra') {
		return `${namePrefix} ${viaText} Intra-bank`;
	}
	return `${namePrefix} ${viaText} ${network ? network.toUpperCase() : ''}`;
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
font:16px/20px BlinkMacSystemFont, -apple-system, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
border:1px solid #639953;
border-radius:16px;
text-decoration:none;
height:fit-content;
transition: all .15s cubic-bezier(.4,0,.2,1);
white-space:nowrap;
`;
const stylePayto = `
<style>
a.ptPay>strong{font-style:italic;margin-right:4px}
a.ptPay>strong>span{color:#059669}
a.ptPay>svg{vertical-align:-3px;margin-right:2px}
a.ptPay:hover{border-color:#95e87f!important;background-color: #72bd5e38!important}
a.ptPay{display:inline-flex;align-items:center}
</style>`;

	return `<a href="${link}" class="ptPay" style="${style}">${getTitle('pay', props, 'html')}</a>${stylePayto}`;
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
font:16px/20px BlinkMacSystemFont, -apple-system, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
border:1px solid #878fc5;
border-radius:16px;
text-decoration:none;
height:fit-content;
transition:all .15s cubic-bezier(.4, 0, .2, 1);
white-space:nowrap;
`;
const styleDonateto = `
<style>
a.ptDonate>strong{font-style:italic;margin-right:4px}
a.ptDonate>strong>span{color:#5675ff}
a.ptDonate>svg{vertical-align:-3px;margin-right:2px}
a.ptDonate:hover{border-color:#b6c2f4!important;background-color: #849dfc38!important}
a.ptDonate{display:inline-flex;align-items:center}
</style>`;

	return `<a href="${link}" class="ptDonate" style="${style}">${getTitle('donate', props, 'html')}</a>${styleDonateto}`;
};

/**
 * It takes a link and a props object and returns a string of HTML that can be used to render a
 * payment button
 * @param {string} link - The link to the payment page.
 * @param props - The props object that was used to initialized store.
 * @returns A string of HTML code that will be used to create a payment button.
 */
const generateTailwindPaymentButton = (link: string, props: Record<string, any>) => {
	return `<a href="${link}" class="inline-flex items-center cursor-pointer px-3 py-1.5 bg-[#72bd5e20] hover:bg-[#72bd5e38] !text-[#72bd5e] font-sans leading-5 border border-[#639953] rounded-full !no-underline h-fit whitespace-nowrap transition-all duration-150 ease-in-out hover:border-[#95e87f] hover:text-[#95e87f] font-sans group">${getTitle('pay', props, 'tailwind')}</a>`;
};

/**
 * It takes a link and a props object and returns a string of HTML that can be used to render a
 * donation button
 * @param {string} link - The link to the donation page.
 * @param props - The props object that was used to initialized store.
 * @returns A string of HTML code that will be used to create a donation button.
 */
const generateTailwindDonationButton = (link: string, props: Record<string, any>) => {
	return `<a href="${link}" class="inline-flex items-center cursor-pointer px-3 py-1.5 bg-[#849dfc20] hover:bg-[#849dfc38] !text-[#849dfc] font-sans leading-5 border border-[#878fc5] rounded-full !no-underline h-fit whitespace-nowrap transition-all duration-150 ease-in-out hover:border-[#b6c2f4] hover:text-[#b6c2f4] font-sans group">${getTitle('donate', props, 'tailwind')}</a>`;
};

/**
 * It takes a type and a set of properties, and returns a meta tag
 * @param {ITransitionType} type - The type of the meta tag.
 * @param props - The props object that was used to initialized store.
 * @returns A string of HTML that will be used to create a meta tag.
 */
const generateMetaTag = (type: ITransitionType, props: Record<string, any>, wellKnown: boolean = false) => {
	let property = `${type}`;
	if (type === 'ican' && props.network) {
		if (props.network !== 'other') {
			if (props.chain > 0) {
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
	} else if (type === 'intra' && props.bic) {
		property += `:${props.bic.toLowerCase()}`;
	}

	const content = META_CONTENT[type](props);

	return wellKnown ? `{"${property}": "${content}"}` : `<meta property="${property}" content="${content}" />`;
};

/**
 * It takes in a type, props, and payload, and returns an array of objects
 * @param {ITransitionType} type - The type of the link. This is used to generate the meta tag.
 * @param props - The props object that was used to initialized store.
 * @param {IPayload[]} payload - The payload that was generated by the user.
 */
export const generate = (type: ITransitionType, props: any, payload: IPayload[]): IOutput[] => {
	const link = generateLink(payload, props);
	if (props.language) {
		setLocaleFromPaytoData(props.language);
	}

	return [
		{ label: 'Link', value: link, length: link.length },
		{ label: 'Markdown', value: generateMarkDown(link, props) },
		{ label: 'HTML Link', value: generateHtmlLink(link, props) },
		{
			label: 'HTML Payment Button',
			value: generateHtmlPaymentButton(link, props),
			previewable: true,
			type: 'payment'
		},
		{
			label: 'HTML Donation Button',
			value: generateHtmlDonationButton(generateLink(payload, props, true), props),
			previewable: true,
			type: 'donation'
		},
		{ label: 'Tailwind Payment Button', value: generateTailwindPaymentButton(link, props), type: 'payment' },
		{ label: 'Tailwind Donation Button', value: generateTailwindDonationButton(generateLink(payload, props, true), props), type: 'donation' },
		{ label: 'FinTag (Meta Tag)', note: 'Basic payment instructions only.', value: generateMetaTag(type, props) },
		{ label: 'FinTag (Well-Known)', note: '/.well-known/fintag.json file', value: generateMetaTag(type, props, true) }
	];
};

interface IWebLinkOptions {
	payload?: IPayload[];
	network?: ITransitionType;
	networkData?: any;
	design?: boolean;
	doante?: boolean;
	transform?: boolean;
}

export const getWebLink = ({
	payload,
	network,
	networkData,
	design = false,
	doante = false,
	transform = false
}: IWebLinkOptions): string => {
	if (!network || !networkData) return '#';

	const domain = (import.meta.env.DEV || publicEnv.PUBLIC_ENV === 'preview')
		? (publicEnv.PUBLIC_DEV_SERVER_URL || (`http://localhost:${import.meta.env.VITE_DEV_SERVER_PORT || 5173}`))
		: 'https://payto.money';

	const finalPayload = payload ?? [
		{
			value: networkData.network === 'other'
				? networkData.other?.toLowerCase()
				: networkData.network
		},
		{
			value: networkData.destination
		}
	];

	const props = {
		...networkData,
		params: {
			...networkData.params,
			...(design ? { design: networkData.design } : {})
		}
	};

	const link = generateLink(finalPayload, props, doante);
	return link ? (transform ? `${domain}/${link.slice(5)}` : link) : '#';
};

export const generateWebLink = (link: string) => {
	if (!link) return '#';

	const domain = (import.meta.env.DEV || publicEnv.PUBLIC_ENV === 'preview')
		? (publicEnv.PUBLIC_DEV_SERVER_URL || (`http://localhost:${import.meta.env.VITE_DEV_SERVER_PORT || 5173}`))
		: 'https://payto.money';

	return `${domain}/${link.slice(5)}`;
}
