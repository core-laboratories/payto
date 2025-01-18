<script lang="ts">
	import { derived, writable } from 'svelte/store';
	import { getFieldGroupContext } from './fieldgroup.context';

	export let value: string | number | undefined;
	export let placeholder: string;
	export let classValue: string = '';
	export let min: number = 0;
	export let disabled: boolean = false;

	const ctx = getFieldGroupContext();

	const baseClass = 'is-full bs-12 plb-2 pli-3 text-start bg-gray-900 rounded-md border-none caret-teal-500 focus:outline-none focus-visible:ring-4 focus-visible:ring-opacity-75 focus-visible:ring-green-800 focus-visible:ring-offset-green-700 focus-visible:ring-offset-2 sm:text-sm';
	const computedClass = derived(writable(classValue), $classValue => `${baseClass} ${$classValue}`);
</script>

<input
	class={$computedClass}
	type="number"
	id={ctx.fieldId}
	{min}
	aria-labelledby={ctx.labelId}
	aria-describedby={ctx.descriptionId}
	{placeholder}
	bind:value
	{disabled}
	{...$$restProps}
/>
