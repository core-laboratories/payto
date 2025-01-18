<script lang="ts">
	import { writable, derived } from 'svelte/store';
	import { slide } from 'svelte/transition';

	export let items: ({ value: string | number; label: string; ticker?: string; group?: string } | { group: string; items: { value: string | number; label: string; ticker?: string }[] })[] = [];
	export let value: string | number;
	export let id: string = '';

	const expanded = writable(false);
	let dropdownElement: HTMLDivElement | null = null;

	function toggle() {
		expanded.update((e) => !e);
	}

	function select(item: { value: string | number; label: string; ticker?: string }) {
		if (String(value) === String(item.value)) {
			expanded.update((e) => !e);
			return;
		}
		value = item.value;
		const event = new CustomEvent('change', { detail: item.value });
		dropdownElement?.dispatchEvent(event);
		expanded.set(false);
	}

	function handleOutsideClick(event: MouseEvent) {
		if (dropdownElement && !dropdownElement.contains(event.target as Node)) {
			expanded.set(false);
		}
	}

	function isCategory(item: any): item is { group: string; items: { value: string | number; label: string; ticker?: string }[] } {
		return item.items && Array.isArray(item.items);
	}

	const selectedLabel = derived(writable(value), $value => {
		for (const item of items) {
			if (isCategory(item)) {
				const selectedItem = item.items.find(subItem => String(subItem.value) === String($value));
				if (selectedItem) return selectedItem.label;
			} else if (String(item.value) === String($value)) {
				return item.label;
			}
		}
		return 'Select an option';
	});
</script>

<div class="relative w-full dropdown" bind:this={dropdownElement}>
	<button
		{id}
		type="button"
		on:click={toggle}
		aria-label="Toggle dropdown"
		class="inline-flex items-center justify-between bg-gray-900 border-2 border-gray-800 w-full px-3 py-2 rounded-md cursor-context-menu focus:outline-none focus-visible:ring-4 focus-visible:ring-opacity-75 focus-visible:ring-green-800"
	>
		<span class="truncate">{$selectedLabel}</span>
		<span class="ml-2">
			<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
				<path stroke-linecap="round" stroke-linejoin="round" d="M8.25 15l3.75 3.75L15.75 15m-7.5-6l3.75-3.75L15.75 9" />
			</svg>
		</span>
	</button>

	{#if $expanded}
		<ul
			class="absolute mt-1 max-h-60 w-full overflow-auto rounded-md shadow-lg z-10 ring-1 ring-black ring-opacity-5 focus:outline-none bg-gray-900"
			tabindex="-1"
			in:slide={{ duration: 200 }}
			out:slide={{ duration: 100 }}
		>
			{#each items as item}
				{#if isCategory(item)}
					<li class="px-3 py-1 text-sm font-semibold">{item.group}</li>
					{#each item.items as subItem}
						<li>
							<button
								type="button"
								aria-label={subItem.label}
								on:click={() => select(subItem)}
								on:keydown={(e) => (e.key === 'Enter' || e.key === ' ') && select(subItem)}
								class="flex items-center w-full px-3 py-2 hover:bg-gray-800 hover:brightness-150"
							>
								{#if String(value) === String(subItem.value)}
									<span class="w-3 h-3 mr-2 rounded-full bg-[var(--payto-color-green-core)]"></span>
								{:else}
									<span class="w-3 h-3 mr-2"></span>
								{/if}
								<span class="flex-1 text-left">{subItem.label}</span>
								{#if subItem.ticker}
									<span class="text-sm">{subItem.ticker}</span>
								{/if}
							</button>
						</li>
					{/each}
				{:else}
					<li>
						<button
							type="button"
							aria-label={item.label}
							on:click={() => select(item)}
							on:keydown={(e) => (e.key === 'Enter' || e.key === ' ') && select(item)}
							class="flex items-center w-full px-3 py-2 hover:bg-gray-800 hover:brightness-150"
						>
							{#if String(value) === String(item.value)}
								<span class="w-3 h-3 mr-2 rounded-full bg-[var(--payto-color-green-core)]"></span>
							{:else}
								<span class="w-3 h-3 mr-2"></span>
							{/if}
							<span class="flex-1 text-left">{item.label}</span>
							{#if item.ticker}
								<span class="text-sm">{item.ticker}</span>
							{/if}
						</button>
					</li>
				{/if}
			{/each}
		</ul>
	{/if}
</div>

<svelte:window on:click={handleOutsideClick} />
