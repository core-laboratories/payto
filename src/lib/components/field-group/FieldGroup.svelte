<script lang="ts">
	import type { Component } from 'svelte';
	import { derived, writable } from 'svelte/store';
	import { setFieldGroupContext } from './fieldgroup.context';

	setFieldGroupContext();

	export let children: Component | null = null;
	export let classValue: string = '';
	export let flexType: string = 'flex-col';
	export let itemPosition: string = 'items-stretch';

	const baseClass = 'flex gap-2';
	const computedClass = derived(
		[writable(itemPosition), writable(flexType), writable(classValue)],
		([$itemPosition, $flexType, $classValue]) =>
			`${baseClass} ${$itemPosition} ${$flexType} ${$classValue}`
	);
</script>

<div class={$computedClass}>
	{#if children}
		<svelte:component this={children} />
	{/if}
</div>
