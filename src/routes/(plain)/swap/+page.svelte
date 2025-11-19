<script lang="ts">
	import { onMount } from 'svelte';
	import { env } from '$env/dynamic/public';

	onMount(() => {
		window.location.href = env.PUBLIC_SWAP_URL || 'https://app.ping.exchange';
	});
</script>
