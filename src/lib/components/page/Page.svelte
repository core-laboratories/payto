<script lang="ts">
	import type { Component } from 'svelte';

	export let children: Component | null = null;
</script>

<svelte:head>
	<title>PayTo: Money — Direct Asset Transfers</title>
	<meta name="description" content="Direct Asset Transfers without intermediaries. Send and receive digital assets peer-to-peer." />
	<meta property="twitter:title" content="PayTo: Money — Direct Asset Transfers" />
	<meta property="twitter:description" content="Direct Asset Transfers without intermediaries. Send and receive digital assets peer-to-peer." />
	<meta property="twitter:image" content="https://payto.money/icons/android-chrome-512x512.png" />
	<meta property="og:title" content="PayTo: Money — Direct Asset Transfers" />
	<meta property="og:description" content="Direct Asset Transfers without intermediaries. Send and receive digital assets peer-to-peer." />
	<meta property="og:image" content="https://payto.money/icons/android-chrome-512x512.png" />
</svelte:head>

<div>
	{#if children}
		<svelte:component this={children} />
	{/if}
</div>
