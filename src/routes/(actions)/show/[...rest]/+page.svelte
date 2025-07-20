<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { writable } from 'svelte/store';
	import { Page, Row, WalletCard } from '$lib/components';

	const queryUrl = page.url.searchParams.get('url');
	const rest = page.params.rest;

	const urlParam = writable<string | undefined>(undefined);
	const hasError = writable(false);
	const errorMessage = writable('');

	onMount(() => {
		try {
			if (queryUrl) {
				urlParam.set(decodeURIComponent(queryUrl));
			} else if (rest) {
				urlParam.set(decodeURIComponent(rest));
			} else {
				throw new Error('No URL parameter provided');
			}

			if ($urlParam && !$urlParam.startsWith('payto:')) {
				throw new Error('Invalid URL format');
			}
		} catch (error) {
			console.error('Error processing URL:', error);
			hasError.set(true);
			errorMessage.set(error instanceof Error ? error.message : 'Invalid URL parameter');
		}
	});
</script>

<Page>
	<Row noGap>
		<div class="max-w-full w-[400px] max-[480px]:w-full">
			{#if $hasError}
				<div class="p-4 bg-red-500/20 border border-red-500/30 rounded-lg text-red-200">
					<h3 class="text-lg font-medium mb-2">Error</h3>
					<p>{$errorMessage}</p>
				</div>
			{:else if $urlParam}
				<WalletCard url={$urlParam} />
			{:else}
				<div class="p-4 bg-zinc-800/50 border border-zinc-700 rounded-lg animate-pulse">
					<div class="h-6 w-3/4 bg-zinc-700 rounded mb-4"></div>
					<div class="h-4 w-1/2 bg-zinc-700 rounded"></div>
				</div>
			{/if}
		</div>
	</Row>
</Page>
