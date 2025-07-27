<script lang="ts">
	import { Page, Row } from '$lib/components';
	import { FieldGroup, FieldGroupText } from '$lib/components';
	import { page } from '$app/state';
	import { writable } from 'svelte/store';
	import { env } from '$env/dynamic/public';
	import { AlertTriangle, Copy } from 'lucide-svelte';

	const originator = page.url.searchParams.get('originator');
	const subscriber = page.url.searchParams.get('subscriber');
	const destination = page.url.searchParams.get('destination');
	const network = page.url.searchParams.get('network');

	const url = env.PUBLIC_WEB_ACTIVATION_URL || 'https://activate.payto.money';
	const ctnAddress = env.PUBLIC_CTN_ADDRESS || '';

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
			formData.append('originator', originator || '');
			formData.append('subscriber', subscriber || '');
			formData.append('destination', destination || '');
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
				errorMessage = 'We cannot send data, please try again later';
			}
		} catch (error) {
			errorMessage = 'We cannot send data, please try again later';
		} finally {
			isSubmitting = false;
		}
	}

	function handlePayFromWallet() {
		if (ctnAddress) {
			window.open(`payto://xcb/${ctnAddress}?amount=ctn:400`);
		}
	}

	function handleClose() {
		window.close();
	}

	async function copyAddress() {
		try {
			await navigator.clipboard.writeText(ctnAddress);
			// toast({ message: 'Address copied to clipboard', type: 'success' }); // Removed toast
		} catch (error) {
			// toast({ message: 'Failed to copy address', type: 'error' }); // Removed toast
		}
	}
</script>

<Page>
	<Row>
		<div class="max-w-[600px] w-[400px] mx-auto md:w-lg md:my-4 w-full flex flex-col justify-center items-center gap-6 rounded-lg p-6 bg-gray-800/80">
			<h1 class="text-2xl font-bold">Activate Pro</h1>

			{#if currentStep === 1}
				<p>Please enter notification setup to activate Pro.</p>

				{#if !originator || !subscriber || !destination || !network}
					<p class="text-rose-500 text-sm mt-1">We are missing fields from PayPass. Please try again.</p>
				{:else}
					<form onsubmit={handleSubmit} class="w-full flex flex-col gap-4">
						<FieldGroup>
							<div class="flex items-center">
								<input
									type="checkbox"
									id="emailCheckbox"
									bind:checked={emailChecked}
								/>
								<label for="emailCheckbox" class="ml-2">Email Notification</label>
							</div>

							{#if emailChecked}
								<FieldGroupText
									placeholder="e.g. user@onion.email"
									classValue="my-2"
									type="email"
									bind:value={emailValue}
									oninput={(e: Event) => {
										const input = e.target as HTMLInputElement;
										const isValid = validateEmail(input.value);
										emailValid.set(isValid);
									}}
								/>
								{#if !$emailValid}
									<p class="text-rose-500 text-sm mt-1">Please enter a valid email address</p>
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
								<label for="telegramCheckbox" class="ml-2">Telegram Notification</label>
							</div>

							{#if telegramChecked}
								<div class="flex items-center">
									<span class="mr-2 text-white font-bold">@</span>
									<FieldGroupText
										placeholder="username"
										classValue="my-2"
										bind:value={telegramValue}
										oninput={(e: Event) => {
											const input = e.target as HTMLInputElement;
											if (input.value.startsWith('@')) {
												input.value = input.value.substring(1);
											}
											const isValid = validateTelegram(input.value);
											telegramValid.set(isValid);
										}}
									/>
								</div>
								{#if env.PUBLIC_TG_BOT_NAME}
									<p class="text-sm mt-1">
										<a href={`https://t.me/${env.PUBLIC_TG_BOT_NAME}`} target="_blank" rel="noopener" class="text-blue-500 hover:text-blue-600">Initialize Telegram bot (required for notifications).</a>
									</p>
								{/if}
								{#if !$telegramValid}
									<p class="text-rose-500 text-sm mt-1">Username must be valid Telegram username</p>
								{/if}
							{/if}
						</FieldGroup>

						{#if errorMessage}
							<p class="text-rose-500 text-sm mt-1">{errorMessage}</p>
						{/if}
						{#if successMessage}
							<p class="text-green-500 text-sm mt-1">{successMessage}</p>
						{/if}

						<button
							type="submit"
							disabled={isSubmitting}
							class="w-full bg-blue-500 text-white py-2 px-4 mt-4 rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{isSubmitting ? 'Requesting…' : 'Request Pro'}
						</button>
					</form>
				{/if}
			{:else}
				<!-- Step 2: Payment -->
				<div class="w-full flex flex-col gap-4">
					<p class="text-center">Pay CTN Ƈ 400/month to address</p>
					<p class="text-center text-sm text-gray-400">The equivalent will be calculated for the running of service - you can pay more or less. 400 CTN is per 30 days.</p>

					<div class="flex items-center gap-2">
						<input
							type="text"
							value={ctnAddress}
							readonly
							class="flex-1 p-3 bg-gray-700 border border-gray-600 rounded-md text-white"
						/>
						<button
							onclick={copyAddress}
							class="px-4 py-3 bg-gray-600 hover:bg-gray-500 text-white rounded-md transition-colors"
							title="Copy address"
						>
							<Copy class="inline-block mr-2" size={16} />
						</button>
					</div>

					<div class="p-3 bg-amber-900/50 border border-amber-700 rounded-md text-amber-200 text-sm">
						<AlertTriangle class="inline-block mr-2" size={16} /> Make the payment from the same wallet (Core ID) you are using in this PayPass, otherwise the service will not be activated.
					</div>

					<div class="flex flex-col gap-3 mt-4">
						<button
							onclick={handlePayFromWallet}
							class="w-full bg-emerald-600 text-white py-3 px-4 rounded-md hover:bg-emerald-700 transition-colors"
						>
							Pay from Wallet
						</button>

						<button
							onclick={handleClose}
							class="w-full bg-gray-600 text-white py-3 px-4 rounded-md hover:bg-gray-700 transition-colors"
						>
							Close
						</button>
					</div>
				</div>
			{/if}
		</div>
	</Row>
</Page>
