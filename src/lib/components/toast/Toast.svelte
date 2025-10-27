<script lang="ts" context="module">
	export function toastType(type: string): string {
		return {
			success: 'bg-green-500 text-green-50',
			error: 'bg-red-500 text-red-50',
			info: 'bg-blue-500 text-blue-50',
			warning: 'bg-yellow-500 text-yellow-50'
		}[type] || 'bg-gray-800 text-gray-400';
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
			class={`toast p-4 rounded-lg shadow-lg w-72 ${toastType(type)}`}
		>
			{message}
		</div>
	{/each}
</div>
