<script lang="ts">
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

	// Define props using `$props` and mark `outputValue` as bindable
	let {
		options = [],
		defaultChecked = null,
		numberValue = 1,
		numberMin = 1,
		numberMax = 365,
		disabled = false,
		outputValue = $bindable(), // Mark as bindable
		classValue = ''
	} = $props();

	// Define reactive state using `$state`
	let internalCheckedValue = $state(defaultChecked || options[0]?.value || '');
	let numberValueStore = $state(numberValue);

	// Derived state using `$derived`
	const computedOutput = $derived(
		internalCheckedValue === 'd' && numberValueStore > 1
			? `${numberValueStore}d`
			: internalCheckedValue
	);

	// Update `outputValue` whenever `computedOutput` changes
	$effect(() => {
		outputValue = computedOutput;
	});

	const baseClass = 'py-2 px-3 text-start bg-gray-900 rounded-md border-0 caret-teal-500 focus:outline-none focus-visible:ring-4 focus-visible:ring-opacity-75 focus-visible:ring-green-800 focus-visible:ring-offset-green-700 focus-visible:ring-offset-2 is-1/4 text-sm me-2';

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
					bind:group={internalCheckedValue}
					disabled={option.disabled || disabled} />
				<span class="ml-1">{option.name}</span>
			</label>
		{/each}
	</div>
	{#each options as option}
		<div class="flex items-center">
			{#if option.hasNumberInput && internalCheckedValue === option.value}
				<label for="input-{option.name}" class="mr-2">{option.name}:</label>
				<input
					id="input-{option.name}"
					class={`${baseClass} ${classValue}`}
					type="number"
					bind:value={numberValueStore}
					min={numberMin}
					max={numberMax}
					placeholder={option.name}
					disabled={internalCheckedValue !== option.value || disabled} />
			{/if}
		</div>
	{/each}
</div>
