<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { writable } from 'svelte/store';
	import { Page, Row, WalletCard } from '$lib/components';

	const urlParam = page.url.searchParams.get('url');
	const isClient = writable(false);

	onMount(() => {
		isClient.set(true);
	});
</script>

<Page>
	<Row>
		<div class="max-w-full w-[400px] max-[480px]:w-full">
			{#if $isClient}
				<WalletCard url={urlParam} />
			{/if}
		</div>
	</Row>
</Page>
