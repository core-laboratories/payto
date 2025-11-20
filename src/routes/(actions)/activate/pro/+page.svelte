<script lang="ts">
	import { Page, Row } from '$lib/components';
	import { FieldGroup, FieldGroupText } from '$lib/components';
	import { page } from '$app/state';
	import { writable } from 'svelte/store';
	import { onMount } from 'svelte';
	import { env } from '$env/dynamic/public';
	import { TriangleAlert, Copy, CircleAlert, CircleCheck, Info, ExternalLink, X } from 'lucide-svelte';
	import { formatter } from '$lib/helpers/paypass-operator.helper';

	const originId = page.url.searchParams.get('originid');
	const origin = page.url.searchParams.get('origin');
	const subscriber = page.url.searchParams.get('subscriber');
	const destination = page.url.searchParams.get('destination') || subscriber;
	const network = page.url.searchParams.get('network');
	const os = page.url.searchParams.get('os');
	const lang = page.url.searchParams.get('lang');

	const apiBaseUrl = env.PUBLIC_WEB_ACTIVATION_URL || 'https://subscription.payto.money/api/v1';
	const ctnAddress = env.PUBLIC_PRO_CTN_ADDRESS || '';
	const proPrice = env.PUBLIC_PRO_PRICE || '';

	let currentStep = $state(1);
	let isSubmitting = $state(false);
	let isCancelling = $state(false);
	let emailChecked = $state(false);
	let telegramChecked = $state(false);
	let emailValue = $state('');
	let telegramValue = $state('');
	let errorMessage = $state('');
	let successMessage = $state('');
	let isSubscriberActive = $state<boolean | null>(null);
	let subscriptionExpiresAt = $state<string | null>(null);
	let isSubscribed = $state<boolean | null>(null);
	let isLoadingSubscription = $state(true);

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

		if (!os) {
			errorMessage = 'OS is required';
			return;
		} else if (os !== 'android' && os !== 'ios') {
			errorMessage = 'Invalid OS';
			return;
		}

		if (!originId) {
			errorMessage = 'Origin ID is required';
			return;
		}

		if (!origin) {
			errorMessage = 'Origin is required';
			return;
		}

		if (!subscriber) {
			errorMessage = 'Subscriber is required';
			return;
		}

		if (!destination) {
			errorMessage = 'Destination is required';
			return;
		}

		if (!network) {
			errorMessage = 'Network is required';
			return;
		}

		if (!proPrice) {
			errorMessage = 'Pro price is required';
			return;
		}

		isSubmitting = true;
		errorMessage = '';
		successMessage = '';

		try {
			const formData = new FormData();
			formData.append('origin', origin || 'payto');
			formData.append('subscriber', subscriber || '');
			formData.append('destination', destination || '');
			formData.append('network', network || '');
			formData.append('orginid', originId || '');
			formData.append('os', os || '');
			formData.append('lang', lang || 'en');

			if (emailChecked && emailValue) {
				formData.append('email', emailValue);
			}
			if (telegramChecked && telegramValue) {
				formData.append('telegram', telegramValue);
			}

			const response = await fetch(`${apiBaseUrl}/subscription`, {
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

	async function handleCancelNotification() {
		const confirmed = window.confirm('Are you sure you want to cancel all notifications? You will not be refunded, but you can create new notifications later.');
		if (!confirmed) {
			return;
		}

		if (!originId) {
			errorMessage = 'Origin ID is required';
			return;
		}

		isCancelling = true;
		errorMessage = '';
		successMessage = '';

		try {
			// TODO: Replace with actual endpoint call
			// const response = await fetch(cancelEndpoint, { method: 'POST', ... });
			// if (response.ok) {
			// 	successMessage = 'Notifications cancelled successfully.';
			// } else {
			// 	errorMessage = 'Unable to cancel notifications. Please try again later.';
			// }
			console.log('Cancel notification endpoint will be called here');
		} catch (error) {
			errorMessage = 'Unable to cancel notifications. Please try again later.';
		} finally {
			isCancelling = false;
		}
	}

	async function copyAddress() {
		try {
			await navigator.clipboard.writeText(ctnAddress.toUpperCase());
		} catch (error) {}
	}

	async function loadSubscriptionStatus() {
		if (!subscriber) {
			isLoadingSubscription = false;
			return;
		}

		try {
			const response = await fetch(`${apiBaseUrl}/is_subscribed?address=${encodeURIComponent(subscriber)}`);

			if (response.status === 404) {
				// Wallet not found - not registered
				isSubscribed = false;
				isSubscriberActive = false;
				subscriptionExpiresAt = null;
			} else if (response.ok) {
				const data = await response.json();
				isSubscribed = data.subscribed || false;
				isSubscriberActive = data.active || false;

				// Convert expires_at timestamp to ISO string if present
				if (data.expires_at) {
					const expiresDate = new Date(data.expires_at * 1000); // Convert Unix timestamp to Date
					subscriptionExpiresAt = expiresDate.toISOString();
				} else {
					subscriptionExpiresAt = null;
				}
			} else {
				// Error response
				isSubscribed = false;
				isSubscriberActive = false;
				subscriptionExpiresAt = null;
			}
		} catch (error) {
			// Network or other error
			isSubscribed = false;
			isSubscriberActive = false;
			subscriptionExpiresAt = null;
		} finally {
			isLoadingSubscription = false;
		}
	}

	function formatSubscriptionDate(dateString: string | null): string {
		if (!dateString) return '';
		try {
			const date = new Date(dateString);
			return date.toLocaleString('en-US', {
				year: 'numeric',
				month: 'long',
				day: 'numeric',
				hour: '2-digit',
				minute: '2-digit'
			});
		} catch (error) {
			return dateString;
		}
	}

	// Load subscription status on mount
	onMount(() => {
		loadSubscriptionStatus();
	});
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

			{#if !subscriber || !destination || !network || !originId || !origin || !os}
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
				<div class="text-center">
					<p class="mb-1">Set up notifications to unlock Pro features and stay informed about incoming payments from well-known tokens and coins.</p>
					<p class="text-sm text-gray-400">More secure than in-pass notifications. Your passes are not copied to our servers; we only require your basic data.</p>
				</div>

				{#if !isLoadingSubscription && (isSubscribed !== null)}
					<div class="w-full p-3 bg-amber-500/10 border border-amber-500/30 rounded-md">
						<p class="text-amber-400 text-sm">
							{#if isSubscribed && subscriptionExpiresAt}
								You are an active subscriber until {formatSubscriptionDate(subscriptionExpiresAt)}
							{:else}
								You are not an active subscriber yet.
							{/if}
						</p>
					</div>
				{/if}

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
						{isSubmitting ? 'Sending…' : 'Create or Update notifications'}
					</button>

					<button
						type="button"
						onclick={handleCancelNotification}
						disabled={isCancelling || isSubmitting}
						class="w-full text-center text-sm text-gray-400 hover:text-gray-300 underline py-2 mt-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:no-underline"
					>
						{isCancelling ? 'Cancelling…' : 'Cancel All Notifications'}
					</button>
				</form>
			{:else}
				<!-- Step 2: Payment -->
				<div class="w-full flex flex-col gap-4">
					<p class="text-center text-sm text-gray-400">Service duration is based on your payment amount.<br />All payments are non-refundable. You can extend your service at any time.</p>
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
