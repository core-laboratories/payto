<script lang="ts">
	import { derived, writable } from 'svelte/store';
	import { getFieldGroupContext } from './fieldgroup.context';

	export let value: string | number | undefined;
	export let min: string;
	export let classValue: string = '';
	export let unixTimestamp: number | undefined;

	const ctx = getFieldGroupContext();

	const valueStore = writable(value);
	const timestampStore = derived(valueStore, $value => {
		if (typeof $value === 'string' && $value) {
			const date = new Date($value);
			return Math.floor(date.getTime() / 1000);
		}
		return undefined;
	});

	timestampStore.subscribe(value => unixTimestamp = value);

	const baseClass = 'w-full bs-12 p-3 text-start bg-gray-900 rounded-xs border-0 caret-teal-500 focus:outline-none focus-visible:ring-4 focus-visible:ring-opacity-75 focus-visible:ring-green-800 focus-visible:ring-offset-green-700 focus-visible:ring-offset-2 text-sm';
</script>

<input
	class={`${baseClass} ${classValue}`}
	type="datetime-local"
	id={ctx.fieldId}
	aria-labelledby={ctx.labelId}
	aria-describedby={ctx.descriptionId}
	{min}
	bind:value
	{...$$restProps}
/>
