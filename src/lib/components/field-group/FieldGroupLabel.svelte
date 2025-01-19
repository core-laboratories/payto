<script lang="ts">
	import type { Component } from 'svelte';
	import { getFieldGroupContext } from './fieldgroup.context';

	const ctx = getFieldGroupContext();
	export let classValue: string = '';
	export let children: Component | null = null;
</script>

<label class={classValue} id={ctx.labelId} for={ctx.fieldId}>
	{#if children}
		<svelte:component this={children} />
	{/if}
</label>
