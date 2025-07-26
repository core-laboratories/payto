<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { writable } from 'svelte/store';
	import { WalletCard } from '$lib/components';

	const queryUrl = page.url.searchParams.get('url');
	const rest = page.params.rest;

	const urlParam = writable<string | undefined>(undefined);
	const hasError = writable(false);
	const errorMessage = writable('');
	const loading = writable(true);

	onMount(() => {
		let url: string | undefined;
		try {
			if (queryUrl) {
				url = decodeURIComponent(queryUrl);
			} else if (rest) {
				url = decodeURIComponent(rest);
			} else {
				throw new Error('No URL parameter provided');
			}

			// Simulate async loading for UX (remove setTimeout in production)
			setTimeout(() => {
				if (!url || !url.startsWith('payto:')) {
					hasError.set(true);
					errorMessage.set('Invalid URL format');
					loading.set(false);
				} else {
					urlParam.set(url);
					loading.set(false);
				}
			}, 400); // 400ms for smooth loading animation
		} catch (error) {
			hasError.set(true);
			errorMessage.set(error instanceof Error ? error.message : 'Invalid URL parameter');
			loading.set(false);
		}
	});
</script>

<div class="max-w-full w-[400px] w-full sm:max-w-[440px] mx-auto sm:py-8">
	{#if $loading}
		<div class="p-6 bg-zinc-800/60 border border-zinc-700 rounded-xl animate-pulse flex flex-col gap-4 shadow-lg">
			<div class="h-8 w-2/3 bg-zinc-700 rounded mb-2"></div>
			<div class="h-4 w-1/2 bg-zinc-700 rounded"></div>
			<div class="h-10 w-full bg-zinc-700 rounded mt-4"></div>
		</div>
	{:else if $hasError}
		<div class="p-4 bg-red-500/20 border border-red-500/30 rounded-lg text-red-200">
			<h3 class="text-lg font-medium mb-2">Error</h3>
			<p>{$errorMessage}</p>
		</div>
	{:else if $urlParam}
		<WalletCard url={$urlParam} />
	{/if}
</div>
