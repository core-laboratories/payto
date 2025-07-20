<script lang="ts">
	import type { Component } from 'svelte';

	export let children: Component | null = null;
	export let classValue: string = '';
	export let noGap: boolean = false;

	const baseClass = `flex flex-col items-stretch justify-between container text-gray-100 ${noGap ? '' : 'gap-4'}`;
</script>

<div class={`${baseClass} ${classValue}`}>
	{#if children}
		<svelte:component this={children} />
	{/if}
</div>
