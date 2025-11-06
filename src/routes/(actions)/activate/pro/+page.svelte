<script lang="ts">
	import { Page, Row } from '$lib/components';
	import { FieldGroup, FieldGroupText } from '$lib/components';
	import { page } from '$app/state';
	import { writable } from 'svelte/store';
	import { env } from '$env/dynamic/public';
	import { TriangleAlert, Copy, CircleAlert, CircleCheck, Info, ExternalLink, X } from 'lucide-svelte';
	import { formatter } from '$lib/helpers/paypass-operator.helper';

	const origin = page.url.searchParams.get('origin');
	const subscriber = page.url.searchParams.get('subscriber') || origin;
	const network = page.url.searchParams.get('network');

	const url = env.PUBLIC_WEB_ACTIVATION_URL || 'https://activate.payto.money';
	const ctnAddress = env.PUBLIC_PRO_CTN_ADDRESS || '';
	const proPrice = env.PUBLIC_PRO_PRICE || '';

	let currentStep = $state(1);
	let isSubmitting = $state(false);
	let emailChecked = $state(false);
	let telegramChecked = $state(false);
	let emailValue = $state('');
	let telegramValue = $state('');
	let errorMessage = $state('');
	let successMessage = $state('');

	// Add validation state stores
	const emailValid = writable(true);
	const telegramValid = writable(true);

	// Validation functions
	function validateEmail(email: string | undefined): boolean {
		if (!email) return true; // Empty is valid (optional field)
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		return emailRegex.test(email);
	}

	function validateTelegram(username: string | undefined): boolean {
		if (!username) return true; // Empty is valid (optional field)
		const telegramRegex = /^[a-zA-Z][a-zA-Z0-9_.]{4,31}$/;
		return telegramRegex.test(username);
	}

	// Check if button should be disabled
	const isButtonDisabled = $derived(
		isSubmitting ||
		(!emailChecked && !telegramChecked) ||
		(emailChecked && (!emailValue || !$emailValid)) ||
		(telegramChecked && (!telegramValue || !$telegramValid))
	);

	async function handleSubmit() {
		if (!emailChecked && !telegramChecked) {
			errorMessage = 'Please select at least one notification method';
			return;
		}

		isSubmitting = true;
		errorMessage = '';
		successMessage = '';

		try {
			const formData = new FormData();
			formData.append('origin', origin || '');
			formData.append('subscriber', subscriber || '');
			formData.append('network', network || '');

			if (emailChecked && emailValue) {
				formData.append('email', emailValue);
			}
			if (telegramChecked && telegramValue) {
				formData.append('telegram', telegramValue);
			}

			const response = await fetch(url, {
				method: 'POST',
				body: formData
			});

			if (response.ok) {
				currentStep = 2;
				successMessage = 'Notification setup successful!';
			} else {
				errorMessage = 'Unable to send data. Please try again later.';
			}
		} catch (error) {
			errorMessage = 'Unable to send data. Please try again later.';
		} finally {
			isSubmitting = false;
		}
	}

	function handlePayFromWallet() {
		if (ctnAddress) {
			window.open(`payto://xcb/${ctnAddress}?amount=ctn:${proPrice}`);
		}
	}

	function handleClose() {
		window.close();
	}

	function handleGoBack() {
		window.history.back();
	}

	async function copyAddress() {
		try {
			await navigator.clipboard.writeText(ctnAddress.toUpperCase());
		} catch (error) {}
	}
</script>

