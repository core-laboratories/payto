<script lang="ts">
	import type { Component } from 'svelte';
	import { derived, writable } from 'svelte/store';
	import { getFieldGroupContext } from './fieldgroup.context';

	const ctx = getFieldGroupContext();
	export let classValue: string = '';
	export let children: Component | null = null;

	const computedClass = derived(writable(classValue), $classValue => $classValue);
</script>

<label class={$computedClass} id={ctx.labelId} for={ctx.fieldId}>
	{#if children}
		<svelte:component this={children} />
	{/if}
</label>
