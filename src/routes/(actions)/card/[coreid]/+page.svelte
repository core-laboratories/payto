<script lang="ts">
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { X } from 'lucide-svelte';
	import { fly } from 'svelte/transition';
	import { validateWalletAddress } from 'blockchain-wallet-validator';
	import { z } from 'zod';

	const coreid = page.params.coreid;
	let cardNumber = $state('');
	let cardName = $state('CARDHOLDER NAME');
	let cardInputRef: HTMLInputElement | null = $state(null);
	let isValidating = $state(true);
	let isValid = $state(false);
	let errorMessage = $state('');
	let cardValidationState = $state<'empty' | 'valid' | 'invalid'>('empty');

	// Luhn algorithm for card number validation
	function luhnCheck(cardNumber: string): boolean {
		const digits = cardNumber.replace(/\D/g, '');
		// Support 15-digit (Amex), 16-digit (Visa/Mastercard/JCB), and 16-19 digit (UnionPay) cards
		if (digits.length < 15 || digits.length > 19) return false;

		let sum = 0;
		let isEven = false;

		for (let i = digits.length - 1; i >= 0; i--) {
			let digit = parseInt(digits[i], 10);

			if (isEven) {
				digit *= 2;
				if (digit > 9) {
					digit -= 9;
				}
			}

			sum += digit;
			isEven = !isEven;
		}

		return sum % 10 === 0;
	}

	// Check if card is Amex (starts with 34 or 37 and is 15 digits)
	function isAmex(digits: string): boolean {
		return digits.length === 15 && (digits.startsWith('34') || digits.startsWith('37'));
	}

	// Check if card is UnionPay (starts with 62 or 88, 16-19 digits)
	function isUnionPay(digits: string): boolean {
		return (digits.length >= 16 && digits.length <= 19) &&
		       (digits.startsWith('62') || digits.startsWith('88'));
	}

	// Check if card is JCB (starts with 35, typically 16 digits, but can be 16-19)
	function isJCB(digits: string): boolean {
		return (digits.length >= 16 && digits.length <= 19) && digits.startsWith('35');
	}

	// Card number validation schema
	const cardNumberSchema = z.string()
		.min(1, 'Card number is required')
		.refine((val) => {
			const digits = val.replace(/\D/g, '');
			// Amex: 15 digits, others: 16-19 digits
			return digits.length === 15 || (digits.length >= 16 && digits.length <= 19);
		}, 'Card number must be 15-19 digits')
		.refine((val) => {
			const digits = val.replace(/\D/g, '');
			return luhnCheck(digits);
		}, 'Invalid card number');

	// Format card number with appropriate spacing
	// Amex (15 digits): XXXX XXXXXX XXXXX
	// Standard/UnionPay/JCB (16-19 digits): XXXX XXXX XXXX XXXX (with additional groups)
	function formatCardNumber(value: string): string {
		// Remove all non-digits
		const digits = value.replace(/\D/g, '');

		// Determine max length based on card type
		let maxLength = 16; // Default for standard cards
		if (digits.startsWith('34') || digits.startsWith('37')) {
			maxLength = 15; // Amex
		} else if (digits.startsWith('62') || digits.startsWith('88')) {
			maxLength = 19; // UnionPay
		} else if (digits.startsWith('35')) {
			maxLength = 19; // JCB
		}

		const limited = digits.slice(0, maxLength);

		if (isAmex(limited)) {
			// Amex format: 4-6-5 (XXXX XXXXXX XXXXX)
			if (limited.length <= 4) {
				return limited;
			} else if (limited.length <= 10) {
				return `${limited.slice(0, 4)} ${limited.slice(4)}`;
			} else {
				return `${limited.slice(0, 4)} ${limited.slice(4, 10)} ${limited.slice(10)}`;
			}
		} else {
			// Standard format: 4-4-4-4 (XXXX XXXX XXXX XXXX) with additional groups for longer cards
			return limited.replace(/(\d{4})(?=\d)/g, '$1 ');
		}
	}

	function handleCardNumberInput(event: Event) {
		const input = event.target as HTMLInputElement;
		const value = input.value;
		cardNumber = formatCardNumber(value);

		// Validate card number
		if (!cardNumber.trim()) {
			cardValidationState = 'empty';
		} else {
			const result = cardNumberSchema.safeParse(cardNumber);
			cardValidationState = result.success ? 'valid' : 'invalid';
		}
	}

	// Validate coreid against xcb network
	async function validateCoreId(id: string | undefined): Promise<boolean> {
		if (!id) {
			errorMessage = 'Core ID is required. Please check your link.';
			return false;
		}

		const trimmed = id.trim();
		if (trimmed.length === 0) {
			errorMessage = 'Invalid core ID. Please check your link.';
			return false;
		}

		// Validate against xcb network using blockchain-wallet-validator
		// ICAN is used for CORE addresses (xcb, xce, xab)
		const result = validateWalletAddress(trimmed, {
			network: ['ican'],
			testnet: false // Disallow testnet addresses
		});

		if (!result.isValid) {
			errorMessage = 'Invalid CORE address format. Please check your link.';
			return false;
		}

		// Check if testnet address was detected
		if (result.metadata?.isTestnet) {
			errorMessage = 'Testnet addresses are not allowed. Please use a mainnet CORE (xcb) address.';
			return false;
		}

		// Ensure the detected network is xcb (mainnet CORE only)
		if (result.network && result.network !== 'xcb') {
			errorMessage = 'Address must be a valid CORE (xcb) mainnet address.';
			return false;
		}

		return true;
	}

	onMount(async () => {
		isValidating = true;
		const valid = await validateCoreId(coreid);
		isValid = valid;
		isValidating = false;

		if (!valid && !errorMessage) {
			errorMessage = 'Invalid core ID. Please check your link.';
		}
	});

	// Focus card input when card becomes visible
	$effect(() => {
		if (isValid && !isValidating && cardInputRef) {
			setTimeout(() => {
				cardInputRef?.focus();
			}, 100);
		}
	});

	function handleClose() {
		window.history.back();
	}

	function handleProceed() {
		// Format card number: remove all non-numeric characters and add .card extension
		const formattedNumber = cardNumber.replace(/\D/g, '') + '.card';
		// Redirect to /://xcb/{number}.card in the same window
		window.location.href = `/://xcb/${formattedNumber}`;
	}
