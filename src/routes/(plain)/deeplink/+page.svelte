<script lang="ts">
	import { onMount } from 'svelte';

    onMount(async () => {
		const params = new URLSearchParams(window.location.search);
		const raw = params.get('url');

		if (!raw) {
			alert('No payment link provided.');
			window.location.replace('https://payto.money/');
			return;
		}

		let target = raw;
		try {
			target = decodeURIComponent(raw);
		} catch {
			// ignore
		}

		// Security: only allow payto://
		if (!/^payto:\/\//i.test(target)) {
			alert('Invalid or unsupported link.');
			window.location.replace('https://payto.money/');
			return;
		}

		// Launch deeplink
		window.location.href = target;

		// Close tab if possible
		setTimeout(() => {
			try {
				window.close();
			} catch {}
		}, 700);
	});
</script>
