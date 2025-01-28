<script lang="ts">
	import { derived, type Readable } from 'svelte/store';
	import { constructor } from '$lib/store/constructor.store';
	import { getAddress } from '$lib/helpers/get-address.helper';
	import { getCurrency } from '$lib/helpers/get-currency.helper';
	import { getNetwork } from '$lib/helpers/get-network.helper';
	import { calculateColorDistance } from '$lib/helpers/euclidean-distance.helper';
	import { Qr } from '$lib/components';
	import ExchNumberFormat from 'exchange-rounding';
	import Payto from 'payto-rl';
	import { deviceSherlock } from 'device-sherlock';
	import { writable } from 'svelte/store';

	export let hostname: ITransitionType | undefined = undefined;
	export let url: string | null = null;

	const iconLogoSize: string = 'h-10 w-10';
	let noData: boolean = false;

	interface FlexiblePaytoData {
		hostname: string;
		colorBackground: string;
		colorForeground: string;
		rtl: boolean | Readable<boolean>;
		value: number | Readable<number> | undefined;
		address: string | Readable<string> | undefined;
		organization: string | Readable<string> | undefined;
		organizationImage: string | undefined;
		currency: string | undefined;
		network: string | Readable<string> | undefined;
		item: string | Readable<string> | undefined;
		location: string | Readable<string> | undefined;
		recurring: string | Readable<string> | undefined;
	}

	let paytoData: FlexiblePaytoData = {
		hostname: hostname || 'ican',
		colorBackground: '#77bc65',
		colorForeground: '#192a14',
		rtl: false,
		value: undefined,
		address: undefined,
		organization: undefined,
		organizationImage: undefined,
		currency: undefined,
		network: undefined,
		item: undefined,
		location: undefined,
		recurring: undefined
	};

	const constructorStore = derived(constructor, $c => $c);

	function formatAdr(str: string | undefined) {
		return str ? `/${str.substring(0, 4).toUpperCase()}…${str.substring(str.length - 4).toUpperCase()}` : '';
	}

	function defineColors(colorF: string | null | undefined, colorB: string | null | undefined) {
		let colorForeground = '#192a14';
		let colorBackground = '#77bc65';
		if (colorF && colorB) {
			const colorDistance = Math.floor(calculateColorDistance(colorF, colorB));
			colorForeground = colorDistance < 100 ? colorF : '#192a14';
			colorBackground = colorDistance < 100 ? colorB : '#77bc65';
		}
		return { colorForeground, colorBackground };
	}

	if (url) {
		const payto = new Payto(url).toJSONObject();
		const { colorForeground, colorBackground } = defineColors(payto.colorForeground, payto.colorBackground);

		paytoData = {
			hostname: payto.hostname || 'ican',
			value: payto.value ? Number(payto.value) : undefined,
			address: payto.address || undefined,
			colorBackground,
			colorForeground,
			organization: payto.organization || undefined,
			organizationImage: undefined,
			currency: payto.currency
				? (payto.currency[1] ? payto.currency[1] : payto.currency[0]) || undefined
				: undefined,
			network: payto.network || undefined,
			item: payto.item || undefined,
			location: payto.location || undefined,
			recurring: payto.recurring || undefined,
			rtl: payto.rtl || false
		};
	} else if (hostname) {
		const { colorForeground, colorBackground } = defineColors($constructorStore.design.colorF, $constructorStore.design.colorB);

		const derivedValues = {
			value: derived(constructorStore, $c => $c.networks[hostname]?.params?.amount?.value),
			address: derived(constructorStore, $c => getAddress($c.networks[hostname], hostname)),
			organization: derived(constructorStore, $c => $c.design.org),
			organizationImage: undefined,
			network: derived(constructorStore, $c => getNetwork($c.networks[hostname], hostname, true)),
			item: derived(constructorStore, $c => $c.design.item),
			location: derived(constructorStore, $c => $c.networks[hostname]?.params?.loc?.value),
			recurring: derived(constructorStore, $c => $c.networks[hostname]?.params?.rc?.value ?? ''),
			rtl: derived(constructorStore, $c => $c.design.rtl)
		};

		paytoData = {
			hostname,
			colorBackground,
			colorForeground,
			currency: 'USD',
			...derivedValues
		} as FlexiblePaytoData;
	}

	const networkStore = derived(writable(paytoData.network), $n => $n?.toString().toUpperCase() || '');
	const addressStore = derived(writable(paytoData.address), $a => $a?.toString() || '');

	const formatter = derived(
		[constructorStore, networkStore],
		([$constructor, $network]) => new ExchNumberFormat(undefined, {
			style: 'currency',
			currency: getCurrency($constructor.networks[$network], $network),
			currencyDisplay: 'symbol'
		})
	);

	const formattedValue = derived(formatter, ($formatter) => {
		const value = paytoData?.value;
		return value ? $formatter.format(Number(value)) : 'Custom Amount';
	});

	const barcodeValue = derived(
		[networkStore, addressStore],
		([$network, $address]) => `${$network}${formatAdr($address)}`
	);

	function linkLocation(location: string | Readable<string> | null | undefined): string {
		if (!location) return '';
		const loc = location instanceof Object ? location.toString() : location;
		if (paytoData.network === 'geo') {
			return deviceSherlock.isDesktop
				? `https://www.google.com/maps/dir/?api=1&origin=Current+Location&destination=${loc}`
				: `geo:${loc}`;
		} else if (paytoData.network === 'plus') {
			return deviceSherlock.isDesktop
				? `https://www.google.com/maps/place/${loc}`
				: `comgooglemaps://?q=${loc}`;
		}
		return loc || '';
	}

	const nfcSupported = derived(writable(deviceSherlock.isDesktopOrTablet), ($isDesktopOrTablet) => {
		if (!$isDesktopOrTablet) return false;
		return 'NDEFReader' in window;
	});

	const nfcReader = derived(nfcSupported, async ($supported) => {
		if (!$supported) return undefined;

		try {
			const ndef = new NDEFReader();
			await ndef.scan();
			return ndef;
		} catch (error) {
			console.warn('NFC not supported or permission denied:', error);
			alert('NFC not supported on your device.');
			return undefined;
		}
	});

	let isStreaming = false;

	async function handleNfcClick() {
		if (!url || !$nfcReader) return;

		isStreaming = !isStreaming;

		if (isStreaming) {
			try {
				await $nfcReader.addEventListener('reading', () => {
					// Continuously send the URL data while streaming
					$nfcReader.scan({ signal: new AbortController().signal });
				});
			} catch (error) {
				console.error('Failed to stream NFC:', error);
				isStreaming = false;
			}
		} else {
			// Stop streaming
			$nfcReader.removeAllListeners();
		}
	}
