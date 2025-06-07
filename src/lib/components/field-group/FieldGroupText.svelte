<script lang="ts">
	import { getFieldGroupContext } from './fieldgroup.context';

	export let value: string | number | undefined;
	export let placeholder: string;
	export let classValue: string = '';

	const ctx = getFieldGroupContext();
	const baseClass = 'w-full bs-12 p-3 text-start bg-gray-900 rounded-md border-0 caret-teal-500 focus:outline-none focus-visible:ring-4 focus-visible:ring-opacity-75 focus-visible:ring-green-800 focus-visible:ring-offset-green-700 focus-visible:ring-offset-2 text-sm placeholder:normal-case';
</script>

<input
	class={`${baseClass} ${classValue}`}
	type="text"
	autocomplete="off"
	on:input
	id={ctx.fieldId}
	aria-labelledby={ctx.labelId}
	aria-describedby={ctx.descriptionId}
	{placeholder}
	bind:value
	{...$$restProps}
/>
