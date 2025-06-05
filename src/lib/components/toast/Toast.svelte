<script lang="ts" context="module">
	export function toastType(type: string): string {
		return {
			success: 'bg-green-500',
			error: 'bg-red-500',
			info: 'bg-blue-500',
			warning: 'bg-yellow-500'
		}[type] || 'bg-gray-800';
	}
</script>

<script lang="ts">
	import { fade } from 'svelte/transition';
	import { toasts } from './toastStore';
</script>

<div class="fixed bottom-4 right-4 space-y-2 z-20">
	{#each $toasts as { id, message, type = 'info' } (id)}
		<div
			in:fade
			class={`toast p-4 rounded-lg shadow-lg text-white w-72 ${toastType(type)}`}
		>
			{message}
		</div>
	{/each}
</div>
