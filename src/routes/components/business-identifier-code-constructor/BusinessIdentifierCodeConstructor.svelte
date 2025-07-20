<script lang="ts">
	import {
		FieldGroup,
		FieldGroupLabel,
		FieldGroupText,
		FieldGroupNumber,
		FieldGroupAppendix,
	} from '$lib/components';
	import { constructor } from '$lib/store/constructor.store';
	import { fly } from 'svelte/transition';
	import { bicSchema } from '$lib/validators/bic.validator';

	let bicError = $state(false);
	let bicMsg = $state('');
	let bicValue = $state<string | undefined>(undefined);

	$effect(() => {
		if ($constructor.isCleared) {
			bicValue = undefined;
			bicError = false;
			bicMsg = '';
		}
	});

	function validateBic(value: string) {
		if (value === '') {
			bicError = false;
			bicMsg = '';
			$constructor.networks.bic.bic = value;
			return;
		}

		try {
			const result = bicSchema.safeParse({ bic: value });

			if (!result.success) {
				bicError = true;
				bicMsg = result.error.issues[0]?.message || 'Invalid BIC format';
				$constructor.networks.bic.bic = undefined;
			} else {
				bicError = false;
				bicMsg = '';
				$constructor.networks.bic.bic = value.toUpperCase();
			}
		} catch (error: any) {
			bicError = true;
			bicMsg = error.message || 'Invalid BIC format';
			$constructor.networks.bic.bic = value;
		}
	}

	function handleBicInput(event: Event) {
		const value = (event.target as HTMLInputElement).value;
		bicValue = value;
		validateBic(value);
	}
</script>

<div class="flex flex-col gap-6" in:fly={{ y: 64 }}>

	<FieldGroup>
		<FieldGroupLabel>BIC / SWIFT / <span class="relative overflow-hidden cursor-help group hover:overflow-visible focus-visible:outline-none border-b border-dotted border-gray-400" aria-describedby="tooltip-oric">
			ORIC
			<span role="tooltip" id="tooltip-oric" class="invisible absolute bottom-full left-1/2 z-10 mb-2 w-48 -translate-x-1/2 rounded bg-slate-700 p-2 text-xs text-white opacity-0 transition-all before:invisible before:absolute before:left-1/2 before:top-full before:z-10 before:mb-2 before:-ml-1 before:border-x-4 before:border-t-4 before:border-x-transparent before:border-t-slate-700 before:opacity-0 before:transition-all before:content-[''] group-hover:visible group-hover:block group-hover:opacity-100 group-hover:before:visible group-hover:before:opacity-100">Organization Registry Identifier Code</span>
		</span> *</FieldGroupLabel>
		<FieldGroupText
			placeholder="e.g. DABADKKK"
			bind:value={bicValue}
			on:input={handleBicInput}
			on:change={handleBicInput}
			classValue={`tracking-widest placeholder:tracking-normal uppercase [&:not(:placeholder-shown)]:font-code ${
				bicError
					? 'border-2 border-rose-500 focus:border-rose-500 focus-visible:border-rose-500'
					: bicValue
						? 'border-2 border-emerald-500 focus:border-emerald-500 focus-visible:border-emerald-500'
						: ''
			}`}
		/>
		{#if bicError && bicMsg}
			<span class="text-sm text-rose-500">{bicMsg}</span>
		{/if}
	</FieldGroup>

	<FieldGroup>
		<FieldGroupLabel>Amount *</FieldGroupLabel>
		<FieldGroupNumber
			placeholder="e.g. 3.14"
			bind:value={$constructor.networks.bic.params.amount.value}
		/>
	</FieldGroup>

	<FieldGroup>
		<FieldGroupLabel>Fiat currency *</FieldGroupLabel>
		<FieldGroupText
			placeholder="e.g. CHF; EUR; USD"
			classValue="uppercase placeholder:normal-case"
			bind:value={$constructor.networks.bic.params.currency.value}
		/>
		<FieldGroupAppendix>Empty value uses the default network currency.</FieldGroupAppendix>
	</FieldGroup>

</div>
