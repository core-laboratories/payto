<script lang="ts">
	import { onMount } from 'svelte';
	import { env } from '$env/dynamic/public';
	import { page } from '$app/state';

	onMount(() => {
		const swapUrl = env.PUBLIC_SWAP_URL || 'https://app.ping.exchange';
		const queryString = page.url.search;
		const redirectUrl = queryString ? `${swapUrl}${queryString}` : swapUrl;
		window.location.href = redirectUrl;
	});
</script>
