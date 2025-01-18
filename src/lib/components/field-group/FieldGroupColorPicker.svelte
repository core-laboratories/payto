<script lang="ts">
	import { derived, writable } from 'svelte/store';
	import { getFieldGroupContext } from './fieldgroup.context';

	export let value: string | undefined;
	export let classValue: string = '';
	export let label: string = 'Color';

	const ctx = getFieldGroupContext();

	const baseClass = 'bs-12 plb-2 pli-3 text-start bg-gray-900 rounded-md border-none caret-teal-500 focus:outline-none focus-visible:ring-4 focus-visible:ring-opacity-75 focus-visible:ring-green-800 focus-visible:ring-offset-green-700 focus-visible:ring-offset-2 sm:text-sm';
	const computedClass = derived(writable(classValue), $classValue => `${baseClass} ${$classValue}`);
</script>

<input
	class={$computedClass}
	type="color"
	id={ctx.fieldId}
	aria-labelledby={ctx.labelId}
	aria-describedby={ctx.descriptionId}
	bind:value
	{...$$restProps}
/>
<label for={ctx.fieldId} class="ml-2">{label}</label>
