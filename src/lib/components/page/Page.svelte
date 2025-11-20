<script lang="ts">
	import type { Component } from 'svelte';

	export let children: Component | null = null;
	export let classValue: string = '';
	export let title: string = 'PayTo:Money — Payments Without Borders';
	export let description: string = 'Payments Without Borders without intermediaries. Send and receive digital assets peer-to-peer.';
	export let image: string = 'https://payto.money/icons/android-chrome-512x512.png';
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	<meta property="twitter:title" content={title} />
	<meta property="twitter:description" content={description} />
	<meta property="twitter:image" content={image} />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	<meta property="og:image" content={image} />
</svelte:head>

<div class={classValue}>
	{#if children}
		<svelte:component this={children} />
	{/if}
</div>
