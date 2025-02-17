<script lang="ts">
	import { onMount } from 'svelte';
	import { writable } from 'svelte/store';
	import { Page, Row, WalletCard } from '$lib/components';

	export let data;

	const isClient = writable(false);

	onMount(() => {
		isClient.set(true);
	});
</script>

<Page>
	<Row>
		<div class="max-w-full w-[400px] max-[480px]:w-full">
			{#if $isClient}
				<WalletCard url={data.urlParam} />
			{/if}
		</div>
	</Row>
</Page>
