<script lang="ts">
	import type { Component } from 'svelte';

	export let children: Component | null = null;
	export let classValue: string = '';

	const baseClass = 'flex flex-col items-stretch justify-between gap-4 container py-4 lg:py-6 text-gray-100';
</script>

<div class={`${baseClass} ${classValue}`}>
	{#if children}
		<svelte:component this={children} />
	{/if}
</div>
