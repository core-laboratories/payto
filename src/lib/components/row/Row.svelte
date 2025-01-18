<script lang="ts">
	import type { Component } from 'svelte';

	export let children: Component | null = null;
</script>

<div class="flex flex-col items-stretch justify-between gap-8 container plb-4 mlb-4 lg:flex-row lg:plb-6 lg:mlb-6 text-gray-100">
	{#if children}
		<svelte:component this={children} />
	{/if}
</div>