</script>

<div class="min-h-screen p-4 sm:p-6 lg:p-8">
	<div class="w-full max-w-md mx-auto">
		{#if isValidating}
			<div class="bg-zinc-800/60 border border-zinc-700 rounded-xl p-8 text-center">
				<div class="animate-pulse text-gray-400">Validating core ID…</div>
			</div>
		{:else if !isValid}
			<div
				class="bg-red-500/20 border border-red-500/30 rounded-xl p-6 shadow-lg"
				transition:fly={{ y: 20, duration: 300 }}
			>
				<div class="flex items-start justify-between mb-4">
					<h2 class="text-xl font-semibold text-red-200">Error</h2>
					<button
						onclick={handleClose}
						class="text-red-300 hover:text-red-200 transition-colors p-1"
						aria-label="Close"
					>
						<X class="w-5 h-5" />
					</button>
				</div>
				<p class="text-red-200 mb-6">{errorMessage || 'Invalid core ID. Please check your link.'}</p>
				<button
					onclick={handleClose}
					class="w-full bg-red-500/30 hover:bg-red-500/40 text-red-200 py-2 px-4 rounded-lg transition-colors border border-red-500/30"
				>
					Close
				</button>
			</div>
		{:else}
			<div class="space-y-6">
				<!-- Credit Card -->
				<div
					class="relative w-full h-56 sm:h-60 mx-auto rounded-2xl shadow-2xl bg-gradient-to-br from-blue-500 to-purple-600 overflow-hidden"
					transition:fly={{ y: 20, duration: 300 }}
				>
					<!-- Top-left badge -->
					<div class="absolute top-4 left-4">
						<span class="text-white text-xs sm:text-sm font-semibold bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
							Crypto Card
						</span>
					</div>

					<!-- Top-right: CryptoCard Logo -->
					<div class="absolute top-4 right-4 flex items-center gap-2">
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

					<!-- Card Number Input (moved up) -->
					<div class="absolute bottom-16 left-4 right-4">
						<div class="text-white">
							<input
								bind:this={cardInputRef}
								id="cardNumber"
								type="text"
								inputmode="numeric"
								pattern="[0-9\s]*"
								placeholder="0000 0000 0000 0000"
								value={cardNumber}
								oninput={handleCardNumberInput}
								class="w-full bg-white/10 backdrop-blur-sm border-2 rounded-lg px-3 py-2 outline-none text-xl sm:text-2xl text-white placeholder-white/50 zephirum focus:outline-none transition-colors {cardValidationState === 'valid' ? 'border-green-400 focus:border-green-400' : cardValidationState === 'invalid' ? 'border-red-400 focus:border-red-400' : 'border-white/30 focus:border-white/50'}"
								maxlength="23"
								autocomplete="off"
							/>
							<div class="text-sm opacity-80 mt-1">{cardName}</div>
						</div>
					</div>

					<!-- Bottom-right text -->
					<div class="absolute bottom-4 right-4">
						<span class="text-white text-base sm:text-lg font-semibold italic">Brand</span>
					</div>
				</div>

				<!-- Proceed Button -->
				<button
					onclick={handleProceed}
					disabled={cardValidationState !== 'valid'}
					class="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-500 disabled:cursor-not-allowed disabled:hover:bg-gray-500 text-white font-semibold py-3 px-6 rounded-lg transition-colors shadow-lg"
				>
					Payment
				</button>

				<!-- Note -->
				<div class="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 text-sm text-yellow-200">
					<p>
						<strong>Note:</strong> If the card is not registered, funds will be returned minus fees; if the card doesn't have equivalent FIAT currency, the original asset received will be settled.
					</p>
				</div>

				<!-- Requested from text -->
				<div class="text-center text-xs text-gray-400">
					<div>Requested from Core ID:</div>
					<div class="zephirum text-gray-300">{coreid ? coreid.toUpperCase().replace(/(.{4})/g, '$1 ').trim() : ''}</div>
				</div>
			</div>
		{/if}
	</div>
</div>
