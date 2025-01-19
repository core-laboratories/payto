<script lang="ts">
	import { writable, derived } from 'svelte/store';
	import { getFieldGroupContext } from './fieldgroup.context';

	interface Option {
		name: string;
		value: string;
		hasNumberInput?: boolean;
		disabled?: boolean;
	}

	interface Props {
		options?: Option[];
		defaultChecked?: string | null;
		numberValue?: number;
		numberMin?: number;
		numberMax?: number;
		disabled?: boolean;
		outputValue?: string | null;
	}

	export let options: Option[] = [];
	export let defaultChecked: string | null = null;
	export let numberValue: number = 1;
	export let numberMin: number = 1;
	export let numberMax: number = 365;
	export let disabled: boolean = false;
	export let outputValue: string | null = '';
	export let classValue: string = '';

	const internalCheckedValue = writable(defaultChecked || options[0]?.value || '');
	const checkedValue = derived(internalCheckedValue, $val => $val);

	const computedOutput = derived(
		[checkedValue, writable(numberValue)],
		([$checked, $number]) => $checked === 'd' && $number > 1 ? `${$number}d` : $checked
	);

	// Subscribe to update the outputValue
	computedOutput.subscribe(value => outputValue = value);

	const baseClass = 'plb-2 pli-3 text-start bg-gray-900 rounded-md border-0 caret-teal-500 focus:outline-none focus-visible:ring-4 focus-visible:ring-opacity-75 focus-visible:ring-green-800 focus-visible:ring-offset-green-700 focus-visible:ring-offset-2 w-1/4 sm:text-sm mr-2'

	const ctx = getFieldGroupContext();
</script>

<div>
	<div class="flex flex-wrap mb-2">
		{#each options as option}
			<label class="flex-grow flex items-center">
				<input
					type="radio"
					name="recurrencePattern"
					value={option.value}
					bind:group={$checkedValue}
					on:change={() => internalCheckedValue.set(option.value)}
					disabled={option.disabled || disabled} />
				<span class="ml-1">{option.name}</span>
			</label>
		{/each}
	</div>
	{#each options as option}
		<div class="flex items-center">
			{#if option.hasNumberInput && $checkedValue === option.value}
				<label for="input-{option.name}" class="mr-2">{option.name}:</label>
				<input
					id="input-{option.name}"
					class={`${baseClass} ${classValue}`}
					type="number"
					bind:value={numberValue}
					min={numberMin}
					max={numberMax}
					placeholder={option.name}
					disabled={$checkedValue !== option.value || disabled} />
			{/if}
		</div>
	{/each}
</div>
