<script lang="ts">
	import type { Component } from 'svelte';

	export let children: Component | null = null;
</script>

<h1 class="m-0 text-2xl font-bold text-white lg:text-3xl">
	{#if children}
		<svelte:component this={children} />
	{/if}
</h1>
