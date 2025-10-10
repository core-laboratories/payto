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
	import { calculateColorDistance } from '$lib/helpers/euclidean-distance.helper';
	import { getWebLink } from '$lib/helpers/generate.helper';
	import { Qr } from '$lib/components';
	import ExchNumberFormat from 'exchange-rounding';
	import Payto from 'payto-rl';
	import { deviceSherlock } from 'device-sherlock';
	import { writable } from 'svelte/store';
	import { getCategoryByValue } from '$lib/helpers/get-category-by-value.helper';
	import { onDestroy, onMount } from 'svelte';
	import { blo } from "@blockchainhub/blo";
	import { X, QrCode, Nfc, Navigation2, BadgeCheck } from 'lucide-svelte';
	import { LL, setLocaleFromPaytoData, init } from '$i18n';
	import { bicSchema } from '$lib/validators/bic.validator';
	import { KV } from '$lib/helpers/kv.helper';
	import { formatLocalizedNumber, formatRecurringSymbol, getNumberingSystem } from '$lib/helpers/i18n';

	// @ts-expect-error: Module is untyped
	import pkg from 'open-location-code/js/src/openlocationcode';
	const { decode } = pkg;

	export let hostname: ITransitionType | undefined = undefined;
	export let url: string | null = null;
	export let authority: string | undefined = undefined;
	export let generateHead: boolean = false;

	let hasUrl: boolean = false;
	let noData: boolean = true;
	const bareUrl = writable<string | null>(null);
	let formatter: Readable<ExchNumberFormat> | undefined;
	let mode: 'qr' | 'nfc' = 'qr';
	let nfcWriteController: AbortController | null = null;
	let pageData: { title: string; description: string } = { title: '', description: '' };
	let isVerifiedOrganization = writable<boolean>(false);
	let verifiedOrgName = writable<string | null>(null);
	let verifiedOrgIcon = writable<string | null>(null);
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
		purposeLabel: string | Readable<string> | undefined;
		mode: string | Readable<string> | undefined;
		lang: string | Readable<string> | undefined;
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
		purpose: $LL.walletCard.purposePay(),
		purposeLabel: $LL.walletCard.purposePay(),
		mode: undefined,
		lang: undefined
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

	const formattedTimeRemaining = derived([timeRemaining, paytoData], ([$timeRemaining, $data]) => {
		if ($timeRemaining <= 0) return $LL.walletCard.expired();

		const totalSeconds = Math.floor($timeRemaining / 1000);
		const days = Math.floor(totalSeconds / 86400);
		const hours = Math.floor((totalSeconds % 86400) / 3600);
		const minutes = Math.floor((totalSeconds % 3600) / 60);
		const seconds = totalSeconds % 60;

		const lang = typeof $data.lang === 'string' ? $data.lang : (typeof $data.lang === 'object' && 'subscribe' in $data.lang ? get($data.lang) : 'en');
		const isRtl = typeof $data.rtl === 'boolean' ? $data.rtl : (typeof $data.rtl === 'object' && 'subscribe' in $data.rtl ? get($data.rtl) : false);

		// Format time components with leading zeros and localized numbers
		const formatTime = (h: number, m: number, s: number) => {
			// Pad with zeros first, then localize
			const hPadded = h.toString().padStart(2, '0');
			const mPadded = m.toString().padStart(2, '0');
			const sPadded = s.toString().padStart(2, '0');

			// Localize each digit
			const hStr = hPadded.split('').map(d => formatLocalizedNumber(parseInt(d), lang)).join('');
			const mStr = mPadded.split('').map(d => formatLocalizedNumber(parseInt(d), lang)).join('');
			const sStr = sPadded.split('').map(d => formatLocalizedNumber(parseInt(d), lang)).join('');

			// For RTL, reverse the order: seconds:minutes:hours
			if (isRtl) {
				return `${sStr}:${mStr}:${hStr}`;
			}
			return `${hStr}:${mStr}:${sStr}`;
		};

		// Format minutes and seconds
		const formatMinutes = (m: number, s: number) => {
			const mPadded = m.toString().padStart(2, '0');
			const sPadded = s.toString().padStart(2, '0');

			const mStr = mPadded.split('').map(d => formatLocalizedNumber(parseInt(d), lang)).join('');
			const sStr = sPadded.split('').map(d => formatLocalizedNumber(parseInt(d), lang)).join('');

			// For RTL, reverse the order: seconds:minutes
			if (isRtl) {
				return `${sStr}:${mStr}`;
			}
			return `${mStr}:${sStr}`;
		};

		if (days > 0) {
			const dayText = days === 1 ? $LL.common.dates.day() : $LL.common.dates.days();
			return `${formatLocalizedNumber(days, lang)} ${dayText} ${formatTime(hours, minutes, seconds)}`;
		} else if (hours > 0) {
			return formatTime(hours, minutes, seconds);
		} else {
			return formatMinutes(minutes, seconds);
		}
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

	$: if ($paytoData.mode && ($paytoData.mode === 'qr' || $paytoData.mode === 'nfc')) {
		mode = $paytoData.mode;
	}

	$: {
		if (url && !hasUrl) {
			noData = false;
			hasUrl = true;
			bareUrl.set(url);

			// Normalize URL to fix triple slash issue
			const normalizedUrl = url.replace('payto:///', 'payto://');

			const payto = new Payto(normalizedUrl).toJSONObject();
			const { colorForeground, colorBackground } = defineColors(payto.colorForeground, payto.colorBackground);
			const paytoParams = new URLSearchParams(payto.search);

			// Set locale from language parameter BEFORE using translations
			setLocaleFromPaytoData(payto.lang || 'en');

			// Validate mode parameter - only allow 'qr' or 'nfc' if NFC is supported
			const requestedMode = paytoParams.get('mode');
			let validMode: string | undefined = undefined;

			if (requestedMode === 'qr') {
				validMode = 'qr';
			} else if (requestedMode === 'nfc' && $nfcSupported) {
				validMode = 'nfc';
			}

			// Use setTimeout to ensure translations are loaded
			setTimeout(() => {
				paytoData.set({
					hostname: payto.hostname || 'ican',
					paymentType: getCategoryByValue(payto.hostname!) || 'ican',
					value: payto.value ? Number(payto.value) : undefined,
					address: getAddress(payto.address, payto.hostname as ITransitionType, payto),
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
					purpose: paytoParams.get('donate') === '1' ? $LL.walletCard.donate() : $LL.walletCard.pay(),
					purposeLabel: paytoParams.get('donate') === '1' ? $LL.walletCard.purposeDonate() : $LL.walletCard.purposePay(),
					mode: validMode,
					lang: payto.lang || undefined
				});
			}, 0);

			formatter = derived(
				[constructorStore, hostnameStore, paytoData],
				([$constructor, $hostname, $data]) => {
					const currency = $paytoData?.currency || '';
					const lang = typeof $data.lang === 'string' ? $data.lang : (typeof $data.lang === 'object' && 'subscribe' in $data.lang ? get($data.lang) : 'en');
					return new ExchNumberFormat(lang, {
						style: 'currency',
						currency,
						currencyDisplay: 'symbol',
						numberingSystem: getNumberingSystem(lang)
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

				// Validate mode parameter - only allow 'qr' or 'nfc' if NFC is supported
				const requestedMode = paytoParams.get('mode');
				let validMode: string | undefined = undefined;

				if (requestedMode === 'qr') {
					validMode = 'qr';
				} else if (requestedMode === 'nfc' && $nfcSupported) {
					validMode = 'nfc';
				}

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
					network: hostname === 'void'
						? ($store.networks[hostname].transport === 'other' ? $store.networks[hostname].other : $store.networks[hostname].transport)
						: ($store.networks[hostname].network === 'other' ? $store.networks[hostname].other : $store.networks[hostname].network),
					item: $store.design.item,
					location: $store.networks[hostname]?.params?.loc?.value,
					recurring: $store.networks[hostname]?.params?.rc?.value ?? '',
					rtl: $store.design.rtl || false,
					deadline: $store.networks[hostname]?.params?.dl?.value,
					purpose: paytoParams.get('donate') === '1' ? $LL.walletCard.donate() : $LL.walletCard.pay(),
					purposeLabel: paytoParams.get('donate') === '1' ? $LL.walletCard.purposeDonate() : $LL.walletCard.purposePay(),
					mode: validMode,
					lang: $store.design.lang || undefined
				};
			});

			paytoStore.subscribe((value) => {
				paytoData.set(value);
			});

			formatter = derived(
				[constructorStore, hostnameStore, paytoData],
				([$constructor, $hostname, $data]) => {
					const currency = $paytoData?.currency || '';
					const lang = typeof $data.lang === 'string' ? $data.lang : (typeof $data.lang === 'object' && 'subscribe' in $data.lang ? get($data.lang) : 'en');
					return new ExchNumberFormat(lang, {
						style: 'currency',
						currency,
						currencyDisplay: 'symbol',
						numberingSystem: getNumberingSystem(lang)
					});
				}
			);
		}
	}

	// Use a reactive declaration for formattedValue to ensure it updates with formatter changes
	let formattedValue: Readable<string>;
	$: {
		if (formatter) {
			formattedValue = derived(
				[paytoData, formatter],
				([$data, $fmt]) => {
					const value = $data?.value;
					return value ? $fmt.format(Number(value)) : $LL.walletCard.customAmount();
				}
			);
		} else {
			formattedValue = derived(
				[paytoData],
				([$data]) => {
					return $LL.walletCard.customAmount();
				}
			);
		}
	}

	// Format recurring symbol with localized numbers
	const formattedRecurring = derived(
		[paytoData],
		([$data]) => {
			const recurring = $data?.recurring;
			if (!recurring || typeof recurring !== 'string') return '';

			const lang = typeof $data.lang === 'string' ? $data.lang : (typeof $data.lang === 'object' && 'subscribe' in $data.lang ? get($data.lang) : 'en');

			// Get locale-specific translations for recurring symbols
			const translations = {
				day: $LL.common?.recurring?.day?.() || 'd',
				week: $LL.common?.recurring?.week?.() || 'w',
				month: $LL.common?.recurring?.month?.() || 'm',
				year: $LL.common?.recurring?.year?.() || 'y'
			};

			return formatRecurringSymbol(recurring, lang, translations);
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
		searchParams.delete('lang');

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
				finalAddress = extractedAddress.length <= 9 ? extractedAddress.toUpperCase() : `${extractedAddress.slice(0, 4).toUpperCase()}…${extractedAddress.slice(-4).toUpperCase()}`
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

		const deadlineValue = Number(deadline);

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
	) || $isExpired;

	// Track previous deadline value to detect changes
	let previousDeadlineValue: number | null = null;

	// Check if already expired on initialization
	$: if ($paytoData.deadline) {
		let deadlineTimestamp: number;
		const deadlineValue = Number($paytoData.deadline);

		// Check if deadline value has changed
		const deadlineChanged = previousDeadlineValue !== null && previousDeadlineValue !== deadlineValue;

		// If deadline changed, reset expired state to allow recalculation
		if (deadlineChanged) {
			isExpired.set(false);
		}

		// Recalculate the deadline whenever the deadline value changes
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

		const now = Date.now();

		// Set initial expired state
		const isCurrentlyExpired = deadlineTimestamp <= now;
		isExpired.set(isCurrentlyExpired);

		// Check if we need to restart the timer (new deadline or different value)
		const currentDeadlineMs = $calculatedDeadlineMs;
		const needsTimerRestart = !timerInterval || currentDeadlineMs !== deadlineTimestamp || deadlineChanged;

		// Only start/restart timer if not already expired
		if (!isCurrentlyExpired) {
			const timeUntilDeadline = deadlineTimestamp - now;

			// For relative deadlines (1-60 minutes), always show the countdown
			// For absolute timestamps, always show countdown
			const isRelativeDeadline = deadlineValue >= 1 && deadlineValue <= 60;

			if (timeUntilDeadline > 0) {
				expirationTimeMs.set(deadlineTimestamp);
				timeRemaining.set(timeUntilDeadline);
				initialTimeMs.set(timeUntilDeadline); // Store initial time for percentage calculation

				// Start/restart timer if needed
				if (needsTimerRestart) {
					if (timerInterval) {
						clearInterval(timerInterval);
						timerInterval = null;
					}
					startExpirationTimer();
				}
			}
		} else if (isCurrentlyExpired) {
			// If already expired, clear the timer and ensure expired state is true
			if (timerInterval) {
				clearInterval(timerInterval);
				timerInterval = null;
			}
			timeRemaining.set(0);
			isExpired.set(true);
		}

		// Update previous deadline value
		previousDeadlineValue = deadlineValue;
	} else if (!$paytoData.deadline) {
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
		previousDeadlineValue = null; // Reset previous deadline value
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
			return prefix ? ` ${$LL.walletCard.withCash()}` : `Cash`;
		} else if (paytoData.paymentType === 'ican') {
			return ``; // Default to ICAN
		} else if (paytoData.network && paytoData.paymentType) {
			return prefix ? ` ${$LL.walletCard.via()} ${paytoData.network.toString().toUpperCase()}` : `${paytoData.network.toString().toUpperCase()}`;
		} else if (paytoData.paymentType) {
			return prefix ? ` ${$LL.walletCard.via()} ${paytoData.paymentType.toString().toUpperCase()}` : `${paytoData.paymentType.toString().toUpperCase()}`;
		}
		return '';
	}

	// Verify organization BIC and load authority data
	async function verifyOrganization(org: string | Readable<string> | undefined) {
		// Reset verification state
		isVerifiedOrganization.set(false);
		verifiedOrgName.set(null);
		verifiedOrgIcon.set(null);

		if (!org) {
			return;
		}

		const orgString = typeof org === 'string' ? org : get(org);
		if (!orgString) {
			return;
		}

		// Check if address is filled
		const address = typeof $paytoData.address === 'string' ? $paytoData.address : ($paytoData.address ? get($paytoData.address) : '');
		if (!address || address.trim() === '') {
			// No address to verify against
			return;
		}

		// Validate BIC format first
		const validation = bicSchema.safeParse({ bic: orgString });
		if (!validation.success) {
			// BIC is invalid, don't proceed
			return;
		}

		// Verify ORIC matches the address
		try {
			const oricResponse = await fetch(`https://oric.payto.onl/${orgString.toUpperCase()}`);
			if (!oricResponse.ok) {
				// ORIC not found
				return;
			}

			const oricData = await oricResponse.json();
			if (!oricData || !oricData.address) {
				// Invalid ORIC response
				return;
			}

			// Check if ORIC address matches the payment address
			if (oricData.address.toLowerCase() !== address.toLowerCase()) {
				// Address mismatch - not verified
				return;
			}

			// ORIC verified, now load KV data
			const kvData = await KV.get(orgString.toLowerCase());
			if (kvData && kvData.name) {
				// Authority exists with a name - mark as verified
				isVerifiedOrganization.set(true);
				verifiedOrgName.set(kvData.name);

				// Try to load the icon2x if available
				if (kvData.icons?.icon2x) {
					try {
						const response = await fetch(kvData.icons.icon2x);
						if (response.ok) {
							verifiedOrgIcon.set(kvData.icons.icon2x);
						}
					} catch (iconError) {
						// Icon fetch failed, keep it null (will use identicon)
					}
				}
			}
			// If KV doesn't exist or has no name, keep verification false
		} catch (error) {
			// ORIC or KV fetch failed, keep verification false
		}
	}

	// Watch for organization changes
	$: verifyOrganization($paytoData.organization);

	onMount(() => {
		// Initialize i18n with default locale
		init();

		updateRotationState(); // Initial check

		// Listen for orientation change
		window.addEventListener('orientationchange', updateRotationState);
		screen.orientation?.addEventListener?.('change', updateRotationState);
	});

	onDestroy(() => {
		window.removeEventListener('orientationchange', updateRotationState);
		screen.orientation?.removeEventListener?.('change', updateRotationState);
	});

	// Reactive statement to set locale when paytoData.lang changes
	$: if ($paytoData?.lang) {
		const language = typeof $paytoData.lang === 'string' ? $paytoData.lang : get($paytoData.lang);
		setLocaleFromPaytoData(language);
		// Update constructor store properly
		constructor.update(c => ({
			...c,
			design: { ...c.design, lang: language }
		}));
	}

	async function switchMode() {
		if (mode === 'qr') {
			mode = 'nfc';
			if ($nfcSupported) {
				try {
					if ('NDEFReader' in window) {
						nfcWriteController = new AbortController();
						const ndef = new NDEFReader();

						// Stream the PayTo link to NFC
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
								console.warn('NFC stream error', error);
							}
						}, 1000); // Stream every second
					}
				} catch (error) {
					console.warn('NFC permission denied', error);
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

	$: if (generateHead && $paytoData) {
		const network = typeof $paytoData.network === 'string' ? $paytoData.network : ($paytoData.network ? get($paytoData.network) : '');
		const value = typeof $paytoData.value === 'number' ? $paytoData.value : ($paytoData.value ? get($paytoData.value) : undefined);
		const address = typeof $paytoData.address === 'string' ? $paytoData.address : ($paytoData.address ? get($paytoData.address) : '');
		const currencyValue = typeof $paytoData.currency === 'string' && value ? new ExchNumberFormat(undefined, {
			style: 'currency',
			currency: $paytoData.currency,
			currencyDisplay: 'symbol'
		}).format(value) : '';

		pageData = {
			title: `${$paytoData.purpose} ${value ? currencyValue : $LL.walletCard.customAmount()} ${$LL.walletCard.via()} ${network?.toUpperCase() || ''}`,
			description: `${$paytoData.purpose} ${$LL.walletCard.for()} ${address}`
		};
	};
</script>

<style>
	.card {
		transition: transform 0.3s ease;
	}

	.rotated {
		transform: rotate(180deg);
	}
</style>

<svelte:head>
	{#if generateHead}
		<title>{pageData.title}</title>
		<meta name="description" content={pageData.description} />
	{/if}
</svelte:head>

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
						<div class="text-sm text-black mt-1" dir={$paytoData.rtl ? 'rtl' : 'ltr'}>{getInfoDisplay($paytoData)}</div>
					</div>
				</div>
			{/if}
			<div class="p-4 pb-1 rounded-lg flex justify-center items-center bg-white mb-2 hidden print:block">
				<div class="text-center">
					<Qr param={$qrcodeValue} />
					<div class="text-sm text-black mt-1" dir={$paytoData.rtl ? 'rtl' : 'ltr'}>{getInfoDisplay($paytoData)}</div>
				</div>
			</div>
		</div>
		<div class={`text-lg font-medium drop-shadow print:drop-shadow-none ${isUpsideDown ? 'rotated' : ''}`} dir={$paytoData.rtl ? 'rtl' : 'ltr'}>{$nfcSupported && mode === 'nfc' ? $LL.walletCard.tap() : $LL.walletCard.scan()} {$LL.walletCard.hereTo()} {$paytoData.purposeLabel}{printType($paytoData, true)}</div>
	</div>

	<!-- Main Card (rotated if needed) -->
	<div class="flex-1 flex items-center justify-center">
		<div class={`relative transition-transform duration-500 ${isUpsideDown ? 'rotated' : ''}`}>
			<div class="rounded-2xl bg-black/40 shadow-xl px-2 pb-4 flex flex-col items-center min-w-[320px] max-w-xs relative overflow-hidden print:shadow-none print:border-2 print:border-gray-400">
				{#if $expirationTimeMs && !isExpiredPayment}
					<div class="w-[calc(100%+1rem)] flex flex-col gap-1 mb-2">
						<div class="w-full bg-black/20 rounded-t-2xl h-2 overflow-hidden" dir={$paytoData.rtl ? 'rtl' : 'ltr'}>
							<div
								class="h-2 rounded-t-2xl transition-all duration-1000 ease-linear"
								class:bg-emerald-500={$timePercentage > 50}
								class:bg-amber-500={$timePercentage <= 50 && $timePercentage > 20}
								class:bg-red-500={$timePercentage <= 20}
								style="width: {$timePercentage}%"
							></div>
						</div>
						<div class={`flex justify-between text-xs px-4 ${$paytoData.rtl ? 'flex-row-reverse' : ''}`}>
							<span class="text-gray-300">{$LL.walletCard.expiresIn()}</span>
							<span class="font-medium text-gray-100">{$formattedTimeRemaining}</span>
						</div>
					</div>
				{/if}
				<div class="pt-4">
					{#if $verifiedOrgIcon}
						<div class="flex items-center justify-center mb-2">
							<div class="flex items-center justify-center">
								<img src={$verifiedOrgIcon} alt="Organization" class="w-14 h-14 rounded-full" />
							</div>
						</div>
					{:else if $paytoData.address}
						<div class="flex items-center justify-center mb-2">
							<div class="flex items-center justify-center">
								<img src={getIdenticon($paytoData.address)} alt="ID" class="w-14 h-14 rounded-full" />
							</div>
						</div>
					{/if}
					<div class="text-center">
						{#if $paytoData.organization}
							<div class="text-lg font-medium mb-2 flex items-center justify-center gap-1" dir={$paytoData.rtl ? 'rtl' : 'ltr'}>
								{#if $isVerifiedOrganization}
									<BadgeCheck class="w-5 h-5 text-sky-400" />
								{/if}
								<span>{$verifiedOrgName || $paytoData.organization}</span>
							</div>
						{/if}
						<div class="text-lg font-medium mb-1" dir={$paytoData.rtl ? 'rtl' : 'ltr'}>
							{#if $paytoData.rtl}
								<!-- RTL: Item first, then "for", then purpose -->
								{#if $paytoData.item}<span class="break-all">{$paytoData.item}</span>{` `}{$LL.walletCard.for()}{` `}{/if}{$paytoData.purpose}
							{:else}
								<!-- LTR: Purpose first, then "for", then item -->
								{$paytoData.purpose}{#if $paytoData.item}{` `}{$LL.walletCard.for()}{` `}<span class="break-all">{$paytoData.item}</span>{/if}
							{/if}
						</div>
						<div class="text-4xl font-bold tracking-tigh mt-1 mb-2" dir={$paytoData.rtl ? 'rtl' : 'ltr'}>
							{#if noData}
								<span class="text-3xl">{$LL.walletCard.noPayment()}</span>
							{:else if isExpiredPayment}
								<span class="text-3xl">{$LL.walletCard.expired()}</span>
							{:else}
								{#if $paytoData.value && Number($paytoData.value)>0}
									{#if $paytoData.rtl}
										{#if $paytoData.recurring}<span class="text-2xl uppercase">{$formattedRecurring}{` / `}</span>{/if}{$formattedValue}
									{:else}
										{$formattedValue}{#if $paytoData.recurring}<span class="text-2xl uppercase">{` / `}{$formattedRecurring}</span>{/if}
									{/if}
								{:else}
									{#if $paytoData.rtl}
										{#if $paytoData.recurring}<span class="text-2xl uppercase">{$formattedRecurring}{` / `}</span>{/if}<span class="text-3xl">{$LL.walletCard.customAmount()}</span>
									{:else}
										<span class="text-3xl">{$LL.walletCard.customAmount()}</span>{#if $paytoData.recurring}<span class="text-2xl uppercase">{` / `}{$formattedRecurring}</span>{/if}
									{/if}
								{/if}
							{/if}
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>

	<div class={`relative flex justify-center items-center gap-6 px-12 pb-8 mt-4 z-10 print:hidden ${$paytoData.rtl ? 'flex-row-reverse' : ''}`}>
		<button class="bg-black/40 rounded-full p-4 hover:bg-black/80 transition" aria-label={$LL.walletCard.close()} on:click={handleCloseOrBack}>
			<X class="w-7 h-7" />
		</button>
		{#if $nfcSupported}
			<button class="bg-black/40 rounded-full p-4 hover:bg-black/80 transition" aria-label={$LL.walletCard.switchMode()} on:click={switchMode}>
				{#if mode === 'qr'}
					<Nfc class="w-7 h-7" />
				{:else}
					<QrCode class="w-7 h-7" />
				{/if}
			</button>
		{/if}
		{#if ($paytoData.hostname === 'void' && ($paytoData.network === 'geo' || $paytoData.network === 'plus') && $paytoData.location)}
			<button
				class="bg-black/40 rounded-full p-4 hover:bg-black/80 transition"
				aria-label={$LL.walletCard.navigate()}
				on:click={() => {
					window.open(linkLocation($paytoData.location), '_blank');
				}}
			>
				<Navigation2 class="w-7 h-7" />
			</button>
		{/if}
	</div>
</div>