</script>

<div>
	<div class="card rounded-lg shadow-md font-medium" style="background-color: {paytoData.colorBackground}; color: {paytoData.colorForeground};">
		{#if paytoData.rtl !== undefined && paytoData.rtl === true}
			<div class="flex items-center p-4">
				<div class="flex-grow flex justify-between items-center">
					<div class="text-left">
							<div class="text-sm uppercase">Payment</div>
							<div class="font-semibold">{paytoData.recurring ? paytoData.recurring + ' / Recurring' : 'One‑time'}</div>
					</div>
					<span class="text-l font-medium" style="color: {paytoData.colorForeground};">
						{#if paytoData.organization}
							{paytoData.organization}
						{:else}
							PayTo
						{/if}
					</span>
				</div>
				{#if paytoData.organizationImage}
					<img src={paytoData.organizationImage} alt="Organization" class="ml-4 max-w-10 max-h-10" />
				{/if}
			</div>
		{:else}
			<div class="flex items-center p-4">
				{#if paytoData.organizationImage}
					<img src={paytoData.organizationImage} alt="Organization" class="ml-4 max-w-10 max-h-10" />
				{/if}
				<div class="flex-grow flex justify-between items-center">
					<span class="text-l font-medium" style="color: {paytoData.colorForeground};">
						{#if paytoData.organization}
							{paytoData.organization}
						{:else}
							PayTo
						{/if}
					</span>
					<div class="text-right">
						<div class="text-sm uppercase">Payment</div>
						<div class="font-semibold">{paytoData.recurring ? 'Recurring / ' + paytoData.recurring : 'One‑time'}</div>
					</div>
				</div>
			</div>
		{/if}

		<div class="flex items-center mb-7 pt-12 pb-12 justify-center" style="background-color: {paytoData.colorForeground}; color: {paytoData.colorBackground}; width: 100%;">
			<div class="flex items-center ml-12 mr-12">
				<div class="text-2xl font-medium text-wrap" style="color: {paytoData.colorBackground};">
					{#if paytoData.value && Number(paytoData.value)>0}
						{$formattedValue}
					{:else}
						Custom Amount
					{/if}
				</div>
			</div>
		</div>

		<div class="m-4">
			<div class="flex justify-between items-center mb-2">
				<div class={`${paytoData.rtl !== undefined && paytoData.rtl === true ? 'text-right' : 'text-left'} w-full`}>
					<div class="text-sm">Payment type</div>
					<div class="text-xl font-semibold">
						{paytoData.network && paytoData.network === 'void' ? 'CASH' :
							networkStore +
						(addressStore ? ': ' + addressStore : '')}
					</div>
				</div>
			</div>
			{#if paytoData.item}
				<div class="flex justify-between items-center mb-2">
					<div class={`${paytoData.rtl !== undefined && paytoData.rtl === true ? 'text-right' : 'text-left'} w-full`}>
						<div class="text-sm">Item</div>
						<div class="text-xl font-semibold break-words">
							{paytoData.item}
						</div>
					</div>
				</div>
			{/if}
			{#if paytoData.network === 'void' && (paytoData.address === 'geo' || paytoData.address === 'plus')}
				<div class="flex justify-between items-center mb-2">
					<div class={`${paytoData.rtl !== undefined && paytoData.rtl === true ? 'text-right' : 'text-left'} w-full`}>
						<div class="text-sm">Navigate</div>
						<div class="text-xl font-semibold break-words">
							<a class="transition duration-200 visited:text-gray-200 hover:text-gray-300 ${paytoData.location ? 'cursor-pointer' : 'cursor-not-allowed'}"
								style="color: {paytoData.colorForeground};"
								href={linkLocation(paytoData.location)}
								target="_blank"
								rel="noreferrer"
							>Open the navigation</a>
						</div>
					</div>
				</div>
			{/if}
		</div>

		{#if url}
			<div class="flex justify-center items-center m-4 mt-5">
				<div class="p-4 rounded-lg inline-flex justify-center items-center background-white">
					<div class="text-center">
						<Qr param={url} />
						<div class="text-sm mt-2 text-black">{$barcodeValue}</div>
					</div>
				</div>
			</div>
		{/if}

		<div class={`flex ${paytoData.rtl !== undefined && paytoData.rtl === true ? 'flex-row-reverse justify-between' : 'justify-between'} items-center p-4`}>
			<div class={`${iconLogoSize} h-10 w-10 rounded-lg flex justify-center items-center`} style="background-color: {paytoData.colorForeground}; color: {paytoData.colorBackground}; cursor: not-allowed;">
				APP
			</div>
			{#if deviceSherlock.isDesktopOrTablet}
				<button
					on:click={handleNfcClick}
					class="transition-opacity hover:opacity-80"
					style="cursor: {$nfcSupported ? 'pointer' : 'not-allowed'}; background: none; border: none; padding: 0;"
					aria-label="Stream NFC data to your device"
					disabled={!$nfcSupported}
				>
					<svg
						viewBox="0 0 36 40"
						xmlns="http://www.w3.org/2000/svg"
						style="fill-rule:evenodd; clip-rule:evenodd; stroke-linejoin:round; stroke-miterlimit:2; width:38px; height:40px; fill:{paytoData.colorForeground};"
					>
						<path d="M29.608,0.832c4.694,9.378 4.407,18.245 4.37,19.181c0.037,0.815 0.324,9.694 -4.37,19.072c-0,0 -1.223,1.407 -3.04,0.563c-1.816,-0.844 -1.188,-3.093 -1.188,-3.093c0,0 3.804,-7.388 3.704,-16.462l0.001,-0.141c0.099,-9.075 -3.705,-16.59 -3.705,-16.59c0,0 -0.628,-2.249 1.188,-3.093c1.817,-0.843 3.04,0.563 3.04,0.563Zm-9.105,4.217c3.829,7.03 3.569,14.028 3.532,14.964c0.037,0.815 0.297,7.531 -3.527,15.129c0,0 -1.222,1.406 -3.039,0.563c-1.817,-0.844 -1.188,-3.093 -1.188,-3.093c0,-0 2.461,-3.522 2.86,-12.519l0.002,-0.141c-0.261,-8.998 -2.867,-12.372 -2.867,-12.372c0,0 -0.629,-2.249 1.188,-3.093c1.816,-0.844 3.039,0.562 3.039,0.562Zm-12.743,9.073c3.202,0 5.802,2.615 5.802,5.837c-0,3.221 -2.6,5.837 -5.802,5.837c-3.202,-0 -5.802,-2.616 -5.802,-5.837c-0,-3.222 2.6,-5.837 5.802,-5.837Z" style="fill-rule:nonzero;"/>
					</svg>
				</button>
			{/if}
		</div>
	</div>

</div>
