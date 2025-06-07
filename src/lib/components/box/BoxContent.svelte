<script lang="ts">
	import type { Component } from 'svelte';

	export let children: Component | null = null;
</script>

{#if children}
	<svelte:component this={children} />
{/if}
