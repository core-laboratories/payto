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
	let corBicError = $state(false);
	let corBicMsg = $state('');
	let corBicValue = $state<string | undefined>(undefined);

	$effect(() => {
		if ($constructor.isCleared) {
			bicValue = undefined;
			bicError = false;
			bicMsg = '';
			corBicValue = undefined;
			corBicError = false;
			corBicMsg = '';
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

	function validateCorBic(value: string) {
		if (value === '') {
			corBicError = false;
			corBicMsg = '';
			$constructor.networks.bic.params.corrBankBic.value = value;
			return;
		}

		try {
			const result = bicSchema.safeParse({ bic: value });

			if (!result.success) {
				corBicError = true;
				corBicMsg = result.error.issues[0]?.message || 'Invalid BIC format';
				$constructor.networks.bic.params.corrBankBic.value = undefined;
			} else {
				corBicError = false;
				corBicMsg = '';
				$constructor.networks.bic.params.corrBankBic.value = value.toUpperCase();
			}
		} catch (error: any) {
			corBicError = true;
			corBicMsg = error.message || 'Invalid BIC format';
			$constructor.networks.bic.params.corrBankBic.value = value;
		}
	}

	function handleCorBicInput(event: Event) {
		const value = (event.target as HTMLInputElement).value;
		corBicValue = value;
		validateCorBic(value);
	}
</script>

<div class="flex flex-col gap-6" in:fly={{ y: 64 }}>
	<div class="space-y-4 rounded-2xl border border-slate-700/80 bg-slate-900/20 p-4">
		<div>
			<h3 class="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">Bank</h3>
			<p class="mt-1 text-xs text-slate-400">Receiving bank details. Only BIC / ORIC / SWIFT is required.</p>
		</div>

		<FieldGroup>
			<FieldGroupLabel>BIC / <span class="relative overflow-hidden cursor-help group hover:overflow-visible focus-visible:outline-none border-b border-dotted border-gray-400" aria-describedby="tooltip-oric">
				ORIC
				<span role="tooltip" id="tooltip-oric" class="invisible absolute bottom-full left-1/2 z-10 mb-2 w-48 -translate-x-1/2 rounded bg-slate-700 p-2 text-xs text-white opacity-0 transition-all before:invisible before:absolute before:left-1/2 before:top-full before:z-10 before:mb-2 before:-ml-1 before:border-x-4 before:border-t-4 before:border-x-transparent before:border-t-slate-700 before:opacity-0 before:transition-all before:content-[''] group-hover:visible group-hover:block group-hover:opacity-100 group-hover:before:visible group-hover:before:opacity-100">Organization Registry Identifier Code</span>
			</span> / SWIFT *</FieldGroupLabel>
			<FieldGroupText
				placeholder="e.g. PINGCHB2"
				stripWhitespace
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
			<FieldGroupLabel>Bank name</FieldGroupLabel>
			<FieldGroupText
				placeholder="e.g. Swiss National Bank"
				bind:value={$constructor.networks.bic.params.bankName.value}
			/>
		</FieldGroup>

		<FieldGroup>
			<FieldGroupLabel>Bank address</FieldGroupLabel>
			<FieldGroupText
				placeholder="e.g. Bahnhofstrasse 1, Zurich"
				bind:value={$constructor.networks.bic.params.bankAddress.value}
			/>
		</FieldGroup>
	</div>

	<FieldGroup>
		<FieldGroupLabel>Beneficiary Full Name</FieldGroupLabel>
		<FieldGroupText
			placeholder="e.g. John Doe"
			bind:value={$constructor.networks.bic.params.receiverName.value}
		/>
	</FieldGroup>

	<FieldGroup>
		<FieldGroupLabel>Reference</FieldGroupLabel>
		<FieldGroupText
			placeholder="e.g. Shared-001"
			bind:value={$constructor.networks.bic.params.reference.value}
		/>
	</FieldGroup>

	<FieldGroup>
		<FieldGroupLabel>Amount</FieldGroupLabel>
		<FieldGroupNumber
			placeholder="e.g. 3.14"
			stripWhitespace
			bind:value={$constructor.networks.bic.params.amount.value}
		/>
	</FieldGroup>

	<FieldGroup>
		<FieldGroupLabel>Fiat currency</FieldGroupLabel>
		<FieldGroupText
			placeholder="e.g. CHF; EUR; USD"
			stripWhitespace
			classValue="uppercase placeholder:normal-case"
			bind:value={$constructor.networks.bic.params.currency.value}
		/>
		<FieldGroupAppendix>Empty value uses the default network currency.</FieldGroupAppendix>
	</FieldGroup>

	<div class="space-y-4 rounded-2xl border border-slate-700/80 bg-slate-900/20 p-4">
		<div>
			<h3 class="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">Correspondent Bank</h3>
			<p class="mt-1 text-xs text-slate-400">Optional intermediary bank details for routed transfers.</p>
		</div>

		<FieldGroup>
			<FieldGroupLabel>Correspondent bank BIC / ORIC / SWIFT</FieldGroupLabel>
			<FieldGroupText
				placeholder="e.g. CHASUS33"
				stripWhitespace
				bind:value={corBicValue}
				on:input={handleCorBicInput}
				on:change={handleCorBicInput}
				classValue={`tracking-widest placeholder:tracking-normal uppercase [&:not(:placeholder-shown)]:font-code ${
					corBicError
						? 'border-2 border-rose-500 focus:border-rose-500 focus-visible:border-rose-500'
						: corBicValue
							? 'border-2 border-emerald-500 focus:border-emerald-500 focus-visible:border-emerald-500'
							: ''
				}`}
			/>
			{#if corBicError && corBicMsg}
				<span class="text-sm text-rose-500">{corBicMsg}</span>
			{/if}
		</FieldGroup>

		<FieldGroup>
			<FieldGroupLabel>Correspondent bank name</FieldGroupLabel>
			<FieldGroupText
				placeholder="e.g. JPMorgan Chase Bank"
				bind:value={$constructor.networks.bic.params.corrBankName.value}
			/>
		</FieldGroup>

		<FieldGroup>
			<FieldGroupLabel>Correspondent bank address</FieldGroupLabel>
			<FieldGroupText
				placeholder="e.g. 383 Madison Ave, New York"
				bind:value={$constructor.networks.bic.params.corrBankAddress.value}
			/>
		</FieldGroup>
	</div>

</div>