<Page>
	<Row>
		<div class="max-w-[600px] w-[400px] mx-auto md:w-lg md:my-4 w-full flex flex-col justify-center items-center gap-6 rounded-lg p-6 bg-gray-800/80 relative">
			<button
				onclick={handleClose}
				class="absolute top-4 right-4 p-2 text-gray-400 hover:text-white transition-colors rounded-md hover:bg-gray-700/50"
				aria-label="Close"
			>
				<X class="w-5 h-5" />
			</button>
			<h1 class="text-2xl font-bold">Activate Pro</h1>

			{#if !origin || !subscriber || !network}
				<div class="flex flex-col items-center gap-4 text-center w-full">
					<div class="flex flex-col items-center gap-2">
						<TriangleAlert class="w-6 h-6 text-rose-500" />
						<p class="text-rose-500 text-sm">Required PayPass fields are missing. Please try again.</p>
					</div>
					<button
						onclick={handleGoBack}
						class="w-full bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 transition-colors"
					>
						Go back
					</button>
				</div>
			{:else if currentStep === 1}
				<p class="text-center">Set up notifications to unlock Pro features and stay informed about your payments.</p>
				<form onsubmit={handleSubmit} class="w-full flex flex-col gap-4">
					<FieldGroup>
						<div class="flex items-center">
							<input
								type="checkbox"
								id="emailCheckbox"
								bind:checked={emailChecked}
							/>
							<label for="emailCheckbox" class="ml-2">Email Notifications</label>
						</div>

						{#if emailChecked}
							<FieldGroupText
								placeholder="e.g. user@onion.email"
								classValue={`my-2 ${
									emailValue && !$emailValid
										? 'border-2 border-rose-500 focus:border-rose-500 focus-visible:border-rose-500'
										: emailValue && $emailValid
											? 'border-2 border-emerald-500 focus:border-emerald-500 focus-visible:border-emerald-500'
											: 'border border-gray-600'
								}`}
								type="email"
								bind:value={emailValue}
								oninput={(e: Event) => {
									const input = e.target as HTMLInputElement;
									if (!input.value) {
										emailValid.set(true);
									} else {
										const isValid = validateEmail(input.value);
										emailValid.set(isValid);
									}
								}}
							/>
							{#if emailValue && !$emailValid}
								<div class="flex items-start gap-2 mt-2 p-2 bg-rose-500/10 border border-rose-500/30 rounded-md">
									<CircleAlert class="w-4 h-4 text-rose-400 mt-0.5 flex-shrink-0" />
									<p class="text-rose-400 text-sm">Please enter a valid email address</p>
								</div>
							{/if}
						{/if}
					</FieldGroup>

					<FieldGroup>
						<div class="flex items-center">
							<input
								type="checkbox"
								id="telegramCheckbox"
								bind:checked={telegramChecked}
							/>
							<label for="telegramCheckbox" class="ml-2">Telegram Notifications</label>
						</div>

						{#if telegramChecked}
							<div class="flex items-center">
								<span class="mr-2 text-white font-bold">@</span>
								<FieldGroupText
									placeholder="username"
									classValue={`my-2 ${
										telegramValue && !$telegramValid
											? 'border-2 border-rose-500 focus:border-rose-500 focus-visible:border-rose-500'
											: telegramValue && $telegramValid
												? 'border-2 border-emerald-500 focus:border-emerald-500 focus-visible:border-emerald-500'
												: 'border border-gray-600'
									}`}
									bind:value={telegramValue}
									oninput={(e: Event) => {
										const input = e.target as HTMLInputElement;
										if (input.value.startsWith('@')) {
											input.value = input.value.substring(1);
										}
										if (!input.value) {
											telegramValid.set(true);
										} else {
											const isValid = validateTelegram(input.value);
											telegramValid.set(isValid);
										}
									}}
								/>
							</div>
							{#if env.PUBLIC_TG_BOT_NAME}
								<div class="flex items-start gap-2 mt-2 p-3 bg-blue-500/10 border border-blue-500/30 rounded-md">
									<Info class="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
									<div class="flex-1">
										<p class="text-blue-400 text-sm mb-1">
											<strong>Important:</strong> You must initialize the Telegram bot before receiving notifications.
										</p>
										<a
											href={`https://t.me/${env.PUBLIC_TG_BOT_NAME}`}
											target="_blank"
											rel="noopener"
											class="text-blue-400 hover:text-blue-300 text-sm font-medium underline inline-flex items-center gap-1"
										>
											Initialize Telegram bot
											<ExternalLink class="w-3 h-3" />
										</a>
									</div>
								</div>
							{/if}
							{#if telegramValue && !$telegramValid}
								<div class="flex items-start gap-2 mt-2 p-2 bg-rose-500/10 border border-rose-500/30 rounded-md">
									<CircleAlert class="w-4 h-4 text-rose-400 mt-0.5 flex-shrink-0" />
									<p class="text-rose-400 text-sm">Username must be a valid Telegram username</p>
								</div>
							{/if}
						{/if}
					</FieldGroup>

					{#if errorMessage}
						<div class="flex items-start gap-2 p-3 bg-rose-500/10 border border-rose-500/30 rounded-md">
							<CircleAlert class="w-4 h-4 text-rose-400 mt-0.5 flex-shrink-0" />
							<p class="text-rose-400 text-sm">{errorMessage}</p>
						</div>
					{/if}
					{#if successMessage}
						<div class="flex items-start gap-2 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-md">
							<CircleCheck class="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
							<p class="text-emerald-400 text-sm">{successMessage}</p>
						</div>
					{/if}

					<button
						type="submit"
						disabled={isButtonDisabled}
						class="w-full bg-emerald-600 text-white py-2 px-4 mt-4 rounded-md hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-emerald-600"
					>
						{isSubmitting ? 'Requesting…' : 'Request Pro'}
					</button>
				</form>
			{:else}
				<!-- Step 2: Payment -->
				<div class="w-full flex flex-col gap-4">
					<p class="text-center text-sm text-gray-400">The service will be valid for 30 days and can be extended anytime.<br />All payments are non-refundable.</p>
					<div class="text-center text-lg font-bold">Pay CTN {formatter('CTN', 'currency').format(Number(proPrice))} for 30 days</div>
					<div class="flex items-center gap-2">
						<input
							type="text"
							value={ctnAddress.toUpperCase()}
							readonly
							class="flex-1 p-3 bg-gray-700 border border-gray-600 rounded-md text-white"
							onfocus={(e) => (e.target as HTMLInputElement)?.select()}
						/>
						<button
							onclick={copyAddress}
							class="px-4 py-3 bg-gray-600 hover:bg-gray-500 text-white rounded-md transition-colors"
							title="Copy address"
						>
							<Copy class="inline-block w-5 h-5" />
						</button>
					</div>

					<div class="flex flex-col gap-3 mt-4">
						<button
							onclick={handlePayFromWallet}
							class="w-full font-bold bg-emerald-600 text-white py-3 px-4 rounded-md hover:bg-emerald-700 transition-colors"
						>
							Pay with CTN
						</button>

						<button
							onclick={handleGoBack}
							class="w-full font-bold bg-gray-600 text-white py-3 px-4 rounded-md hover:bg-gray-700 transition-colors"
						>
							Back
						</button>
					</div>
				</div>
			{/if}
		</div>
	</Row>
</Page>
