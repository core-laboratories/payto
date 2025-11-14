<script lang="ts">
	import {
		FieldGroup,
		FieldGroupLabel,
		FieldGroupText,
		FieldGroupNumber,
		FieldGroupRadioWithNumber,
	} from '$lib/components';

	import { constructor } from '$lib/store/constructor.store';
	import { fly } from 'svelte/transition';
	import { bicSchema } from '$lib/validators/bic.validator';
	import { addressSchema } from '$lib/validators/address.validator';

	let idError = $state(false);
	let idMsg = $state('');
	let idValue = $state<string | undefined>(undefined);
	let bicError = $state(false);
	let bicMsg = $state('');
	let bicValue = $state<string | undefined>(undefined);

	$effect(() => {
		if (!$constructor.networks.intra.bic) {
			idValue = undefined;
		}
	});

	function handleDescChange() {
		if (!$constructor.networks.intra.isDesc) {
			$constructor.networks.intra.params.message.value = undefined;
		}
	}

	function handleRecurringChange() {
		if (!$constructor.networks.intra.isRc) {
			$constructor.networks.intra.params.rc.value = undefined;
		}
	}

	function validateId(value: string) {
		if (!value) {
			idError = false;
			idMsg = '';
			$constructor.networks.intra.id = undefined;
			return;
		}

		if (/^c[be]\d{2}[0-9a-f]{40}$/i.test(value)) {
			try {
				const result = addressSchema.safeParse({
					network: value.toLowerCase().startsWith('ce') ? 'xce' : 'xcb',
					destination: value
				});

				if (!result.success) {
					idError = true;
					idMsg = result.error.issues[0]?.message || 'Invalid ID format';
					$constructor.networks.intra.id = undefined;
				} else {
					idError = false;
					idMsg = '';
					$constructor.networks.intra.id = value.toLowerCase();
				}
			} catch (error: any) {
				idError = true;
				idMsg = error.message || 'Invalid ID format';
				$constructor.networks.intra.id = undefined;
			}
		} else {
			idError = false;
			idMsg = '';
		}

		$constructor.networks.intra.id = value.toLowerCase();
	}

	function handleIdInput(event: Event) {
		const value = (event.target as HTMLInputElement).value;
		idValue = value;
		validateId(value);
	}

	function validateBic(value: string) {
		if (value === '') {
			bicError = false;
			bicMsg = '';
			$constructor.networks.intra.bic = value;
			return;
		}

		try {
			const result = bicSchema.safeParse({ bic: value });

			if (!result.success) {
				bicError = true;
				bicMsg = result.error.issues[0]?.message || 'Invalid BIC format';
				$constructor.networks.intra.bic = undefined;
				$constructor.networks.intra.id = undefined;
			} else {
				bicError = false;
				bicMsg = '';
				$constructor.networks.intra.bic = value.toUpperCase();
			}
		} catch (error: any) {
			bicError = true;
			bicMsg = error.message || 'Invalid BIC format';
			$constructor.networks.intra.bic = value;
			$constructor.networks.intra.id = undefined;
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
		<FieldGroupLabel>BIC / <span class="relative overflow-hidden cursor-help group hover:overflow-visible focus-visible:outline-none border-b border-dotted border-gray-400" aria-describedby="tooltip-oric">
			ORIC
			<span role="tooltip" id="tooltip-oric" class="invisible absolute bottom-full left-1/2 z-10 mb-2 w-48 -translate-x-1/2 rounded bg-slate-700 p-2 text-xs text-white opacity-0 transition-all before:invisible before:absolute before:left-1/2 before:top-full before:z-10 before:mb-2 before:-ml-1 before:border-x-4 before:border-t-4 before:border-x-transparent before:border-t-slate-700 before:opacity-0 before:transition-all before:content-[''] group-hover:visible group-hover:block group-hover:opacity-100 group-hover:before:visible group-hover:before:opacity-100">Organization Registry Identifier Code</span>
		</span> *</FieldGroupLabel>
		<FieldGroupText
			placeholder="e.g. PINGCHB2"
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
		<FieldGroupLabel>Account ID / Core ID *</FieldGroupLabel>
		<FieldGroupText
			placeholder="e.g. cb00…"
			bind:value={idValue}
			oninput={handleIdInput}
			onchange={handleIdInput}
			classValue={`${
				idError
					? 'border-2 border-rose-500 focus:border-rose-500 focus-visible:border-rose-500'
					: idValue
						? 'border-2 border-emerald-500 focus:border-emerald-500 focus-visible:border-emerald-500'
						: ''
			}`}
		/>
		{#if idError && idMsg}
			<span class="text-sm text-rose-500">{idMsg}</span>
		{/if}
	</FieldGroup>

	<FieldGroup>
		<FieldGroupLabel>Beneficiary Full Name</FieldGroupLabel>
		<FieldGroupText
			placeholder="e.g. John Doe"
			bind:value={$constructor.networks.intra.params.receiverName.value}
		/>
	</FieldGroup>

	<FieldGroup>
		<FieldGroupLabel>Amount</FieldGroupLabel>
		<FieldGroupNumber
			placeholder="e.g. 3.14"
			bind:value={$constructor.networks.intra.params.amount.value}
		/>
	</FieldGroup>

	<FieldGroup>
		<FieldGroupLabel>Fiat currency</FieldGroupLabel>
		<FieldGroupText
			placeholder="e.g. CHF; EUR; USD; …"
			classValue="uppercase placeholder:normal-case"
			bind:value={$constructor.networks.intra.params.currency.value}
		/>
	</FieldGroup>

	<div class="flex items-center">
		<input
			type="checkbox"
			bind:checked={$constructor.networks.intra.isDesc}
			id="descCheckbox"
			onchange={handleDescChange}
		/>
		<label for="descCheckbox" class="ml-2">Message</label>
	</div>
	{#if $constructor.networks.intra.isDesc}
		<FieldGroup>
			<FieldGroupLabel>Message</FieldGroupLabel>
			<FieldGroupText
				placeholder="e.g. Payment for services"
				bind:value={$constructor.networks.intra.params.message.value}
			/>
		</FieldGroup>
	{/if}

	<FieldGroup>
		<div class="flex items-center">
			<input
				type="checkbox"
				bind:checked={$constructor.networks.intra.isRc}
				id="recurringCheckbox"
				onchange={handleRecurringChange}
			/>
			<label for="recurringCheckbox" class="ml-2">Recurring payments</label>
		</div>
	</FieldGroup>

	{#if $constructor.networks.intra.isRc}
		<FieldGroupRadioWithNumber
			options={[
				{ name: 'Yearly', value: 'y' },
				{ name: 'Monthly', value: 'm' },
				{ name: 'Weekly', value: 'w' },
				{ name: 'Daily', value: 'd', hasNumberInput: true }
			]}
			defaultChecked={$constructor.networks.intra.params.rc.value}
			bind:outputValue={$constructor.networks.intra.params.rc.value}
		/>
	{/if}
</div>
