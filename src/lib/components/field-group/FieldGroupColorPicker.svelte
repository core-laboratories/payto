<script lang="ts">
	import { getFieldGroupContext } from './fieldgroup.context';

	export let value: string | undefined = undefined;
	export let classValue: string = '';
	export let label: string = 'Color';

	const ctx = getFieldGroupContext();

	const baseClass = 'w-14 h-14 bs-12 p-3 text-start bg-gray-900 rounded-md border-0 caret-teal-500 focus:outline-none focus-visible:ring-4 focus-visible:ring-opacity-75 focus-visible:ring-green-800 focus-visible:ring-offset-green-700 focus-visible:ring-offset-2 text-sm';

	function handleInput(event: Event) {
		const input = event.target as HTMLInputElement;
		value = input.value;
		dispatchEvent(new CustomEvent('colorchange', { detail: value }));
	}
</script>

<div class="flex items-center gap-4">
	<div class="flex flex-col">
		<input
			class={`${baseClass} ${classValue}`}
			type="color"
			id={ctx.fieldId}
			aria-labelledby={ctx.labelId}
			aria-describedby={ctx.descriptionId}
			{value}
			on:input={handleInput}
			on:change={handleInput}
			{...$$restProps}
		/>
		<div class="text-xs mt-1 text-gray-500">{value}</div>
	</div>
	<label for={ctx.fieldId}>{label}</label>
</div>
