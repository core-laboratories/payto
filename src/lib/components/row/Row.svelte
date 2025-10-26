<script lang="ts">
	import type { Component } from 'svelte';

	export let children: Component | null = null;
	export let classValue: string = '';

	const baseClass = `flex flex-col items-stretch justify-between container text-gray-100 mx-auto`;
</script>

<div class={`${baseClass} ${classValue}`}>
	{#if children}
		<svelte:component this={children} />
	{/if}
</div>
