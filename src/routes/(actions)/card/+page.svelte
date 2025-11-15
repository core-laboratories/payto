<script lang="ts">
	import { onMount } from 'svelte';
	import { fly } from 'svelte/transition';
	import {
		CARD_BRANDS,
		buildIdMaterialWithSha3,
		detectCardBrand,
		formatCardNumber as formatCardNumberHelper,
		luhnCheck as luhnCheckHelper,
		maskFormattedNumber as maskFormattedNumberHelper,
		normalizeName
	} from '$lib/helpers/cryptocard.helper';
	import type { CardBrandDefinition } from '$lib/helpers/cryptocard.helper';

	const MIN_CARD_DIGITS = 6;
	const MAX_CARD_DIGITS = 19;

	interface FragmentParsed {
		number: string | null;
		nickname: string | null;
	}

	function parseFragment(raw: string): FragmentParsed {
		if (!raw) return { number: null, nickname: null };

		const decoded = decodeURIComponent(raw);

		const [numPartRaw, nickPartRaw] = decoded.startsWith('/')
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
			if (collapsed.length > 0) nickname = collapsed;
		}

		return { number, nickname };
	}

	function removeFragment() {
		history.replaceState(null, '', window.location.pathname + window.location.search);
	}

	const wip = true;

	const digitsRegex = /\D/g;

	function formatCardNumber(value: string): string {
		return formatCardNumberHelper(value, digitsRegex, CARD_BRANDS);
	}

	function maskFormattedNumber(formattedNumber: string, publicLength: number, totalDigits: number): string {
		return maskFormattedNumberHelper(formattedNumber, publicLength, totalDigits);
	}

	let cardNumber = $state('');
	let cardholderInput = $state('');
	let cardInputRef: HTMLInputElement | null = $state(null);
	let cardholderInputRef: HTMLInputElement | null = $state(null);
	let cardValidationState = $state<'empty' | 'valid' | 'invalid'>('empty');
	let cardholderValidationState = $state<'empty' | 'valid' | 'invalid'>('empty');
	let detectedBrandDefinition = $state<CardBrandDefinition | null>(null);
	let publicCardPart = $state('');
	let previousCardValidationState: 'empty' | 'valid' | 'invalid' = 'empty';
	let showMaskedCardNumber = $state(false);

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
		cardValidationState === 'valid' && showMaskedCardNumber
			? maskFormattedNumber(cardNumber, publicCardPart.length, cardDigits.length)
			: cardNumber
	);

	function handleCardNumberInput(event: Event) {
		const input = event.target as HTMLInputElement;
		const value = input.value;
		cardNumber = formatCardNumber(value);

		const digits = cardNumber.replace(digitsRegex, '');
		const brandMatch = detectCardBrand(digits, CARD_BRANDS);
		detectedBrandDefinition = brandMatch;

		if (!digits.length) {
			cardValidationState = 'empty';
			publicCardPart = '';
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

		const luhnValid = hasValidLength && luhnCheckHelper(cardNumber, digitsRegex);

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
		const digits = cardNumber.replace(digitsRegex, '');
		const bin6 = digits.slice(0, 6);
		const last4 = digits.slice(-4);

		if (bin6.length < 6 || last4.length < 4) return;

		const normalizedName = normalizeName(cardholderInput, { diacritics: 'strip' });

		const { sha3Hex } = buildIdMaterialWithSha3(bin6, last4, normalizedName, {
			version: 'v1',
			domain: 'core.creditcard'
		});

		const hashedId = `${sha3Hex}.card`;
		window.location.href = `/://xcb/${hashedId}`;
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
			const lettersOnlyLen = nickname.replace(/ /g, '').length;
			cardholderValidationState =
				lettersOnlyLen >= 2 ? 'valid' : 'invalid';
		}
	});
</script>

<svelte:head>
	<title>Crypto Card Top Up</title>
	<meta name="description" content="Crypto Card Top Up - Direct Asset Transfers without intermediaries." />
</svelte:head>

<div class="min-h-screen p-4 sm:p-6 lg:p-8">
	<div class="w-full max-w-md mx-auto">
		<div class="space-y-6">
			{#if wip}
				<div class="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 text-sm text-yellow-200">
					🐻 Bear with us - this feature is still under development. But you can check it out now!
				</div>
			{/if}

			<!-- Credit Card UI -->
			<div
				class="relative w-full h-56 sm:h-60 mx-auto rounded-2xl shadow-2xl bg-gradient-to-br from-blue-500 to-purple-600 overflow-hidden"
				transition:fly={{ y: 20, duration: 300 }}
			>
				<div class="absolute top-4 left-4">
					<span class="text-white text-xs sm:text-sm font-semibold bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
						Crypto Card
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
									if (cardValidationState === 'valid') showMaskedCardNumber = true;
								}}
								class="w-full bg-white/10 backdrop-blur-sm border-2 rounded-lg px-3 py-2 outline-none text-xl sm:text-2xl text-white placeholder-white/50 zephirum focus:outline-none transition-colors {cardValidationState === 'valid' ? 'border-green-400 focus:border-green-400' : cardValidationState === 'invalid' ? 'border-red-400 focus:border-red-400' : 'border-white/30 focus:border-white/50'}"
								maxlength={cardNumberInputMaxLength}
								autocomplete="off"
							/>
						</label>

						<label class="flex flex-col gap-1 w-3/4">
							<span class="text-xs uppercase tracking-wide text-white/60">Cardholder Name / Nickname</span>
							<input
								bind:this={cardholderInputRef}
								type="text"
								placeholder="Name / Nickname"
								value={cardholderInput}
								oninput={(e) => {
									const raw = (e.target as HTMLInputElement).value;
									const upper = raw.toUpperCase().replace(/[^A-Z ]+/g, '');
									const collapsed = upper.replace(/\s+/g, ' ');
									const sanitized = collapsed.trim();
									(e.target as HTMLInputElement).value = sanitized;

									cardholderInput = sanitized;

									const letters = sanitized.replace(/ /g, '').length;
									cardholderValidationState =
										!sanitized.length ? 'empty' : letters >= 2 ? 'valid' : 'invalid';
								}}
								class="bg-white/10 backdrop-blur-sm border-2 rounded-lg px-3 py-2 text-xs sm:text-sm text-white placeholder-white/50 uppercase zephirum tracking-wide focus:outline-none transition-colors {cardholderValidationState === 'valid' ? 'border-green-400 focus:border-green-400' : cardholderValidationState === 'invalid' ? 'border-red-400 focus:border-red-400' : 'border-white/30 focus:border-white/50'}"
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
				disabled={wip || cardValidationState !== 'valid' || cardholderValidationState !== 'valid'}
				class="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-500 disabled:cursor-not-allowed disabled:hover:bg-gray-500 text-white font-semibold py-3 px-6 rounded-lg transition-colors shadow-lg"
			>
				Top Up
			</button>

			<div class="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 text-xs text-yellow-200">
				<p class="mb-1"><strong>Note:</strong></p>
				<ul class="list-disc list-inside space-y-1">
					<li>If the card is not registered, funds will be returned without fees.</li>
					<li>If the card is connected to an exchange service, supported assets are auto-converted to fiat.</li>
					<li>If conversion fails or no exchange service exists, funds are returned without fees.</li>
				</ul>
			</div>
		</div>
	</div>
</div>
