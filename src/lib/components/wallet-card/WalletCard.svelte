<script context="module" lang="ts">
	declare class NDEFReader {
		scan(options?: { signal?: AbortSignal }): Promise<void>;
		addEventListener(type: string, callback: () => void): void;
		removeAllListeners(): void;
	}
</script>

<script lang="ts">
	import { derived, get, type Readable } from 'svelte/store';
	import { constructor } from '$lib/store/constructor.store';
	import { getAddress } from '$lib/helpers/get-address.helper';
	import { getCurrency } from '$lib/helpers/get-currency.helper';
	import { getNetwork } from '$lib/helpers/get-network.helper';
	import { calculateColorDistance } from '$lib/helpers/euclidean-distance.helper';
	import { getWebLink } from '$lib/helpers/generate.helper';
	import { Qr } from '$lib/components';
	import ExchNumberFormat from 'exchange-rounding';
	import Payto from 'payto-rl';
	import { deviceSherlock } from 'device-sherlock';
	import { writable } from 'svelte/store';
	import { ASSETS_NAMES } from '$lib/constants/asset-names';
	import { getCategoryByValue } from '$lib/helpers/get-category-by-value.helper';
	import { onDestroy } from 'svelte';

	// @ts-expect-error: Module is untyped
	import pkg from 'open-location-code/js/src/openlocationcode';
	import ICAN from '@blockchainhub/ican';
	const { decode } = pkg;

	export let hostname: ITransitionType | undefined = undefined;
	export let url: string | null = null;
	export let authority: string | undefined = undefined;

	let hasUrl: boolean = false;
	let noData: boolean = true;
	const bareUrl = writable<string | null>(null);
	let formatter: Readable<ExchNumberFormat> | undefined;
	interface FlexiblePaytoData {
		hostname: string;
		paymentType: string;
		colorBackground: string;
		colorForeground: string;
		rtl: boolean | Readable<boolean>;
		value: number | Readable<number> | undefined;
		address: string | Readable<string> | undefined;
		organization: string | Readable<string> | undefined;
		organizationImage: string | undefined;
		currency: string | null | undefined;
		network: string | Readable<string> | undefined;
		item: string | Readable<string> | undefined;
		location: string | Readable<string> | undefined;
		recurring: string | Readable<string> | undefined;
		deadline: number | Readable<number> | undefined;
		purpose: string | Readable<string> | undefined;
	}

	const paytoData = writable<FlexiblePaytoData>({
		hostname: hostname || 'ican',
		paymentType: $constructor.paymentType,
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
		recurring: undefined,
		deadline: undefined,
		purpose: 'Pay',
	});

	const constructorStore = derived(constructor, $c => $c);

	// Timer state for expiration countdown
	const expirationTimeMs = writable<number | null>(null);
	const initialTimeMs = writable<number | null>(null); // Store the initial time when countdown starts
	const timeRemaining = writable<number>(0);

	// Calculate percentage based on actual initial time, not fixed 30 minutes
	const timePercentage = derived(
		[timeRemaining, initialTimeMs],
		([$timeRemaining, $initialTimeMs]) => {
			if (!$initialTimeMs || !$expirationTimeMs) return 0;
			return Math.min(100, Math.max(0, ($timeRemaining / $initialTimeMs) * 100));
		}
	);

	const formattedTimeRemaining = derived(timeRemaining, $timeRemaining => {
		if ($timeRemaining <= 0) return '00:00';
		const minutes = Math.floor($timeRemaining / 60000);
		const seconds = Math.floor(($timeRemaining % 60000) / 1000);
		return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
	});

	let timerInterval: ReturnType<typeof setInterval> | null = null;

	// Add a new store to track expiration state
	const isExpired = writable<boolean>(false);

	// Store the calculated deadline timestamp in a persistent store
	const calculatedDeadlineMs = writable<number | null>(null);

	function startExpirationTimer() {
		if (!$expirationTimeMs) return;

		// Clear any existing interval first to prevent duplicates
		if (timerInterval) {
			clearInterval(timerInterval);
		}

		// Update immediately before starting the interval
		const updateTimer = () => {
			const now = Date.now();
			const remaining = Math.max(0, $expirationTimeMs - now);
			timeRemaining.set(remaining);

			if (remaining <= 0) {
				// Set expired state to true when timer reaches zero
				isExpired.set(true);

				if (timerInterval) {
					clearInterval(timerInterval);
					timerInterval = null;
				}
			}
		};

		// Initial update
		updateTimer();

		// Calculate the time until the next full second
		const msToNextSecond = 1000 - (Date.now() % 1000);

		// First set a timeout to align with the next second boundary
		setTimeout(() => {
			// Update once at the second boundary
			updateTimer();

			// Then start the interval aligned with second boundaries
			timerInterval = setInterval(updateTimer, 1000);
		}, msToNextSecond);
	}

	function formatAdr(str: string | undefined) {
		return str ? `/${str.substring(0, 4).toUpperCase()}…${str.substring(str.length - 4).toUpperCase()}` : '';
	}

	function defineColors(colorF: string | null | undefined, colorB: string | null | undefined) {
		let colorForeground = '#192a14';
		let colorBackground = '#77bc65';
		if (colorF) {
			const colorDistance = Math.floor(calculateColorDistance(colorF, colorB || colorBackground));
			colorForeground = colorDistance > 100 ? colorF.startsWith('#') ? colorF : `#${colorF}` : '#192a14';
		}

		if (colorB) {
			const colorDistance = Math.floor(calculateColorDistance(colorF || colorForeground, colorB));
			colorBackground = colorDistance > 100 ? colorB.startsWith('#') ? colorB : `#${colorB}` : '#77bc65';
		}

		return { colorForeground, colorBackground };
	}

	function getLocationCode(plusCode: string): [number, number] {
		const codeArea = decode(plusCode);
		return [codeArea.latitudeCenter, codeArea.longitudeCenter];
	}

	const hostnameStore = derived([paytoData, constructorStore], ([$data, $_]) => {
		if (!$data.hostname) return '';
		return typeof $data.hostname === 'string' ? $data.hostname.toUpperCase() : String($data.hostname).toUpperCase();
	});

	const networkStore = derived([paytoData, constructorStore], ([$data, $_]) => {
		if (!$data.network) return '';
		return typeof $data.network === 'string' ? $data.network.toUpperCase() : $data.network.toString().toUpperCase();
	});

	const addressStore = derived([paytoData, constructorStore], ([$data, $_]) => {
		if (!$data.address) return '';
		return typeof $data.address === 'string' ? $data.address : $data.address.toString();
	});

	$: {
		if (url && !hasUrl) {
			noData = false;
			hasUrl = true;
			bareUrl.set(url);

			const payto = new Payto(url).toJSONObject();
			const { colorForeground, colorBackground } = defineColors(payto.colorForeground, payto.colorBackground);
			const paytoParams = new URLSearchParams(payto.search);

			paytoData.set({
				hostname: payto.hostname || 'ican',
				paymentType: getCategoryByValue(payto.hostname!) || 'ican',
				value: payto.value ? Number(payto.value) : undefined,
				address: payto.hostname === 'void' ? payto.location! : (payto.address || undefined),
				colorBackground,
				colorForeground,
				organization: payto.organization || undefined,
				organizationImage: undefined,
				currency: payto.currency ?
					payto.currency[1] ?
						payto.currency[1] :
						payto.currency[0] :
					getCurrency($constructorStore.networks[getCategoryByValue(payto.hostname!) as ITransitionType], getCategoryByValue(payto.hostname!) as ITransitionType),
				network: payto.hostname === 'void' ? payto.void! : payto.network,
				item: payto.item || undefined,
				location: payto.location || undefined,
				recurring: payto.recurring || undefined,
				rtl: payto.rtl || false,
				deadline: payto.deadline || undefined,
				purpose: paytoParams.get('donate') === '1' ? 'Donate' : 'Pay',
			});

			formatter = derived(
				[constructorStore, hostnameStore],
				([$constructor, $hostname]) => {
					const currency = $paytoData?.currency || '';
					return new ExchNumberFormat(undefined, {
						style: 'currency',
						currency,
						currencyDisplay: 'symbol'
					});
				}
			);
		} else if (hostname) {
			noData = false;
			hasUrl = true;
			url = getWebLink({
				network: hostname,
				networkData: {
					...$constructorStore.networks[hostname],
					design: $constructorStore.design
				},
				design: true,
				transform: true
			});
			const paytoParams = new URLSearchParams(url?.split('?')?.[1]);

			bareUrl.set(getWebLink({
				network: hostname,
				networkData: {
					...$constructorStore.networks[hostname],
					design: $constructorStore.design
				},
				design: true,
				transform: false
			}));

			const paytoStore = derived(constructorStore, ($store) => {
				const { colorForeground, colorBackground } = defineColors($store.design.colorF, $store.design.colorB);

				return {
					hostname,
					paymentType: $store.paymentType,
					colorBackground,
					colorForeground,
					currency: getCurrency($store.networks[hostname], hostname),
					value: $store.networks[hostname]?.params?.amount?.value,
					address: getAddress($store.networks[hostname], hostname),
					organization: authority ? authority.toUpperCase() : $store.design.org,
					organizationImage: undefined,
					network: getNetwork($store.networks[hostname], hostname, true),
					item: $store.design.item,
					location: $store.networks[hostname]?.params?.loc?.value,
					recurring: $store.networks[hostname]?.params?.rc?.value ?? '',
					rtl: $store.design.rtl || false,
					deadline: $store.networks[hostname]?.params?.dl?.value,
					purpose: paytoParams.get('donate') === '1' ? 'Donate' : 'Pay',
				};
			});

			paytoStore.subscribe((value) => {
				paytoData.set(value);
			});

			formatter = derived(
				[constructorStore, hostnameStore],
				([$constructor, $hostname]) => {
					const currency = $paytoData?.currency || '';
					return new ExchNumberFormat(undefined, {
						style: 'currency',
						currency,
						currencyDisplay: 'symbol'
					});
				}
			);
		}
	}

	const formattedValue = derived(
		[paytoData],
		([$data]) => {
			const value = $data?.value;

			return value ? $formatter?.format(Number(value)) : 'Custom Amount';
		}
	);

	let dynamicUrl = derived([constructorStore, writable(hostname)], ([$constructor, $hostname]) => {
		if (!$hostname) return null;
		return getWebLink({
			network: $hostname,
			networkData: {
				...$constructor.networks[$hostname],
				design: $constructor.design
			},
			design: true,
			transform: true
		});
	});

	let dynamicBareUrl = derived([constructorStore, writable(hostname)], ([$constructor, $hostname]) => {
		if (!$hostname) return null;
		const network = $constructor.paymentType as ITransitionType;

		const links = get(constructor.build(network));
		const webLink = links.find((link) => link.label === 'Link');

		return webLink?.value;
	});

	const currentUrl = derived(
		[writable(url), dynamicUrl],
		([$url, $dynamicUrl]) => $url || $dynamicUrl
	);

	const currentBareUrl = derived(
		[bareUrl, dynamicBareUrl],
		([$url, $dynamicBareUrl]) => {
			const safeUrl = $url ?? '';
			const safeDynamicBareUrl = $dynamicBareUrl ?? '';

			return safeDynamicBareUrl.length > safeUrl.length ? safeDynamicBareUrl : safeUrl;
		}
	);

	const currentBareUrlString = derived(currentBareUrl, $url => $url || '');

	const qrcodeValue = derived(currentBareUrlString, $url => {
		if (!$url) return '';

		const hasQueryParams = $url.includes('?');

		if (!hasQueryParams) {
			return $url;
		}

		const [baseUrl, queryString] = $url.split('?');
		const searchParams = new URLSearchParams(queryString);

		searchParams.delete('org');
        searchParams.delete('item');
        searchParams.delete('color-f');
        searchParams.delete('color-b');
        searchParams.delete('barcode');
        searchParams.delete('rtl');

		const formattedParams = searchParams.toString();

		return formattedParams ? `${baseUrl}?${formattedParams}` : baseUrl;
	});

	const barcodeValue = derived(
		[networkStore, addressStore],
		([$network, $address]) => `${$network}${formatAdr($address)}`
	);

	function linkLocation(location: string | Readable<string> | null | undefined): string {
		if (!location) return '';
		const loc = location instanceof Object ? location.toString() : location;
		if ($paytoData.network === 'geo') {
			return deviceSherlock.isDesktop
				? `https://www.google.com/maps/dir/?api=1&origin=Current+Location&destination=${loc}`
				: `geo:${loc}`;
		} else if ($paytoData.network === 'plus') {
			const plusCoordinates = getLocationCode(loc);
			if (deviceSherlock.isDesktop) {
				return `https://www.google.com/maps/dir/?api=1&origin=Current+Location&destination=${plusCoordinates[0]},${plusCoordinates[1]}`;
			} else {
				return `geo:${plusCoordinates[0]},${plusCoordinates[1]}`;
			}
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
		if (!currentUrl) return;

		const reader = await $nfcReader;
		if (!reader) return;

		isStreaming = !isStreaming;

		if (isStreaming) {
			try {
				reader.addEventListener('reading', () => {
					reader.scan({ signal: new AbortController().signal });
				});
			} catch (error) {
				console.error('Failed to stream NFC:', error);
				isStreaming = false;
			}
		} else {
			reader.removeAllListeners();
		}
	}

	function truncateToTwoDecimals(num: number) {
		return parseFloat(num.toFixed(3).slice(0, -1));
	}

	function shortenEmail(email: string) {
		const [localPart, domain] = email.split("@");
		if (!domain) return email;

		const domainParts = domain.split(".");
		const mainDomain = domainParts.slice(-2).join(".");

		if (localPart.length <= 4) {
			return `${localPart}@${mainDomain}`;
		}

		return `${localPart.slice(0, 2)}…${localPart.slice(-1)}@${mainDomain}`;
	}

	function shortenAddress(address: string | Readable<string> | undefined): string {
		if (!address) return '';
		let finalAddress = '';

		if ($paytoData.network === 'geo') {
			const [lat, lon] = address.toString().split(',');
			finalAddress = `${truncateToTwoDecimals(Number(lat))},${truncateToTwoDecimals(Number(lon))}`;
		} else if ($paytoData.network === 'plus') {
			finalAddress = address.toString().slice(0, 8);
		} else {
			if ($paytoData.paymentType === 'upi' || $paytoData.paymentType === 'pix') {
				finalAddress = shortenEmail(address.toString());
			} else {
				const extractedAddress = typeof address === 'string' ? address : get(address);
				finalAddress = extractedAddress.length <= 9 ? extractedAddress : `${extractedAddress.slice(0, 4).toUpperCase()}…${extractedAddress.slice(-4).toUpperCase()}`
			}
		}

		return finalAddress;
	}

	// Function to check if a payment is expired
	function isPaymentExpired(deadline: number | Date | undefined): boolean {
		if (!deadline) return false;

		const deadlineValue = deadline instanceof Object ? Number(deadline) : Number(deadline);

		// If it's a relative deadline (1-60 minutes), rely only on the timer
		if (deadlineValue >= 1 && deadlineValue <= 60) {
			return $isExpired;
		}

		// Otherwise, check if the timestamp is in the past
		return deadlineValue < Math.floor(Date.now() / 1000) || $isExpired;
	}

	// Check if already expired on initialization
	$: if ($paytoData.deadline) {
		let deadlineTimestamp: number;
		const deadlineValue = $paytoData.deadline instanceof Object
			? Number($paytoData.deadline)
			: Number($paytoData.deadline);

		// Only recalculate the deadline if it hasn't been set yet or if the deadline value changed
		if ($calculatedDeadlineMs === null) {
			// Check if deadline is a one or two-digit number (1-60)
			if (deadlineValue >= 1 && deadlineValue <= 60) {
				// Treat as minutes from current time
				deadlineTimestamp = Date.now() + (deadlineValue * 60 * 1000);
				calculatedDeadlineMs.set(deadlineTimestamp);
			} else {
				// Treat as Unix timestamp in seconds
				deadlineTimestamp = deadlineValue * 1000;
				calculatedDeadlineMs.set(deadlineTimestamp);
			}
		} else {
			deadlineTimestamp = $calculatedDeadlineMs;
		}

		const now = Date.now();

		// Set initial expired state
		const isCurrentlyExpired = deadlineTimestamp <= now;
		isExpired.set(isCurrentlyExpired);

		// Only start timer if not already expired
		if (!isCurrentlyExpired) {
			const timeUntilDeadline = deadlineTimestamp - now;

			// For relative deadlines (1-60 minutes), always show the countdown
			// regardless of the 30-minute limit
			const isRelativeDeadline = deadlineValue >= 1 && deadlineValue <= 60;

			if (timeUntilDeadline > 0 && (isRelativeDeadline || timeUntilDeadline <= 30 * 60 * 1000)) {
				expirationTimeMs.set(deadlineTimestamp);
				timeRemaining.set(timeUntilDeadline);
				initialTimeMs.set(timeUntilDeadline); // Store initial time for percentage calculation

				// Start timer if it's not already running
				if (!timerInterval) {
					startExpirationTimer();
				}
			} else if (timeUntilDeadline > 30 * 60 * 1000 && !isRelativeDeadline) {
				// If deadline is more than 30 minutes away and not a relative deadline,
				// hide countdown and stop timer
				if (timerInterval) {
					clearInterval(timerInterval);
					timerInterval = null;
				}
				expirationTimeMs.set(null);
				initialTimeMs.set(null);
				timeRemaining.set(0);
			}
		} else {
			// If already expired, clear the timer and ensure expired state is true
			if (timerInterval) {
				clearInterval(timerInterval);
				timerInterval = null;
			}
			timeRemaining.set(0);
			isExpired.set(true);
		}
	} else {
		// If deadline is removed, clear the timer and reset expired state
		if (timerInterval) {
			clearInterval(timerInterval);
			timerInterval = null;
		}
		expirationTimeMs.set(null);
		initialTimeMs.set(null);
		timeRemaining.set(0);
		isExpired.set(false);
		calculatedDeadlineMs.set(null); // Reset the calculated deadline
	}

	onDestroy(() => {
		if (timerInterval) {
			clearInterval(timerInterval);
			timerInterval = null;
		}
	});
</script>

<div>
	{#if noData}
		<div class={`card rounded-lg shadow-md font-medium print:border-2 print:border-black`} style="background-color: {$paytoData.colorBackground}; color: {$paytoData.colorForeground};">
			<div class="flex items-center p-4">
				<div class="flex-grow flex justify-between items-center">
					<span class="text-l font-medium font-semibold" style="color: {$paytoData.colorForeground};">
						{#if $paytoData.organization}
							{$paytoData.organization}
						{:else}
							PayTo
						{/if}
					</span>
				</div>
			</div>

			<div class="flex flex-col items-center justify-center py-8 px-4 text-center" style="background-color: {$paytoData.colorForeground}; color: {$paytoData.colorBackground};">
				<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mb-4">
					<circle cx="12" cy="12" r="10"/>
					<path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
					<line x1="12" y1="17" x2="12.01" y2="17"/>
				</svg>
				<h2 class="text-xl font-bold mb-2">No Payment Data Provided</h2>
				<p class="text-sm opacity-80 max-w-xs">No payment information was provided for this request. You can create a new payment link at the home page.</p>
			</div>

			<div class="p-4 flex justify-center">
				<a href="/" class="inline-flex items-center px-4 py-2 rounded-md transition-colors duration-200 bg-zinc-700/50 hover:bg-zinc-700/70 text-zinc-300 border border-zinc-600 hover:border-zinc-500">
					<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2">
						<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
						<polyline points="9 22 9 12 15 12 15 22"/>
					</svg>
					Create New Link
				</a>
			</div>
		</div>
	{:else if isPaymentExpired(typeof $paytoData.deadline === 'object' && 'subscribe' in $paytoData.deadline ? get($paytoData.deadline) : $paytoData.deadline)}
		<div class={`card rounded-lg shadow-md font-medium print:border-2 print:border-black`} style="background-color: {$paytoData.colorBackground}; color: {$paytoData.colorForeground};">
			<div class="flex items-center p-4">
				<div class="flex-grow flex justify-between items-center">
					<span class="text-l font-medium font-semibold" style="color: {$paytoData.colorForeground};">
						{#if $paytoData.organization}
							{$paytoData.organization}
						{:else}
							PayTo
						{/if}
					</span>
				</div>
			</div>

			<div class="flex flex-col items-center justify-center py-8 px-4 text-center" style="background-color: {$paytoData.colorForeground}; color: {$paytoData.colorBackground};">
				<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mb-4">
					<circle cx="12" cy="12" r="10"/>
					<line x1="12" y1="8" x2="12" y2="12"/>
					<line x1="12" y1="16" x2="12.01" y2="16"/>
				</svg>
				<h2 class="text-xl font-bold mb-2">Payment Request Expired</h2>
				<p class="text-sm opacity-80 max-w-xs">This payment request has expired and is no longer valid. Please contact the recipient for a new payment link.</p>
			</div>

			<div class="p-4 flex justify-center">
				<div class="text-sm opacity-70">
					{#if $paytoData.value && Number($paytoData.value)>0}
						Original amount: {$formattedValue}
					{/if}
					{#if $paytoData.item}
						{$paytoData.value ? ' • ' : ''}Item: {$paytoData.item}
					{/if}
				</div>
			</div>
		</div>
	{:else}
		<div class={`card rounded-lg shadow-md font-medium print:border-2 print:border-black`} style="background-color: {$paytoData.colorBackground}; color: {$paytoData.colorForeground};">
			{#if $paytoData.rtl !== undefined && $paytoData.rtl === true}
				<div class="flex items-center p-4">
					<div class="flex-grow flex justify-between items-center">
						<div class="text-left">
							<div class="text-sm uppercase">{$paytoData.purpose}</div>
							<div class="font-semibold">
								{#if $paytoData.recurring}
									<span class="uppercase">{$paytoData.recurring}</span> Recurring
								{:else}
									One‑time
								{/if}
							</div>
						</div>
						<span class="text-l font-medium font-semibold" style="color: {$paytoData.colorForeground};">
							{#if $paytoData.organization}
								{$paytoData.organization}
							{:else}
								PayTo
							{/if}
						</span>
					</div>
					{#if $paytoData.organizationImage}
						<img src={$paytoData.organizationImage} alt="Organization" class="ml-4 max-w-10 max-h-10" />
					{/if}
				</div>
			{:else}
				<div class="flex items-center p-4">
					{#if $paytoData.organizationImage}
						<img src={$paytoData.organizationImage} alt="Organization" class="ml-4 max-w-10 max-h-10" />
					{/if}
					<div class="flex-grow flex justify-between items-center">
						<span class="text-l font-medium font-semibold" style="color: {$paytoData.colorForeground};">
							{#if $paytoData.organization}
								{$paytoData.organization}
							{:else}
								PayTo
							{/if}
						</span>
						<div class="text-right">
							<div class="text-sm uppercase">{$paytoData.purpose}</div>
							<div class="font-semibold">
								{#if $paytoData.recurring}
									Recurring <span class="uppercase">{$paytoData.recurring}</span>
								{:else}
									One‑time
								{/if}
							</div>
						</div>
					</div>
				</div>
			{/if}

			{#if $expirationTimeMs}
				<div class="px-4 pb-2 pt-0">
					<div class={`flex ${$paytoData.rtl ? 'flex-row-reverse' : 'flex-row'} justify-between items-center mb-1`}>
						<span class="text-sm" style="color: {$paytoData.colorForeground};">Expires in</span>
						<span class="text-sm font-medium" style="color: {$paytoData.colorForeground};">{$formattedTimeRemaining}</span>
					</div>
					<div class="w-full bg-black/20 rounded-full h-1.5">
						<div class="h-1.5 rounded-full transition-all duration-1000 ease-linear"
							class:bg-emerald-500={$timePercentage > 50}
							class:bg-amber-500={$timePercentage <= 50 && $timePercentage > 20}
							class:bg-red-500={$timePercentage <= 20}
							style="width: {$timePercentage}%"></div>
					</div>
				</div>
			{/if}

			<div class="flex items-center pt-12 pb-12 justify-center w-full print:outline-2 print:outline-black" style="background-color: {$paytoData.colorForeground}; color: {$paytoData.colorBackground};">
				<div class="flex items-center mx-12 print:mx-0">
					<div class="amount-text text-2xl font-medium text-wrap" style="color: {$paytoData.colorBackground};">
						{#if $paytoData.value && Number($paytoData.value)>0}
							{$formattedValue}
						{:else}
							Custom Amount
						{/if}
					</div>
				</div>
			</div>

			<div class="m-4">
				<div class="flex justify-between items-center mb-2">
					<div class={`${$paytoData.rtl !== undefined && $paytoData.rtl === true ? 'text-right' : 'text-left'} w-full`}>
						<div class="text-sm">Payment type</div>
						<div class="text-xl font-semibold">
							{$paytoData.paymentType && $paytoData.paymentType === 'void' ? 'CASH' : $paytoData.paymentType?.toUpperCase()}{$paytoData.network && `: ${ASSETS_NAMES[String($paytoData.network).toUpperCase()] ?? String($paytoData.network).toUpperCase()}`}
						</div>
					</div>
				</div>
				{#if ($paytoData.hostname === 'iban' || $paytoData.hostname === 'ach') && $paytoData.address}
					<div class="flex justify-between items-center mb-2">
						<div class={`${$paytoData.rtl !== undefined && $paytoData.rtl === true ? 'text-right' : 'text-left'} w-full`}>
							<div class="text-sm">Account Number</div>
							<div class="{$paytoData.hostname === 'iban' ? 'text-md' : 'text-xl'} font-semibold">
								{$paytoData.hostname === 'iban' ? ICAN.printFormat($paytoData.address.toString() ?? '') : $paytoData.address}
							</div>
						</div>
					</div>
				{/if}
				{#if $paytoData.currency}
				<div class="flex justify-between items-center mb-2">
					<div class={`${$paytoData.rtl !== undefined && $paytoData.rtl === true ? 'text-right' : 'text-left'} w-full`}>
						<div class="text-sm">Asset</div>
						<div class="text-xl font-semibold">
							{$paytoData.currency &&
								`${ASSETS_NAMES[String($paytoData.currency).toUpperCase()] ??
									(String($paytoData.currency).length > 8
										? `${String($paytoData.currency).substring(0, 4).toUpperCase()}…${String($paytoData.currency).substring(String($paytoData.currency).length - 4).toUpperCase()}`
										: String($paytoData.currency).toUpperCase()
									)
								}`
							}
						</div>
					</div>
				</div>
				{/if}
				{#if $paytoData.item}
					<div class="flex justify-between items-center mb-2">
						<div class={`${$paytoData.rtl !== undefined && $paytoData.rtl === true ? 'text-right' : 'text-left'} w-full`}>
							<div class="text-sm">Item</div>
							<div class="text-xl font-semibold break-words">
								{$paytoData.item}
							</div>
						</div>
					</div>
				{/if}
			</div>

			{#if currentUrl}
				<div class="flex justify-center items-center m-4 mt-5 flex-col">
					{#if (($paytoData.network === 'geo' || $paytoData.network === 'plus') && $paytoData.location)}
						<div class="flex justify-between items-center mb-6 print:hidden">
							<div class={`${$paytoData.rtl !== undefined && $paytoData.rtl === true ? 'text-right' : 'text-left'} w-full`}>
								<div class="flex text-xl font-semibold break-words">
									<a class="button is-full lg:basis-1/2 bs-12 py-2 px-3 text-center border rounded-md transition duration-200 outline-none focus-visible:ring focus-visible:ring-green-800 focus-visible:ring-offset-2 active:scale-(0.99) text-sm ${$paytoData.location ? 'cursor-pointer' : 'cursor-not-allowed'}"
										 style="border-color: {$paytoData.colorForeground}; background-color: {$paytoData.colorForeground}; color: {$paytoData.colorBackground};"
										 href={linkLocation($paytoData.location)}
										 target="_blank"
										 rel="noreferrer"
									>Navigate</a>
								</div>
							</div>
						</div>
					{/if}
					<div class="p-4 rounded-lg inline-flex justify-center items-center bg-white">
						<div class="text-center">
							<Qr param={$qrcodeValue} />
							<div class="text-sm mt-2 text-black">{$paytoData.network ? $paytoData.network.toString().toUpperCase() : $paytoData.paymentType.toUpperCase()}{$paytoData.address ? `/${shortenAddress($paytoData.address)}` : ''}</div>
						</div>
					</div>
				</div>
			{/if}

			<div class={`flex ${$paytoData.rtl !== undefined && $paytoData.rtl === true ? 'flex-row-reverse justify-between' : 'justify-between'} items-center p-4 print:hidden`}>
				<a
					href={$currentBareUrl}
					rel="noreferrer"
					class="transition-opacity hover:opacity-80"
					style="cursor: pointer; background: none; border: none; padding: 0;"
					aria-label="Pay via App"
					title="Pay via App"
				>
					<svg
						viewBox="0 0 36 36"
						xmlns="http://www.w3.org/2000/svg"
						style="width: 36px; height: 36px; fill: none; stroke: {$paytoData.colorForeground}; stroke-width: 3; stroke-linecap: round; stroke-linejoin: round;"
					>
						<path d="M25.5 21h.02"/>
						<path d="M10.5 10.5h18a3 3 0 0 1 3 3v15a3 3 0 0 1-3 3H7.5a3 3 0 0 1-3-3V7.5a3 3 0 0 1 3-3h21"/>
					</svg>
				</a>
				<button
					on:click={handleNfcClick}
					class="transition-opacity hover:opacity-80"
					style="cursor: {$nfcSupported ? 'pointer' : 'not-allowed'}; background: none; border: none; padding: 0;"
					aria-label="Tap to Pay"
					title="Tap to Pay"
					disabled={!$nfcSupported}
				>
					<svg
						viewBox="0 0 36 36"
						xmlns="http://www.w3.org/2000/svg"
						style="fill-rule:evenodd; clip-rule:evenodd; stroke-linejoin:round; stroke-miterlimit:2; width:36px; height:36px; fill:{$paytoData.colorForeground};"
					>
						<path d="M26.647,0.749c4.225,8.44 3.966,16.42 3.933,17.263c0.033,0.734 0.292,8.725 -3.933,17.165c-0,0 -1.101,1.266 -2.736,0.507c-1.634,-0.76 -1.069,-2.784 -1.069,-2.784c0,0 3.424,-6.649 3.334,-14.815l0.001,-0.127c0.089,-8.168 -3.335,-14.931 -3.335,-14.931c0,0 -0.565,-2.024 1.069,-2.784c1.635,-0.759 2.736,0.507 2.736,0.507Zm-8.195,3.795c3.446,6.327 3.212,12.625 3.179,13.468c0.033,0.734 0.267,6.778 -3.174,13.616c0,0 -1.1,1.265 -2.735,0.507c-1.635,-0.76 -1.069,-2.784 -1.069,-2.784c0,-0 2.215,-3.17 2.574,-11.267l0.002,-0.127c-0.235,-8.098 -2.58,-11.135 -2.58,-11.135c0,0 -0.566,-2.024 1.069,-2.784c1.634,-0.76 2.734,0.506 2.734,0.506Zm-11.469,8.166c2.882,0 5.222,2.353 5.222,5.253c-0,2.899 -2.34,5.253 -5.222,5.253c-2.882,-0 -5.222,-2.354 -5.222,-5.253c-0,-2.9 2.34,-5.253 5.222,-5.253Z" style="fill-rule:nonzero;"/>
					</svg>
				</button>
			</div>
		</div>
	{/if}
</div>
