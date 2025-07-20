<script lang="ts">
	import {
		FieldGroup,
		FieldGroupAppendix,
		FieldGroupLabel,
		FieldGroupNumber,
		FieldGroupText,
		FieldGroupRadioWithNumber,
	} from '$lib/components';

	import { constructor } from '$lib/store/constructor.store';
	import { fly } from 'svelte/transition';
	import { upiSchema } from '$lib/validators/upi.validator';

	let aliasError = $state(false);
	let aliasMsg = $state('');
	let aliasValue = $state<string | undefined>(undefined);

	$effect(() => {
		if (!$constructor.networks.upi.accountAlias) {
			aliasValue = undefined;
		}
	});

	function handleRecurringChange() {
		if (!$constructor.networks.upi.isRc) {
			$constructor.networks.upi.params.rc.value = undefined;
		}
	}

	function validateUpi(value: string) {
		if (!value) {
			aliasError = false;
			aliasMsg = '';
			$constructor.networks.upi.accountAlias = undefined;
			return;
		}

		try {
			const result = upiSchema.safeParse({ accountAlias: value });

			if (!result.success) {
				aliasError = true;
				aliasMsg = result.error.issues[0]?.message || 'Invalid email format';
			} else {
				aliasError = false;
				aliasMsg = '';
				$constructor.networks.upi.accountAlias = value.toLowerCase();
			}
		} catch (error: any) {
			aliasError = true;
			aliasMsg = error.message || 'Invalid email format';
		}
	}

	function handleAliasInput(event: Event) {
		const value = (event.target as HTMLInputElement).value;
		aliasValue = value;
		validateUpi(value);
	}
</script>

<div class="flex flex-col gap-6" in:fly={{ y: 64 }}>
	<FieldGroup>
		<FieldGroupLabel>Account Alias *</FieldGroupLabel>
		<FieldGroupText
			placeholder="e.g. username@onion.email"
			bind:value={aliasValue}
			oninput={handleAliasInput}
			onchange={handleAliasInput}
			classValue={`${
				aliasError
					? 'border-2 border-rose-500 focus:border-rose-500 focus-visible:border-rose-500'
					: aliasValue
						? 'border-2 border-emerald-500 focus:border-emerald-500 focus-visible:border-emerald-500'
						: ''
			}`}
		/>
		{#if aliasError && aliasMsg}
			<span class="text-sm text-rose-500">{aliasMsg}</span>
		{/if}
	</FieldGroup>

	<FieldGroup>
		<FieldGroupLabel>Beneficiary Full Name</FieldGroupLabel>
		<FieldGroupText
			placeholder="e.g. John Doe"
			bind:value={$constructor.networks.upi.params.receiverName.value}
		/>
	</FieldGroup>

	<FieldGroup>
		<FieldGroupLabel>Message</FieldGroupLabel>
		<FieldGroupText
			placeholder="e.g. ID001"
			bind:value={$constructor.networks.upi.params.message.value}
		/>
	</FieldGroup>

	<FieldGroup>
		<FieldGroupLabel>Amount</FieldGroupLabel>
		<FieldGroupNumber
			placeholder="e.g. 3.14"
			bind:value={$constructor.networks.upi.params.amount.value}
		/>
	</FieldGroup>

	<FieldGroup>
		<FieldGroupLabel>Fiat currency</FieldGroupLabel>
		<FieldGroupText
			placeholder="e.g. CHF; EUR; USD"
			classValue="uppercase placeholder:normal-case"
			bind:value={$constructor.networks.upi.params.currency.value}
		/>
		<FieldGroupAppendix>Empty value uses the default network currency.</FieldGroupAppendix>
	</FieldGroup>

	<FieldGroup>
		<div class="flex items-center">
			<input
				type="checkbox"
				bind:checked={$constructor.networks.upi.isRc}
				id="recurringCheckbox"
				onchange={handleRecurringChange}
			/>
			<label for="recurringCheckbox" class="ml-2">Recurring payments</label>
		</div>
	</FieldGroup>

	{#if $constructor.networks.upi.isRc}
		<FieldGroupRadioWithNumber
			options={[
				{ name: 'Yearly', value: 'y' },
				{ name: 'Monthly', value: 'm' },
				{ name: 'Weekly', value: 'w' },
				{ name: 'Daily', value: 'd', hasNumberInput: true }
			]}
			defaultChecked={$constructor.networks.upi.params.rc.value}
			bind:outputValue={$constructor.networks.upi.params.rc.value}
		/>
	{/if}
</div>
