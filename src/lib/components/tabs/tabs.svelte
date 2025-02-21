<script lang="ts">
	import { writable, derived } from 'svelte/store';
	import { ListBox } from '$lib/components';
	import { fade } from 'svelte/transition';
	import { getObjectByType } from '$lib/helpers/get-object-by-type.helper';
	import { constructor } from '$lib/store/constructor.store';
	import { TYPES } from '$lib/data/types.data';
	import { onMount } from 'svelte';

	import {
		AutomatedClearingHouseConstructor,
		InternationalCryptoAccountNumberConstructor,
		BusinessIdentifierCodeConstructor,
		InternationalBankAccountNumberConstructor,
		UnifiedPaymentsInterfaceConstructor,
		PixConstructor,
		VoidPaymentTargetConstructor
	} from '../../../routes/components';
	import { page } from '$app/state';


	export let selectedTab: string = 'ican';

	onMount(() => {
		const preSelectedTab = page.url.hash.replace('#', '').split('?')[0] || undefined;

		if (preSelectedTab) {
			handleTabChange(preSelectedTab);
		}
	})

	const paymentTypes: Record<string, { label: string; ticker: string; component: any }> = {
		ican: { label: getObjectByType(TYPES, 'ican')?.label, ticker: getObjectByType(TYPES, 'ican')?.description, component: InternationalCryptoAccountNumberConstructor },
		iban: { label: getObjectByType(TYPES, 'iban')?.label, ticker: getObjectByType(TYPES, 'iban')?.description, component: InternationalBankAccountNumberConstructor },
		ach: { label: getObjectByType(TYPES, 'ach')?.label, ticker: getObjectByType(TYPES, 'ach')?.description, component: AutomatedClearingHouseConstructor },
		upi: { label: getObjectByType(TYPES, 'upi')?.label, ticker: getObjectByType(TYPES, 'upi')?.description, component: UnifiedPaymentsInterfaceConstructor },
		pix: { label: getObjectByType(TYPES, 'pix')?.label, ticker: getObjectByType(TYPES, 'pix')?.description, component: PixConstructor },
		bic: { label: getObjectByType(TYPES, 'bic')?.label, ticker: getObjectByType(TYPES, 'bic')?.description, component: BusinessIdentifierCodeConstructor },
		void: { label: getObjectByType(TYPES, 'void')?.label, ticker: getObjectByType(TYPES, 'void')?.description, component: VoidPaymentTargetConstructor }
	};

	const tabs = writable<string>(selectedTab);

	const listboxItems: Array<{ value: string; label: string; ticker: string }> = Object.keys(paymentTypes).map(key => ({
		value: key,
		label: paymentTypes[key].label,
		ticker: paymentTypes[key].ticker
	}));

	const activeTab = derived(tabs, $tabs => $tabs);

	function handleTabChange(value: string | number) {
		const tabValue = String(value);
		constructor.reset(selectedTab as ITransitionType);
		selectedTab = tabValue;
		tabs.set(tabValue);
		$constructor.paymentType = tabValue;
	}

	onMount(() => {
		const hash = window.location.hash.substring(1);
		if (hash && Object.keys(paymentTypes).includes(hash)) {
			selectedTab = hash;
			tabs.set(hash);
		}
	});
</script>

<div class="flex w-full flex-col gap-2">
	<label id="payment-type-label" for="payment-type" class="font-bold">Payment Type</label>
	<div class="flex flex-col items-stretch gap-4">
		<div in:fade>
			<ListBox
				id="payment-type"
				bind:value={selectedTab}
				items={listboxItems}
				onChange={handleTabChange}
			/>
		</div>
	</div>

	<div class="mt-4">
		{#each Object.keys(paymentTypes) as value}
			{#if $activeTab === value}
				<div
					class="outline-none focus:outline-none focus-visible:ring-1 focus-visible:ring-opacity-75 focus-visible:ring-green-800 focus-visible:ring-offset-green-700 focus-visible:ring-offset-2"
					in:fade
				>
					<svelte:component this={paymentTypes[value].component} />
				</div>
			{/if}
		{/each}
	</div>
</div>
