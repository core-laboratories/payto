<script lang="ts">
	import { onMount } from 'svelte';
	import { fly } from 'svelte/transition';
	import {
		CARD_BRANDS,
		CARDHOLDER_NAME_REGEX,
		detectCardBrand,
		formatCardNumber as formatCardNumberHelper,
		luhnCheck as luhnCheckHelper,
		isValidCardholderName,
		maskFormattedNumber as maskFormattedNumberHelper
	} from '$lib/helpers/cryptocard.helper';
	import type { CardBrandDefinition } from '$lib/helpers/cryptocard.helper';

	const experimental = true;
	const MIN_CARD_DIGITS = 6;
	const MAX_CARD_DIGITS = 19;
	const FORM_DATA_TTL_MS = 5 * 60 * 1000;
	const digitsRegex = /\D/g;

	interface FragmentParsed {
		number: string | null;
		nickname: string | null;
	}

	function parseFragment(raw: string): FragmentParsed {
		if (!raw) return { number: null, nickname: null };

		const decoded = decodeURIComponent(raw);
		const [numPartRaw = '', nickPartRaw = ''] = decoded.startsWith('/')
			? ['', decoded.slice(1)]
			: decoded.split('/', 2);

		let number: string | null = null;
		const numPart = numPartRaw.replace(/\s+/g, '');

		if (
			numPart &&
			/^[0-9]+$/.test(numPart) &&
			numPart.length >= MIN_CARD_DIGITS &&
			numPart.length <= MAX_CARD_DIGITS
		) {
			number = numPart;
		}

		let nickname: string | null = null;
		if (nickPartRaw && nickPartRaw.trim()) {
			const upper = nickPartRaw.toUpperCase().replace(/[^A-Z ]/g, '');
			const collapsed = upper.replace(/\s+/g, ' ').trim();
			if (isValidCardholderName(collapsed)) nickname = collapsed;
		}

		return { number, nickname };
	}

	function removeFragment() {
		history.replaceState(null, '', window.location.pathname + window.location.search);
	}

	function formatCardNumber(value: string): string {
		return formatCardNumberHelper(value, digitsRegex, CARD_BRANDS);
	}

	function maskFormattedNumber(
		formattedNumber: string,
		publicLength: number,
		totalDigits: number
	): string {
		return maskFormattedNumberHelper(formattedNumber, publicLength, totalDigits);
	}

	let cardNumber = $state('');
	let cardholderInput = $state('');
	let cardInputRef: HTMLInputElement | null = $state(null);
	let cardholderInputRef: HTMLInputElement | null = $state(null);
	let cardValidationState = $state<'empty' | 'valid' | 'invalid' | 'warning'>('empty');
	let cardholderValidationState = $state<'empty' | 'valid' | 'invalid'>('empty');
	let detectedBrandDefinition = $state<CardBrandDefinition | null>(null);
	let publicCardPart = $state('');
	let previousCardValidationState: 'empty' | 'valid' | 'invalid' | 'warning' = 'empty';
	let showMaskedCardNumber = $state(false);
	let isResolving = $state(false);
	let submitError = $state('');
	let sensitiveDataTimer: ReturnType<typeof setTimeout> | null = null;

	const cardDigits = $derived(cardNumber.replace(digitsRegex, ''));
	const currentBrandMaxLength = $derived(
		detectedBrandDefinition ? Math.max(...detectedBrandDefinition.lengths) : 19
	);
	const cardNumberInputMaxLength = $derived(
		currentBrandMaxLength + Math.floor((currentBrandMaxLength - 1) / 4)
	);
	const brandDisplay = $derived(
		detectedBrandDefinition?.name
			? detectedBrandDefinition.name
			: cardDigits.length
				? 'Unsupported Card'
				: 'Card Brand'
	);
	const cardNumberInputValue = $derived(
		(cardValidationState === 'valid' || cardValidationState === 'warning') && showMaskedCardNumber
			? maskFormattedNumber(cardNumber, publicCardPart.length, cardDigits.length)
			: cardNumber
	);

	function clearSensitiveData(showMessage: boolean = false) {
		cardNumber = '';
		cardholderInput = '';
		cardValidationState = 'empty';
		cardholderValidationState = 'empty';
		detectedBrandDefinition = null;
		publicCardPart = '';
		previousCardValidationState = 'empty';
		showMaskedCardNumber = false;
		isResolving = false;
		submitError = showMessage ? 'Card data was cleared after 5 minutes.' : '';
		if (sensitiveDataTimer) {
			clearTimeout(sensitiveDataTimer);
			sensitiveDataTimer = null;
		}
	}

	function resetSensitiveDataTimer() {
		if (sensitiveDataTimer) {
			clearTimeout(sensitiveDataTimer);
			sensitiveDataTimer = null;
		}

		if (!cardNumber && !cardholderInput) return;

		sensitiveDataTimer = setTimeout(() => {
			clearSensitiveData(true);
			cardInputRef?.focus();
		}, FORM_DATA_TTL_MS);
	}

	function handleCardNumberInput(event: Event) {
		const input = event.target as HTMLInputElement;
		const value = input.value;
		cardNumber = formatCardNumber(value);
		resetSensitiveDataTimer();

		const digits = cardNumber.replace(digitsRegex, '');
		const digitsLength = digits.length;
		const brandMatch = detectCardBrand(digits, CARD_BRANDS);
		detectedBrandDefinition = brandMatch;

		const markCensoredWarning = () => {
			if (!brandMatch) return;
			cardValidationState = 'warning';
			const totalLength = digits.length;
			const lastFourLength = Math.min(4, totalLength);
			const publicLength = Math.min(
				brandMatch.publicDigits,
				Math.max(totalLength - lastFourLength, 0)
			);
			publicCardPart = digits.slice(0, publicLength);
			showMaskedCardNumber = false;
		};

		if (!digitsLength) {
			cardValidationState = 'empty';
			publicCardPart = '';
			showMaskedCardNumber = false;
			return;
		}

		if (digitsLength > MAX_CARD_DIGITS) {
			cardValidationState = 'invalid';
			publicCardPart = '';
			cardNumber = formatCardNumber(digits.slice(0, MAX_CARD_DIGITS));
			showMaskedCardNumber = false;
			return;
		}

		if (!brandMatch) {
			cardValidationState = 'invalid';
			publicCardPart = '';
			showMaskedCardNumber = false;
			return;
		}

		const minLength = Math.min(...brandMatch.lengths);
		const maxLength = Math.max(...brandMatch.lengths);
		const hasValidLength = brandMatch.lengths.includes(digits.length);
		const canValidate = digits.length >= minLength;

		if (!canValidate) {
			cardValidationState = 'empty';
			publicCardPart = '';
			showMaskedCardNumber = false;
			return;
		}

		if (digits.length > maxLength) {
			cardValidationState = 'invalid';
			publicCardPart = '';
			cardNumber = formatCardNumber(digits.slice(0, maxLength));
			showMaskedCardNumber = false;
			return;
		}

		// Check for censored numbers (zeros in the middle section) only when card has valid length
		// Only check after Luhn validation fails, to distinguish from invalid cards
		const luhnValid = hasValidLength && luhnCheckHelper(cardNumber, digitsRegex);

		if (hasValidLength && !luhnValid) {
			const publicDigits = brandMatch.publicDigits; // First 6 digits
			const lastFourStart = digits.length - 4; // Last 4 digits start position

			// Middle section is between publicDigits and lastFourStart
			if (lastFourStart > publicDigits) {
				const middleSection = digits.slice(publicDigits, lastFourStart);
				// If middle section is all zeros, it's a censored number
				if (middleSection.length > 0 && /^[0]+$/.test(middleSection)) {
					markCensoredWarning();
					return;
				}
			}
		}

		if (luhnValid) {
			cardValidationState = 'valid';
			const totalLength = digits.length;
			const lastFourLength = Math.min(4, totalLength);
			const publicLength = Math.min(
				brandMatch.publicDigits,
				Math.max(totalLength - lastFourLength, 0)
			);
			publicCardPart = digits.slice(0, publicLength);

			if (previousCardValidationState !== 'valid') {
				setTimeout(() => cardholderInputRef?.focus(), 100);
			}

			showMaskedCardNumber = true;
		} else {
			cardValidationState = 'invalid';
			publicCardPart = '';
			showMaskedCardNumber = false;
		}

		previousCardValidationState = cardValidationState;
	}

	async function handleProceed() {
		submitError = '';

		const digits = cardNumber.replace(digitsRegex, '');
		if (digits.length < 10) return;

		isResolving = true;

		try {
			const response = await fetch('/card/resolve', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					cardNumber: digits,
					name: cardholderInput
				})
			});

			const payload = await response.json();
			if (!response.ok) {
				submitError = payload?.error || 'Failed to resolve Core ID.';
				return;
			}

			if (!payload?.coreId) {
				submitError = 'Resolved Core ID was not returned.';
				return;
			}

			window.location.href = `/://xcb/${payload.coreId}`;
		} catch (error) {
			submitError = error instanceof Error ? error.message : 'Failed to resolve Core ID.';
		} finally {
			isResolving = false;
		}
	}

	onMount(() => {
		cardInputRef?.focus();

		const rawFragment = window.location.hash.slice(1);
		if (!rawFragment) return;

		const { number, nickname } = parseFragment(rawFragment);

		// Remove # immediately
		removeFragment();

		// Prefill card number
		if (number) {
			cardNumber = formatCardNumber(number);
			handleCardNumberInput({ target: { value: cardNumber } } as any);
		}

		// Prefill nickname
		if (nickname) {
			cardholderInput = nickname;
			cardholderValidationState = isValidCardholderName(nickname) ? 'valid' : 'invalid';
			resetSensitiveDataTimer();
		}

		return () => {
			if (sensitiveDataTimer) {
				clearTimeout(sensitiveDataTimer);
			}
		};
	});
