<script context="module" lang="ts">
	declare class NDEFReader {
		scan(options?: { signal?: AbortSignal }): Promise<void>;
		write(data: any, options?: { signal?: AbortSignal }): Promise<void>;
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
	import { onDestroy, onMount } from 'svelte';
	import { blo } from "@blockchainhub/blo";
	import { X, QrCode, Nfc, Navigation2 } from 'lucide-svelte';

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
	let mode: 'qr' | 'nfc' = 'qr';
	let nfcWriteController: AbortController | null = null;
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
		mode: string | Readable<string> | undefined;
	}

	const paytoData = writable<FlexiblePaytoData>({
		hostname: hostname || 'ican',
		paymentType: $constructor.paymentType,
		colorBackground: '#2A3950',
		colorForeground: '#9AB1D6',
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
		mode: undefined
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
		let colorForeground = '#9AB1D6';
		let colorBackground = '#2A3950';
		if (colorF) {
			const colorDistance = Math.floor(calculateColorDistance(colorF, colorB || colorBackground));
			colorForeground = colorDistance > 100 ? colorF.startsWith('#') ? colorF : `#${colorF}` : '#9AB1D6';
		}

		if (colorB) {
			const colorDistance = Math.floor(calculateColorDistance(colorF || colorForeground, colorB));
			colorBackground = colorDistance > 100 ? colorB.startsWith('#') ? colorB : `#${colorB}` : '#2A3950';
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
				mode: paytoParams.get('mode') || undefined
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
					mode: paytoParams.get('mode') || undefined
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

	function getInfoDisplay(paytoData: any): string {
		let infoDisplay = '';
		if (paytoData.network) {
			infoDisplay = paytoData.network.toString().toUpperCase();
		} else {
			infoDisplay = paytoData.paymentType.toUpperCase();
		}
		if (paytoData.address) {
			infoDisplay += `/${shortenAddress(paytoData.address)}`;
		}
		return infoDisplay;
	}

	function getIdenticon(address: string | Readable<string> | undefined): string {
		if (!address) return '';
		const addr = typeof address === 'string' ? address : get(address);
		if (!addr) return '';
		return blo(addr);
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

	// Define isExpiredPayment as a reactive variable for use in the template
	$: isExpiredPayment = isPaymentExpired(
		typeof $paytoData.deadline === 'object' && 'subscribe' in $paytoData.deadline
			? get($paytoData.deadline)
			: $paytoData.deadline
	);

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

	let isUpsideDown = false;

	function updateRotationState() {
		// Check angle of screen orientation
		const angle = screen.orientation?.angle ?? 0;
		// 180 degrees means the phone is upside down in portrait mode
		isUpsideDown = angle === 180 || angle === -180;
	}

	function handleCloseOrBack() {
		if (window.history.length > 1) {
			window.history.back();
			setTimeout(() => {
				// If still on the same page after back, close the tab
				if (document.visibilityState === 'visible') {
					window.close();
				}
			}, 500);
		} else {
			window.close();
		}
	}

	function printType(paytoData: any, prefix: boolean) {
		if (paytoData.paymentType === 'void') {
			return prefix ? ` with Cash` : `Cash`;
		} else if (paytoData.paymentType === 'ican') {
			return ``; // Default to ICAN
		} else if (paytoData.network && paytoData.paymentType) {
			return prefix ? ` via ${paytoData.network.toString().toUpperCase()}` : `${paytoData.network.toString().toUpperCase()}`;
		} else if (paytoData.paymentType) {
			return prefix ? ` via ${paytoData.paymentType.toString().toUpperCase()}` : `${paytoData.paymentType.toString().toUpperCase()}`;
		}
		return '';
	}

	onMount(() => {
		updateRotationState(); // Initial check

		// Listen for orientation change
		window.addEventListener('orientationchange', updateRotationState);
		screen.orientation?.addEventListener?.('change', updateRotationState);
	});

	onDestroy(() => {
		window.removeEventListener('orientationchange', updateRotationState);
		screen.orientation?.removeEventListener?.('change', updateRotationState);
	});

	async function switchMode() {
		if (mode === 'qr') {
			mode = 'nfc';
			if ($nfcSupported) {
				try {
					if ('NDEFReader' in window) {
						nfcWriteController = new AbortController();
						const ndef = new NDEFReader();

						// Write the PayTo link to NFC
						await ndef.write({
							records: [{
								recordType: "url",
								data: $currentUrl || ''
							}]
						}, { signal: nfcWriteController.signal });

						// Continue writing in a loop for streaming
						setInterval(async () => {
							try {
								await ndef.write({
									records: [{
										recordType: "url",
										data: $currentUrl || ''
									}]
								});
							} catch (error) {
								console.warn('NFC write error:', error);
							}
						}, 1000); // Write every second
					}
				} catch (error) {
					console.warn('NFC not supported or permission denied:', error);
					mode = 'qr';
				}
			}
		} else {
			mode = 'qr';
			if (nfcWriteController) {
				nfcWriteController.abort();
				nfcWriteController = null;
			}
		}
	}
</script>

<style>
	.card {
		transition: transform 0.3s ease;
	}

	.rotated {
		transform: rotate(180deg);
	}
</style>

<!-- Tap Design -->
<div class="relative flex flex-col justify-between bg-gray-900 bg-gradient-to-b to-gray-800/90 w-full h-screen sm:h-auto min-h-[600px] sm:rounded-2xl shadow-md font-medium text-white print:border-2 print:border-black print:text-black print:shadow-none" style="background-color: {$paytoData.colorBackground};">
	<!-- Snow effect (now at the top) -->
	<div class={`absolute top-0 left-0 w-full h-16 pointer-events-none z-0 overflow-hidden print:hidden ${isExpiredPayment || noData ? 'hidden' : ''}`}>
		<div class="w-full h-full animate-pulse bg-gradient-to-b from-white/20 to-transparent sm:rounded-t-2xl"></div>
	</div>

	<!-- Top: NFC icon and message -->
	<div class={`flex flex-col items-center pt-8 mb-4 select-none z-10 ${isExpiredPayment || noData ? 'hidden' : ''}`}>
		<div class={`${isUpsideDown ? 'rotated' : ''}`}>
			{#if $nfcSupported && mode === 'nfc'}
				<Nfc class="w-16 h-16 mb-2 print:hidden" />
			{:else}
				<div class="p-4 pb-1 rounded-lg flex justify-center items-center bg-white mb-2 print:hidden">
					<div class="text-center">
						<Qr param={$qrcodeValue} />
						<div class="text-sm text-black mt-1">{getInfoDisplay($paytoData)}</div>
					</div>
				</div>
			{/if}
			<div class="p-4 pb-1 rounded-lg flex justify-center items-center bg-white mb-2 hidden print:block">
				<div class="text-center">
					<Qr param={$qrcodeValue} />
					<div class="text-sm text-black mt-1">{getInfoDisplay($paytoData)}</div>
				</div>
			</div>
		</div>
		<div class={`text-lg font-medium drop-shadow print:drop-shadow-none ${isUpsideDown ? 'rotated' : ''}`}>{$nfcSupported && mode === 'nfc' ? 'Tap' : 'Scan'} Here to {$paytoData.purpose}{printType($paytoData, true)}</div>
	</div>

	<!-- Main Card (rotated if needed) -->
	<div class="flex-1 flex items-center justify-center">
		<div class={`relative transition-transform duration-500 ${isUpsideDown ? 'rotated' : ''}`}>
			<div class="rounded-2xl bg-black/40 shadow-xl px-8 pb-4 flex flex-col items-center min-w-[320px] max-w-xs relative overflow-hidden print:shadow-none print:border-2 print:border-gray-400">
				{#if $expirationTimeMs}
					<div class="-mx-8 w-[calc(100%+4rem)] flex flex-col gap-1 mb-2">
						<div class="w-full bg-black/20 rounded-t-2xl h-2 overflow-hidden">
							<div
								class="h-2 rounded-t-2xl transition-all duration-1000 ease-linear"
								class:bg-emerald-500={$timePercentage > 50}
								class:bg-amber-500={$timePercentage <= 50 && $timePercentage > 20}
								class:bg-red-500={$timePercentage <= 20}
								style="width: {$timePercentage}%"
							></div>
						</div>
						<div class="flex justify-between text-xs px-4">
							<span class="text-gray-300">Expires in</span>
							<span class="font-medium text-gray-100">{$formattedTimeRemaining}</span>
						</div>
					</div>
				{/if}
				<div class="pt-4">
					{#if $paytoData.address}
						<div class="flex items-center justify-center mb-2">
							<div class="flex items-center justify-center">
								<img src={getIdenticon($paytoData.address)} alt="ID" class="w-14 h-14 rounded-full" />
							</div>
						</div>
					{/if}
					<div class="text-center">
						{#if $paytoData.organization}
							<div class="text-lg font-medium mb-2">{$paytoData.organization}</div>
						{/if}
						<div class="text-lg font-medium mb-1">{$paytoData.purpose}{#if $paytoData.item}{` `}for{` `}<span class="break-all">{$paytoData.item}</span>{/if}</div>
						<div class="text-4xl font-bold tracking-tigh mt-1 mb-2">
							{#if noData}
								<span class="text-3xl">No Payment</span>
							{:else if isExpiredPayment}
								<span class="text-3xl">Expired</span>
							{:else}
								{#if $paytoData.value && Number($paytoData.value)>0}
									{$formattedValue}{#if $paytoData.recurring}<span class="text-2xl uppercase">{` / `}{$paytoData.recurring}</span>{/if}
								{:else}
									<span class="text-3xl">Amount</span>{#if $paytoData.recurring}<span class="text-2xl uppercase">{` / `}{$paytoData.recurring}</span>{/if}
								{/if}
							{/if}
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>

	<div class={`relative flex justify-center items-center gap-6 px-12 pb-8 mt-4 z-10 print:hidden ${$paytoData.rtl !== undefined && $paytoData.rtl === true ? 'flex-row-reverse' : ''}`}>
		<button class="bg-black/40 rounded-full p-4 hover:bg-black/80 transition" aria-label="Close" on:click={handleCloseOrBack}>
			<X class="w-7 h-7" />
		</button>
		{#if $nfcSupported}
			<button class="bg-black/40 rounded-full p-4 hover:bg-black/80 transition" aria-label="Switch Mode" on:click={switchMode}>
				{#if mode === 'qr'}
					<Nfc class="w-7 h-7" />
				{:else}
					<QrCode class="w-7 h-7" />
				{/if}
			</button>
		{/if}
		{#if (($paytoData.network === 'geo' || $paytoData.network === 'plus') && $paytoData.location)}
			<button
				class="bg-black/40 rounded-full p-4 hover:bg-black/80 transition"
				aria-label="Navigate"
				on:click={() => {
					window.open(linkLocation($paytoData.location), '_blank');
				}}
			>
				<Navigation2 class="w-7 h-7" />
			</button>
		{/if}
	</div>
</div>

