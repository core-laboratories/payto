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

	function handleRecurringChange() {
		if (!$constructor.networks.iban.isRc) {
			$constructor.networks.iban.params!.rc.value = undefined;
		}
	}
</script>

<div class="flex flex-col gap-6" in:fly={{ y: 64 }}>
	<FieldGroup>
		<FieldGroupLabel>IBAN *</FieldGroupLabel>
		<FieldGroupText
			placeholder="e.g. IE12BOFI90000112345678"
			bind:value={$constructor.networks.iban.iban}
		/>
	</FieldGroup>

	<FieldGroup>
		<FieldGroupLabel>BIC / SWIFT</FieldGroupLabel>
		<FieldGroupText
			placeholder="e.g. DABADKKK"
			bind:value={$constructor.networks.iban.bic}
		/>
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
				on:change={handleRecurringChange}
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
