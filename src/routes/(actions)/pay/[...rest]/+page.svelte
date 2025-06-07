<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { writable, derived } from 'svelte/store';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { Page, Row } from '$lib/components';
	import { formatRecurringPeriod } from '$lib/helpers/format-recurring-period.helper';
	import { ASSETS_NAMES } from '$lib/constants/asset-names';
	import Payto from 'payto-rl';
	import ExchNumberFormat from 'exchange-rounding';
	import { browser } from '$app/environment';

	let urlParam: string | undefined;
	const rest = page.params.rest;
	const queryUrl = page.url.searchParams.get('url');
	const timeoutParam = page.url.searchParams.get('time');
	let referrer = decodeURIComponent(page.url.searchParams.get('referrer') || '/');

	// Validate and set timeout (between 1 and 120 minutes)
	const timeoutMinutes = timeoutParam ? Math.min(Math.max(parseInt(timeoutParam, 10) || 0, 1), 120) : 0;
	const timeoutMs = timeoutMinutes * 60 * 1000;

	// Timer state
	const timeRemaining = writable<number>(timeoutMs);
	const timePercentage = derived(timeRemaining, $timeRemaining =>
		timeoutMs > 0 ? ($timeRemaining / timeoutMs) * 100 : 0
	);
	const formattedTimeRemaining = derived(timeRemaining, $timeRemaining => {
		if ($timeRemaining <= 0) return '00:00';
		const minutes = Math.floor($timeRemaining / 60000);
		const seconds = Math.floor(($timeRemaining % 60000) / 1000);
		return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
	});

	let timerInterval: ReturnType<typeof setInterval> | null = null;

	// Initialize any variables that would use document
	let documentElement;

	/**
	 * Checks if a timestamp is expired
	 */
	function isExpiredTimestamp(timestamp: number | string | null | undefined): boolean {
		if (timestamp === null || timestamp === undefined) {
			return false;
		}

		const numericTimestamp = typeof timestamp === 'string'
			? parseInt(timestamp, 10)
			: timestamp;

		if (isNaN(numericTimestamp)) {
			return false;
		}

		const now = Date.now();

		const timestampInMs = numericTimestamp * 1000;

		return timestampInMs < now;
	}

	const showForm = writable<boolean>(false);
	const isDonation = writable<boolean>(true);
	const reccuring = writable<string | null>(null);
	const amount = writable<number | undefined>(undefined);
	const currency = writable<string | null | undefined>(undefined);
	const paymentType = writable<string | undefined>(undefined);
	const item = writable<string | null | undefined>(undefined);
	const assetName = writable<string | null | undefined>(undefined);
	const isExpired = writable<boolean>(false);
	const isLoading = writable<boolean>(true);

	let valueStore;

	function startTimer() {
		if (timeoutMs <= 0) return;

		const startTime = Date.now();
		const endTime = startTime + timeoutMs;

		timerInterval = setInterval(() => {
			const now = Date.now();
			const remaining = Math.max(0, endTime - now);

			timeRemaining.set(remaining);

			if (remaining <= 0) {
				isExpired.set(true);
				if (timerInterval) {
					clearInterval(timerInterval);
					timerInterval = null;
				}
			}
		}, 1000);
	}

	function goBack() {
		goto(referrer);
	}

	onMount(() => {
		if (browser) {
			documentElement = document.documentElement;
			if (document.referrer && !page.url.searchParams.get('referrer')) {
				referrer = document.referrer;
			}
		}

		if (queryUrl) {
			urlParam = decodeURIComponent(queryUrl);
		} else if (rest) {
			urlParam = decodeURIComponent(rest);
		}

		if (urlParam) {
			try {
				const payto = new Payto(urlParam).toJSONObject();
				const paytoParams = new URLSearchParams(payto.search);

				if (payto.hostname && payto.address) {
					showForm.set(true);
				}

				isDonation.set(paytoParams.get('donate') === '1');
				reccuring.set(formatRecurringPeriod(paytoParams.get('rc')) || null);
				amount.set(payto.value ? Number(payto.value) : undefined);
				paymentType.set((payto.hostname === 'void' ? 'cash' : payto.hostname));
				currency.set(payto.currency ?
					payto.currency[1] ?
						payto.currency[1] :
						payto.currency[0] :
					null
				);
				item.set(payto.item);
				assetName.set(ASSETS_NAMES[(($currency ? $currency.toUpperCase() : payto.hostname?.toUpperCase()) as keyof typeof ASSETS_NAMES) || ''] || null);
				isExpired.set(isExpiredTimestamp(payto.deadline));

				valueStore = derived([amount, currency], ([$amount, $currency]) => {
					const currencyToUse = $currency || payto.hostname;
					const formatter = new ExchNumberFormat(undefined, {
						style: 'currency',
						currency: currencyToUse || '',
						currencyDisplay: 'symbol',
						minimumFractionDigits: 2,
						cropZeros: true
					});

					if ($amount) {
						return formatter.format($amount);
					}
					return 'Custom $';
				});
			} catch (error) {
				console.error('Error parsing PayTo URL:', error);
				showForm.set(false);
			}
		}

		isLoading.set(false);

		// Start the timer if timeout is set and payment is not already expired
		if (timeoutMs > 0 && !$isExpired) {
			startTimer();
		}
	});

	onDestroy(() => {
		if (timerInterval) {
			clearInterval(timerInterval);
		}
	});
