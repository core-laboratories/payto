<script lang="ts">
	import { getFieldGroupContext } from './fieldgroup.context';
	import { stripWhitespace as sanitizeWhitespace } from '$lib/helpers/strip-whitespace.helper';

	export let value: string | number | undefined;
	export let placeholder: string;
	export let classValue: string = '';
	export let min: number = 0;
	export let disabled: boolean = false;
	export let stripWhitespace: boolean = false;

	const ctx = getFieldGroupContext();

	const baseClass = 'w-full bs-12 p-3 text-start bg-gray-900 rounded-md border-0 caret-teal-500 focus:outline-none focus-visible:ring-4 focus-visible:ring-opacity-75 focus-visible:ring-green-800 focus-visible:ring-offset-green-700 focus-visible:ring-offset-2 text-sm placeholder:normal-case placeholder:text-gray-400';

	function handleInput(event: Event) {
		if (!stripWhitespace) return;

		const input = event.currentTarget as HTMLInputElement;
		const sanitizedValue = sanitizeWhitespace(input.value);

		if (sanitizedValue !== input.value) {
			input.value = sanitizedValue;
		}
	}
</script>

<input
	class={`${baseClass} ${classValue}`}
	type="number"
	on:input|capture={handleInput}
	on:change|capture={handleInput}
	id={ctx.fieldId}
	{min}
	aria-labelledby={ctx.labelId}
	aria-describedby={ctx.descriptionId}
	{placeholder}
	bind:value
	{disabled}
	{...$$restProps}
/>