</script>

<svelte:head>
	<title>CryptoCard Top Up</title>
	<meta
		name="description"
		content="CryptoCard Top Up - Payments Without Borders without intermediaries."
	/>
</svelte:head>

<div class="min-h-screen p-4 sm:p-6 lg:p-8">
	<div class="w-full max-w-md mx-auto">
		<div class="space-y-6">
			{#if experimental}
				<div
					class="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 text-sm text-yellow-200"
				>
					⚗️ Experimental feature - this functionality is in alpha testing.
				</div>
			{/if}
			<!-- Credit Card UI -->
			<div
				class="relative w-full h-56 sm:h-60 mx-auto rounded-2xl shadow-2xl bg-gradient-to-br from-blue-500 to-purple-600 overflow-hidden"
				transition:fly={{ y: 20, duration: 300 }}
			>
				<div class="absolute top-4 left-4">
					<span
						class="text-white text-xs sm:text-sm font-semibold bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full"
					>
						CryptoCard
					</span>
				</div>

				<div class="absolute top-4 right-4 flex items-center gap-2">
					<!-- Logo SVG -->
					<svg
						xmlns="http://www.w3.org/2000/svg"
						xml:space="preserve"
						style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:2"
						viewBox="0 0 64 59"
						class="h-8 w-auto opacity-85"
					>
						<path
							d="M1116.76 512.8 882.12 153.36 790.2 333.09H486.56l-92.41 179.72 722.61-.01Z"
							style="fill:#69be5a;fill-rule:nonzero"
							transform="matrix(.0573 0 0 .0573 0 0)"
						/>
						<path
							d="M248.82 0 0 512.88l171.45-.25 182.24-359.28 528.4-.01L961.84 0H248.82ZM394.15 512.66l92.41 179.73H790.2l91.92 179.72 234.64-359.43-722.61-.02Z"
							style="fill:#1ba34a;fill-rule:nonzero"
							transform="matrix(.0573 0 0 .0573 0 0)"
						/>
						<path
							d="M248.82 1025.48 0 512.6l171.45.24 182.24 359.29h528.4l79.75 153.35H248.82Z"
							style="fill:#69be5a;fill-rule:nonzero"
							transform="matrix(.0573 0 0 .0573 0 0)"
						/>
					</svg>
				</div>

				<div class="absolute inset-x-4 top-1/2 -translate-y-1/2 transform">
					<div class="text-white flex flex-col gap-4">
						<label class="flex flex-col gap-1">
							<input
								bind:this={cardInputRef}
								id="cardNumber"
								type="text"
								inputmode="numeric"
								pattern="[0-9\s]*"
								placeholder="0000 0000 0000 0000"
								value={cardNumberInputValue}
								oninput={handleCardNumberInput}
								onfocus={() => (showMaskedCardNumber = false)}
								onblur={() => {
									if (cardValidationState === 'valid' || cardValidationState === 'warning') {
										showMaskedCardNumber = true;
									}
								}}
								class="w-full bg-white/10 backdrop-blur-sm border-2 rounded-lg px-3 py-2 outline-none text-xl sm:text-2xl text-white placeholder-white/50 zephirum focus:outline-none transition-colors {cardValidationState ===
								'valid'
									? 'border-green-400 focus:border-green-400'
									: cardValidationState === 'invalid'
										? 'border-red-400 focus:border-red-400'
										: cardValidationState === 'warning'
											? 'border-amber-400 focus:border-amber-400'
											: 'border-white/30 focus:border-white/50'}"
								maxlength={cardNumberInputMaxLength}
								autocomplete="off"
							/>
						</label>

						<label class="flex flex-col gap-1 w-3/4">
							<span class="text-xs uppercase tracking-wide text-white/60"
								>Cardholder Name / Nickname</span
							>
							<input
								bind:this={cardholderInputRef}
								type="text"
								placeholder="Jules Winnfield"
								value={cardholderInput}
								oninput={(e) => {
									const raw = (e.target as HTMLInputElement).value;
									const upper = raw.toUpperCase().replace(/[^A-Z ]+/g, '');
									const collapsed = upper.replace(/\s+/g, ' ');
									const noLeadingSpaces = collapsed.replace(/^\s+/, '');
									const value = noLeadingSpaces.slice(0, 26);
									(e.target as HTMLInputElement).value = value;

									cardholderInput = value;
									resetSensitiveDataTimer();
									cardholderValidationState = !value.length
										? 'empty'
										: isValidCardholderName(value)
											? 'valid'
											: 'invalid';
								}}
								onblur={(e) => {
									// On blur, trim trailing spaces
									const trimmed = (e.target as HTMLInputElement).value.trim();
									(e.target as HTMLInputElement).value = trimmed;
									cardholderInput = trimmed;
									resetSensitiveDataTimer();
									cardholderValidationState = !trimmed.length
										? 'empty'
										: isValidCardholderName(trimmed)
											? 'valid'
											: 'invalid';
								}}
								pattern={CARDHOLDER_NAME_REGEX.source}
								class="bg-white/10 backdrop-blur-sm border-2 rounded-lg px-3 py-2 text-xs sm:text-sm text-white placeholder-white/50 uppercase zephirum tracking-wide focus:outline-none transition-colors {cardholderValidationState ===
								'valid'
									? 'border-green-400 focus:border-green-400'
									: cardholderValidationState === 'invalid'
										? 'border-red-400 focus:border-red-400'
										: 'border-white/30 focus:border-white/50'}"
								maxlength="26"
							/>
						</label>
					</div>
				</div>

				<div class="absolute bottom-4 right-4">
					<span class="text-white text-base sm:text-lg font-semibold italic">{brandDisplay}</span>
				</div>
			</div>

			<button
				onclick={handleProceed}
				disabled={isResolving ||
					(cardValidationState !== 'valid' && cardValidationState !== 'warning') ||
					cardholderValidationState !== 'valid'}
				class="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-500 disabled:cursor-not-allowed disabled:hover:bg-gray-500 text-white font-semibold py-3 px-6 rounded-lg transition-colors shadow-lg"
			>
				{isResolving ? 'Resolving Card…' : 'Top Up'}
			</button>

			{#if submitError}
				<div class="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-sm text-red-200">
					{submitError}
				</div>
			{/if}

			<div
				class="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 text-xs text-yellow-200"
			>
				<p class="mb-1"><strong>Card Tokenization Toolset</strong></p>
				<ul class="list-disc list-inside space-y-1">
					<li>If the card is not registered, your funds are returned back.</li>
					<li>If supported, crypto is converted to fiat automatically.</li>
					<li>If conversion is not available or fails, funds are kept in digital form.</li>
					<li>To hide * digits, replace them with 0. Never share the full card number!</li>
				</ul>
			</div>
		</div>
	</div>
</div>