</script>

<Page>
	<Row>
		<div class="max-w-[600px] w-[400px] sm:w-md md:w-lg lg:w-full flex flex-col justify-center items-center gap-6 text-center text-zinc-400/70 bg-zinc-600/20 rounded-lg px-6 pt-6 pb-12">
			{#if $isLoading}
				<div class="text-2xl text-zinc-400/80 font-bold">
					Loading…
				</div>
			{:else if $showForm && $isExpired}
				<div class="text-2xl text-zinc-400/80 font-bold">
					Request for payment is expired
				</div>
				<div class="mt-4">
					<button
						on:click={goBack}
						class="inline-flex items-center cursor-pointer px-4 py-3 bg-zinc-700/50 hover:bg-zinc-700/70 text-zinc-300 font-sans text-lg leading-5 border border-zinc-600 rounded-full no-underline h-fit whitespace-nowrap transition-all duration-150 ease-in-out hover:border-zinc-500">
						<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2">
							<path d="M19 12H5M12 19l-7-7 7-7"/>
						</svg>
						Go Back
					</button>
				</div>
			{:else if $showForm}
				{#if timeoutMs > 0}
					<div class="w-full mb-2">
						<div class="flex justify-between items-center mb-1">
							<span class="text-sm text-zinc-400/80">Time remaining</span>
							<span class="text-sm font-medium text-zinc-300">{$formattedTimeRemaining}</span>
						</div>
						<div class="w-full bg-zinc-700/30 rounded-full h-2.5">
							<div class="h-2.5 rounded-full transition-all duration-1000 ease-linear"
								class:bg-emerald-500={$timePercentage > 50}
								class:bg-amber-500={$timePercentage <= 50 && $timePercentage > 20}
								class:bg-red-500={$timePercentage <= 20}
								style="width: {$timePercentage}%"></div>
						</div>
					</div>
				{/if}

				<h1 class="text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-zinc-400/70 font-bold">{$valueStore}</h1>
				<div class="text-xl text-zinc-400/70 italic">
					<span>{$isDonation ? 'Donate' : 'Pay'}</span>
					{#if $item}
						<span class="ml-0.25">for {$item}</span>
					{/if}
					{#if $reccuring}
						<span class="ml-0.25">{$reccuring}</span>
					{/if}
					{#if $assetName}
						<span class="ml-0.25">with {$assetName}</span>
					{/if}
				</div>
				<div class="mt-8">
					{#if $isDonation}
						<a href={urlParam} class="inline-flex items-center cursor-pointer px-4 py-3 bg-[#849dfc20] hover:bg-[#849dfc38] !text-[#849dfc] font-sans text-lg leading-5 border border-[#878fc5] rounded-full !no-underline h-fit whitespace-nowrap transition-all duration-150 ease-in-out hover:border-[#b6c2f4] hover:text-[#b6c2f4] group">
							{#if $reccuring}
								<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke-width="2"><path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46A7.93 7.93 0 0020 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74A7.93 7.93 0 004 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/></svg>&nbsp;
							{/if}
							<strong class="italic mr-1">Donate<span class="text-[#5675ff]">To:</span></strong> via {$paymentType ? $paymentType.toUpperCase() : ''}{$currency ? ` with ${$currency.toUpperCase()}` : ''}
						</a>
					{:else}
						<a href={urlParam} class="inline-flex items-center cursor-pointer px-4 py-3 bg-[#72bd5e20] hover:bg-[#72bd5e38] !text-[#72bd5e] font-sans text-lg leading-5 border border-[#639953] rounded-full !no-underline h-fit whitespace-nowrap transition-all duration-150 ease-in-out hover:border-[#95e87f] hover:text-[#95e87f] font-sans group">
							{#if $reccuring}
								<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke-width="2"><path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46A7.93 7.93 0 0020 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74A7.93 7.93 0 004 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/></svg>&nbsp;
							{/if}
							<strong class="italic mr-1">Pay<span class="text-[#059669]">To:</span></strong> via {$paymentType ? $paymentType.toUpperCase() : ''}{$currency ? ` with ${$currency.toUpperCase()}` : ''}
						</a>
					{/if}
				</div>
			{:else}
				<div class="text-2xl text-zinc-400/80 font-bold">
					Invalid PayTo link
				</div>
				<div>
					<a href="/" class="flex items-center gap-2 w-fit">
						<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
							<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
							<polyline points="9 22 9 12 15 12 15 22"/>
						</svg>
						Return Home
					</a>
				</div>
			{/if}
		</div>
	</Row>
</Page>
