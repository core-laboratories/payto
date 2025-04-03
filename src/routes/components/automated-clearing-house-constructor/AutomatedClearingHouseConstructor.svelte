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
	import { achAccountSchema, achRoutingSchema } from '$lib/validators/ach.validator';

	let accountError = $state(false);
	let accountMsg = $state('');
	let accountValue = $state<string | undefined>(undefined);

	let routingError = $state(false);
	let routingMsg = $state('');
	let routingValue = $state<string | undefined>(undefined);

	$effect(() => {
		if ($constructor.isCleared) {
			accountValue = undefined;
			routingValue = undefined;
			accountError = false;
			routingError = false;
			accountMsg = '';
			routingMsg = '';
		}
	});

	function handleRecurringChange() {
		if (!$constructor.networks.ach.isRc) {
			$constructor.networks.ach.params.rc.value = undefined;
		}
	}

	function validateAch(type: 'account' | 'routing', value: string) {
		if (!value) {
			if (type === 'account') {
				accountError = false;
				accountMsg = '';
				$constructor.networks.ach.accountNumber = undefined;
			} else if (type === 'routing') {
				routingError = false;
				routingMsg = '';
				$constructor.networks.ach.routingNumber = undefined;
			}
			return;
		}

		try {
			if (type === 'account') {
				const result = achAccountSchema.safeParse({ accountNumber: value });
				if (!result.success) {
					accountError = true;
					accountMsg = result.error.errors[0]?.message || 'Invalid account number format';
					$constructor.networks.ach.accountNumber = undefined;
				} else {
					accountError = false;
					accountMsg = '';
					$constructor.networks.ach.accountNumber = value;
				}
			} else if (type === 'routing') {
				const result = achRoutingSchema.safeParse({ routingNumber: value });
				if (!result.success) {
					routingError = true;
					routingMsg = result.error.errors[0]?.message || 'Invalid routing number format';
					$constructor.networks.ach.routingNumber = undefined;
				} else {
					routingError = false;
					routingMsg = '';
					$constructor.networks.ach.routingNumber = value;
				}
			}
		} catch (error: any) {
			if (type === 'account') {
				accountError = true;
				accountMsg = error.message || 'Invalid account number format';
			} else if (type === 'routing') {
				routingError = true;
				routingMsg = error.message || 'Invalid routing number format';
			}
		}
	}

	function handleAccountInput(event: Event) {
		const value = (event.target as HTMLInputElement).value;
		accountValue = value;
		validateAch('account', value);
	}

	function handleRoutingInput(event: Event) {
		const value = (event.target as HTMLInputElement).value;
		routingValue = value;
		validateAch('routing', value);
	}
</script>

<div class="flex flex-col gap-6" in:fly={{ y: 64 }}>
	<FieldGroup>
		<FieldGroupLabel>Account Number *</FieldGroupLabel>
		<FieldGroupText
			placeholder="e.g. 000123456789"
			bind:value={accountValue}
			oninput={handleAccountInput}
			onchange={handleAccountInput}
			classValue={`tracking-widest placeholder:tracking-normal [&:not(:placeholder-shown)]:font-code ${
				accountError
					? 'border-2 border-rose-500 focus:border-rose-500 focus-visible:border-rose-500'
					: accountValue
						? 'border-2 border-emerald-500 focus:border-emerald-500 focus-visible:border-emerald-500'
						: ''
			}`}
		/>
		{#if accountError && accountMsg}
			<span class="text-sm text-rose-500">{accountMsg}</span>
		{/if}
	</FieldGroup>

	<FieldGroup>
		<FieldGroupLabel>Routing Number *</FieldGroupLabel>
		<FieldGroupText
			placeholder="e.g. 110000000"
			bind:value={routingValue}
			oninput={handleRoutingInput}
			onchange={handleRoutingInput}
			classValue={`tracking-widest placeholder:tracking-normal [&:not(:placeholder-shown)]:font-code ${
				routingError
					? 'border-2 border-rose-500 focus:border-rose-500 focus-visible:border-rose-500'
					: routingValue
						? 'border-2 border-emerald-500 focus:border-emerald-500 focus-visible:border-emerald-500'
						: ''
			}`}
		/>
		{#if routingError && routingMsg}
			<span class="text-sm text-rose-500">{routingMsg}</span>
		{/if}
	</FieldGroup>

	<FieldGroup>
		<FieldGroupLabel>Beneficiary Full Name</FieldGroupLabel>
		<FieldGroupText
			placeholder="e.g. John Doe"
			bind:value={$constructor.networks.ach.params.receiverName.value}
		/>
	</FieldGroup>

	<FieldGroup>
		<FieldGroupLabel>Amount</FieldGroupLabel>
		<FieldGroupNumber
			placeholder="e.g. 3.14"
			bind:value={$constructor.networks.ach.params.amount.value}
		/>
		<FieldGroupAppendix>Value in main currency and fractional part (cents).</FieldGroupAppendix>
	</FieldGroup>

	<FieldGroup>
		<FieldGroupLabel>Fiat currency</FieldGroupLabel>
		<FieldGroupText
			placeholder="e.g. USD"
			classValue="uppercase placeholder:normal-case"
			bind:value={$constructor.networks.ach.params.currency.value}
		/>
		<FieldGroupAppendix>Empty value uses the default network currency.</FieldGroupAppendix>
	</FieldGroup>

	<FieldGroup>
		<div class="flex items-center">
			<input
				type="checkbox"
				bind:checked={$constructor.networks.ach.isRc}
				id="recurringCheckbox"
				onchange={handleRecurringChange}
			/>
			<label for="recurringCheckbox" class="ml-2">Recurring payments</label>
		</div>
	</FieldGroup>

	{#if $constructor.networks.ach.isRc}
		<FieldGroupRadioWithNumber
			options={[
				{ name: 'Yearly', value: 'y' },
				{ name: 'Monthly', value: 'm' },
				{ name: 'Weekly', value: 'w' },
				{ name: 'Daily', value: 'd', hasNumberInput: true }
			]}
			defaultChecked={$constructor.networks.ach.params.rc.value}
			bind:outputValue={$constructor.networks.ach.params.rc.value}
		/>
	{/if}
</div>
