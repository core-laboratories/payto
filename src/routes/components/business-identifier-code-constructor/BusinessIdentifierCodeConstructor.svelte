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
		if (!$constructor.networks.bic.bic) {
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
				bicMsg = result.error.errors[0]?.message || 'Invalid BIC format';
				$constructor.networks.bic.bic = value;
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
		<FieldGroupLabel>BIC / SWIFT / <abbr title="Organization Registry Identifier Code">ORIC</abbr> *</FieldGroupLabel>
		<FieldGroupText
			placeholder="e.g. DABADKKK"
			bind:value={bicValue}
			on:input={handleBicInput}
			on:change={handleBicInput}
			classValue={`font-mono uppercase ${
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
			classValue="uppercase"
			bind:value={$constructor.networks.bic.params.currency.value}
		/>
		<FieldGroupAppendix>Empty value uses the default network currency.</FieldGroupAppendix>
	</FieldGroup>

</div>
