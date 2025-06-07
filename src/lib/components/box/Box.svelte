<script lang="ts">
	import type { Component } from 'svelte';

	export let children: Component | null = null;
	export let classValue: string = '';

	const baseClass = 'flex flex-col gap-3 grow p-4 text-gray-100 bg-gray-800/75 rounded-md lg:!p-8 lg:gap-4 lg:is-1/2';
</script>

<section class={`${baseClass} ${classValue}`}>
	{#if children}
		<svelte:component this={children} />
	{/if}
</section>
