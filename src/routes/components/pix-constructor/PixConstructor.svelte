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
	import { pixSchema } from '$lib/validators/pix.validator';

	let aliasError = $state(false);
	let aliasMsg = $state('');
	let aliasValue = $state<string | undefined>(undefined);

	$effect(() => {
		if (!$constructor.networks.pix.accountAlias) {
			aliasValue = undefined;
		}
	});

	function handleIdChange() {
		if (!$constructor.networks.pix.isId) {
			$constructor.networks.pix.params.id.value = undefined;
		}
	}

	function handleDescChange() {
		if (!$constructor.networks.pix.isDesc) {
			$constructor.networks.pix.params.message.value = undefined;
		}
	}

	function handleRecurringChange() {
		if (!$constructor.networks.pix.isRc) {
			$constructor.networks.pix.params.rc.value = undefined;
		}
	}

	function validatePix(value: string) {
		if (!value) {
			aliasError = false;
			aliasMsg = '';
			$constructor.networks.pix.accountAlias = undefined;
			return;
		}

		try {
			const result = pixSchema.safeParse({ accountAlias: value });

			if (!result.success) {
				aliasError = true;
				aliasMsg = result.error.errors[0]?.message || 'Invalid email format';
			} else {
				aliasError = false;
				aliasMsg = '';
				$constructor.networks.pix.accountAlias = value.toLowerCase();
			}
		} catch (error: any) {
			aliasError = true;
			aliasMsg = error.message || 'Invalid email format';
		}
	}

	function handleAliasInput(event: Event) {
		const value = (event.target as HTMLInputElement).value;
		aliasValue = value;
		validatePix(value);
	}
</script>

<div class="flex flex-col gap-6" in:fly={{ y: 64 }}>
	<FieldGroup>
		<FieldGroupLabel>Account Alias *</FieldGroupLabel>
		<FieldGroupText
			placeholder="e.g. john.doe@gmail.com"
			bind:value={aliasValue}
			oninput={handleAliasInput}
			onchange={handleAliasInput}
			classValue={`font-mono ${
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
		<FieldGroupLabel>Beneficiary Full Name *</FieldGroupLabel>
		<FieldGroupText
			placeholder="e.g. John Doe"
			bind:value={$constructor.networks.pix.params.receiverName.value}
		/>
	</FieldGroup>

	<FieldGroup>
		<FieldGroupLabel>Amount *</FieldGroupLabel>
		<FieldGroupNumber
			placeholder="e.g. 3.14"
			bind:value={$constructor.networks.pix.params.amount.value}
		/>
	</FieldGroup>

	<FieldGroup>
		<FieldGroupLabel>Fiat currency (BRL default)</FieldGroupLabel>
		<FieldGroupText
			placeholder="e.g. CHF; EUR; USD; …"
			classValue="uppercase"
			bind:value={$constructor.networks.pix.params.currency.value}
		/>
	</FieldGroup>

	<div class="flex items-center">
		<input
			type="checkbox"
			bind:checked={$constructor.networks.pix.isId}
			id="idCheckbox"
			onchange={handleIdChange}
		/>
		<label for="idCheckbox" class="ml-2">Transaction ID</label>
	</div>
	{#if $constructor.networks.pix.isId}
		<FieldGroup>
			<FieldGroupLabel>Transaction ID</FieldGroupLabel>
			<FieldGroupText
				placeholder="e.g. ID001"
				bind:value={$constructor.networks.pix.params.id.value}
			/>
		</FieldGroup>
	{/if}

	<div class="flex items-center">
		<input
			type="checkbox"
			bind:checked={$constructor.networks.pix.isDesc}
			id="descCheckbox"
			onchange={handleDescChange}
		/>
		<label for="descCheckbox" class="ml-2">Description</label>
	</div>
	{#if $constructor.networks.pix.isDesc}
		<FieldGroup>
			<FieldGroupLabel>Description</FieldGroupLabel>
			<FieldGroupText
				placeholder="e.g. Payment for services"
				bind:value={$constructor.networks.pix.params.message.value}
			/>
		</FieldGroup>
	{/if}

	<FieldGroup>
		<div class="flex items-center">
			<input
				type="checkbox"
				bind:checked={$constructor.networks.pix.isRc}
				id="recurringCheckbox"
				onchange={handleRecurringChange}
			/>
			<label for="recurringCheckbox" class="ml-2">Recurring payments</label>
		</div>
	</FieldGroup>

	{#if $constructor.networks.pix.isRc}
		<FieldGroupRadioWithNumber
			options={[
				{ name: 'Yearly', value: 'y' },
				{ name: 'Monthly', value: 'm' },
				{ name: 'Weekly', value: 'w' },
				{ name: 'Daily', value: 'd', hasNumberInput: true }
			]}
			defaultChecked={$constructor.networks.pix.params.rc.value}
			bind:outputValue={$constructor.networks.pix.params.rc.value}
		/>
	{/if}
</div>
