<script lang="ts">
	import {
		FieldGroup,
		FieldGroupAppendix,
		FieldGroupLabel,
		FieldGroupNumber,
		FieldGroupRadioWithNumber,
		FieldGroupText,
	} from '$lib/components';
	import { constructor } from '$lib/store/constructor.store';
	import { fly } from 'svelte/transition';
	import { ibanSchema } from '$lib/validators/iban.validator';
	import { bicSchema } from '$lib/validators/bic.validator';

	let ibanValue = $state<string | undefined>(undefined);
	let ibanError = $state(false);
	let ibanMsg = $state('');

	let bicValue = $state<string | undefined>(undefined);
	let bicError = $state(false);
	let bicMsg = $state('');

	$effect(() => {
		if (!$constructor.networks.iban.iban) {
			ibanValue = undefined;
			ibanError = false;
			ibanMsg = '';
		}
		if (!$constructor.networks.iban.bic) {
			bicValue = undefined;
			bicError = false;
			bicMsg = '';
		}
	});

	function handleRecurringChange() {
		if (!$constructor.networks.iban.isRc) {
			$constructor.networks.iban.params!.rc.value = undefined;
		}
	}

	function validateIban(value: string) {
		if (value === '') {
			ibanError = false;
			ibanMsg = '';
			$constructor.networks.iban.iban = undefined;
			return;
		}

		try {
			const result = ibanSchema.safeParse({ iban: value });

			if (!result.success) {
				ibanError = true;
				ibanMsg = result.error.errors[0]?.message || 'Invalid IBAN format';
				$constructor.networks.iban.iban = undefined;
			} else {
				ibanError = false;
				ibanMsg = '';
				$constructor.networks.iban.iban = value.toUpperCase();
			}
		} catch (error: any) {
			ibanError = true;
			ibanMsg = error.message || 'Invalid IBAN format';
			$constructor.networks.iban.iban = undefined;
		}
	}

	function handleIbanInput(event: Event) {
		const value = (event.target as HTMLInputElement).value;
		ibanValue = value;
		validateIban(value);
	}

	function validateBic(value: string) {
		if (value === '') {
			bicError = false;
			bicMsg = '';
			$constructor.networks.iban.bic = undefined;
			return;
		}

		try {
			const result = bicSchema.safeParse({ bic: value });

			if (!result.success) {
				bicError = true;
				bicMsg = result.error.errors[0]?.message || 'Invalid BIC format';
				$constructor.networks.iban.bic = undefined;
			} else {
				bicError = false;
				bicMsg = '';
				$constructor.networks.iban.bic = value.toUpperCase();
			}
		} catch (error: any) {
			bicError = true;
			bicMsg = error.message || 'Invalid BIC format';
			$constructor.networks.iban.bic = undefined;
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
		<FieldGroupLabel>IBAN *</FieldGroupLabel>
		<FieldGroupText
			placeholder="e.g. BE68539007547034"
			bind:value={ibanValue}
			oninput={handleIbanInput}
			classValue={`font-mono ${
				ibanError
					? 'border-2 border-rose-500 focus:border-rose-500 focus-visible:border-rose-500'
					: ibanValue
						? 'border-2 border-emerald-500 focus:border-emerald-500 focus-visible:border-emerald-500'
						: ''
			}`}
		/>
		{#if ibanError && ibanMsg}
			<span class="text-sm text-rose-500">{ibanMsg}</span>
		{/if}
	</FieldGroup>

	<FieldGroup>
		<FieldGroupLabel>BIC / SWIFT</FieldGroupLabel>
		<FieldGroupText
			placeholder="e.g. DABADKKK"
			bind:value={bicValue}
			oninput={handleBicInput}
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
		<FieldGroupLabel>Beneficiary Full Name</FieldGroupLabel>
		<FieldGroupText
			placeholder="e.g. John Doe"
			bind:value={$constructor.networks.iban.params.receiverName.value}
		/>
	</FieldGroup>

	<FieldGroup>
		<FieldGroupLabel>Message for Beneficiary</FieldGroupLabel>
		<FieldGroupText
			placeholder="e.g. ID001"
			bind:value={$constructor.networks.iban.params.message.value}
		/>
	</FieldGroup>

	<FieldGroup>
		<FieldGroupLabel>Amount</FieldGroupLabel>
		<FieldGroupNumber
			placeholder="e.g. 3.14"
			bind:value={$constructor.networks.iban.params.amount.value}
		/>
	</FieldGroup>

	<FieldGroup>
		<FieldGroupLabel>Fiat currency</FieldGroupLabel>
		<FieldGroupText
			placeholder="e.g. CHF; EUR; USD"
			classValue="uppercase"
			bind:value={$constructor.networks.iban.params.currency.value}
		/>
		<FieldGroupAppendix>Empty value uses the default network currency.</FieldGroupAppendix>
	</FieldGroup>

	<FieldGroup>
		<div class="flex items-center">
			<input
				type="checkbox"
				bind:checked={$constructor.networks.iban.isRc}
				id="recurringCheckbox"
				onchange={handleRecurringChange}
			/>
			<label for="recurringCheckbox" class="ml-2">Recurring payments</label>
		</div>
	</FieldGroup>

	{#if $constructor.networks.iban.isRc}
		<FieldGroupRadioWithNumber
			options={[
				{ name: 'Yearly', value: 'y' },
				{ name: 'Monthly', value: 'm' },
				{ name: 'Weekly', value: 'w' },
				{ name: 'Daily', value: 'd', hasNumberInput: true }
			]}
			defaultChecked={$constructor.networks.iban.params.rc.value}
			bind:outputValue={$constructor.networks.iban.params.rc.value}
		/>
	{/if}
</div>
