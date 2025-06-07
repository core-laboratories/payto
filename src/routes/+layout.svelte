<script lang="ts">
	import "../css/app.css";
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	// Check if URL starts with '/://' and redirect by removing the first slash
	onMount(() => {
		if (page.url.pathname.startsWith('/://')) {
			const newPath = page.url.pathname.slice(3); // Remove the first slash
			goto('/show/payto%3A%2F%2F' + encodeURIComponent(newPath));
		}
	});
</script>

<slot />
