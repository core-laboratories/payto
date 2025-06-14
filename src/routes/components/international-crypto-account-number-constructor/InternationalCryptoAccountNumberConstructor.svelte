<script lang="ts">
	import {
		FieldGroup,
		FieldGroupAppendix,
		FieldGroupLabel,
		FieldGroupNumber,
		FieldGroupDateTime,
		FieldGroupText,
		FieldGroupRadioWithNumber,
		ListBox
	} from '$lib/components';

	const isDebug = import.meta.env.MODE === 'development';

	import { TRANSPORT } from '$lib/data/transports.data';
	import { constructor } from '$lib/store/constructor.store';
	import { fade, fly } from 'svelte/transition';
	import { addressSchema } from '$lib/validators/address.validator';

	let addressValue = $state<string | undefined>(undefined);
	let addressValidated = $state<boolean>(false);
	let addressError = $state<boolean>(false);
	let addressTestnet = $state<boolean>(false);
	let addressEnterprise = $state<boolean>(false);
	let addressMsg = $state<string>('');

	let splitAddressValue = $state<string | undefined>(undefined);
	let splitAddressValidated = $state<boolean>(false);
	let splitAddressError = $state<boolean>(false);
	let splitAddressTestnet = $state<boolean>(false);
	let splitAddressEnterprise = $state<boolean>(false);
	let splitAddressMsg = $state<string>('');

	let timeDateValue = $state('');
	let classUpperValue = $state('uppercase');
	let tokens = TRANSPORT.ican.find(item => item.value === $constructor.networks.ican.network)?.tokens;

	let previousClearedState = false;

	$effect(() => {
		classUpperValue = $constructor.networks.ican.params?.currency?.value?.toLowerCase()?.startsWith('0x') ? '' : 'uppercase';
		if ($constructor.isCleared && !previousClearedState) {
			resetAddress();
			resetSplitAddress();
		}
		previousClearedState = $constructor.isCleared;
	});

	function getCurrentDateTime() {
		const now = new Date();
		return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
	}

	function handleFiatChange() {
		if (!$constructor.networks.ican.isFiat) {
			$constructor.networks.ican.params.fiat.value = undefined;
		}
	}

	function handleSwapChange() {
		if (!$constructor.networks.ican.isSwap) {
			$constructor.networks.ican.params.swap.value = undefined;
		}
	}

	function handleSplitChange() {
		if (!$constructor.networks.ican.isSplit) {
			Object.assign($constructor.networks.ican.params.split, { isPercent: undefined, value: undefined, address: undefined });
		}
	}

	function handleExpirationChange() {
		if (!$constructor.networks.ican.isDl) {
			timeDateValue = '';
			$constructor.networks.ican.params.dl.value = undefined;
		}
	}

	function handleRecurringChange() {
		if (!$constructor.networks.ican.isRc) {
			$constructor.networks.ican.params.rc.value = undefined;
		}
	}

	function getPlaceholder(network: string): string {
		switch (network) {
			case 'btc': return 'e.g. btc1q…';
			case 'eth': return 'e.g. 0x1abc…; name.eth';
			case 'ltc': return 'e.g. ltc1q…';
			case 'xmr': return 'e.g. 4A3BcD…';
			default: return 'e.g. cb57bb…; name.tld';
		}
	}

	function handleAddressInput(event: Event) {
		const value = (event.target as HTMLInputElement).value;
		addressValue = value;
		validateAddress(value);
	}

	function resetAddress() {
		addressValidated = false;
		addressError = false;
		addressTestnet = false;
		addressEnterprise = false;
		addressMsg = '';
		addressValue  = '';
		$constructor.networks.ican.destination = undefined;
	}

	function validateAddress(value: string, network?: string) {
		if (!value) {
			resetAddress();
			return;
		}

		try {
			const result = addressSchema.safeParse({
				network: network || $constructor.networks.ican.network,
				destination: addressValue
			});

			if (!result.success) {
				const error = result.error.errors[0];
				if (!error.fatal) {
					addressValidated = true;
					addressError = false;
					addressTestnet = error.path.includes('testnet');
					addressEnterprise = error.path.includes('enterprise');
					addressMsg = error.message;
					$constructor.networks.ican.destination = value;

					if (error.path.includes('testnet')) {
						$constructor.networks.ican.other = $constructor.networks.ican.network;
						$constructor.networks.ican.network = 'other';
					}
				} else {
					addressValidated = false;
					addressError = true;
					addressTestnet = false;
					addressEnterprise = false;
					addressMsg = error?.message || 'Invalid address format';
					$constructor.networks.ican.destination = undefined;
				}
			} else {
				addressValidated = true;
				addressError = false;
				addressTestnet = false;
				addressEnterprise = false;
				addressMsg = '';
				$constructor.networks.ican.destination = value;
			}
		} catch (error: any) {
			addressValidated = false;
			addressError = true;
			addressTestnet = false;
			addressEnterprise = false;
			addressMsg = isDebug ? error.message : 'Invalid address format';
			$constructor.networks.ican.destination = undefined;
		}
	}

	function validateCurrentAddress() {
		const otherNetworkValue = $constructor.networks.ican.other;

		if ($constructor.networks.ican.network === 'other') {
			const isOtherMatchToNetworks = TRANSPORT.ican.find((network) => network.value.toLowerCase() === otherNetworkValue?.toLowerCase() || network.label.toLowerCase() === otherNetworkValue?.toLowerCase());

			if (isOtherMatchToNetworks) {
				$constructor.networks.ican.network = isOtherMatchToNetworks.value;
				$constructor.networks.ican.other = undefined;
			}
		}

		if ($constructor.networks.ican.network === 'other' && otherNetworkValue && addressValue) {
			validateAddress(addressValue, otherNetworkValue);
		} else if (addressValue) {
			validateAddress(addressValue);
		}
	}

	function handleSplitAddressInput(event: Event) {
		const value = (event.target as HTMLInputElement).value;
		splitAddressValue = value;
		validateSplitAddress(value);
	}

	function resetSplitAddress() {
		splitAddressValidated = false;
		splitAddressError = false;
		splitAddressTestnet = false;
		splitAddressEnterprise = false;
		splitAddressMsg = '';
		splitAddressValue = '';
		$constructor.networks.ican.params.split.address = undefined;
	}

	function validateSplitAddress(value: string, network?: string) {
		if (!value) {
			resetSplitAddress()
			return;
		}

		try {
			const result = addressSchema.safeParse({
				network: network || $constructor.networks.ican.network,
				destination: value
			});

			if (!result.success) {
				const error = result.error.errors[0];
				if (!error.fatal) {
					const isTestnet = error.path.includes('testnet');
					if (isTestnet !== addressTestnet) {
						splitAddressValidated = false;
						splitAddressError = true;
						splitAddressTestnet = false;
						splitAddressEnterprise = false;
						splitAddressMsg = `Split address network type (${isTestnet ? 'testnet' : 'mainnet'}) must match the main address (${addressTestnet ? 'testnet' : 'mainnet'})`;
						$constructor.networks.ican.params.split.address = undefined;
						return;
					}

					splitAddressValidated = true;
					splitAddressError = false;
					splitAddressTestnet = isTestnet;
					splitAddressEnterprise = error.path.includes('enterprise');
					splitAddressMsg = error.message;
					$constructor.networks.ican.params.split.address = undefined;
				} else {
					splitAddressValidated = false;
					splitAddressError = true;
					splitAddressTestnet = false;
					splitAddressEnterprise = false;
					splitAddressMsg = error?.message || 'Invalid address format';
					$constructor.networks.ican.params.split.address = undefined;
				}
			} else {
				if (addressTestnet) {
					splitAddressValidated = false;
					splitAddressError = true;
					splitAddressTestnet = false;
					splitAddressEnterprise = false;
					splitAddressMsg = 'Split address network type (mainnet) must match the main address (testnet)';
					$constructor.networks.ican.params.split.address = undefined;
					return;
				}

				splitAddressValidated = true;
				splitAddressError = false;
				splitAddressTestnet = false;
				splitAddressEnterprise = false;
				splitAddressMsg = '';
				$constructor.networks.ican.params.split.address = value;
			}
		} catch (error: any) {
			splitAddressValidated = false;
			splitAddressError = true;
			splitAddressTestnet = false;
			splitAddressEnterprise = false;
			splitAddressMsg = isDebug ? error.message : 'Invalid address format';
			$constructor.networks.ican.params.split.address = undefined;
		}
	}
</script>

<div class="flex flex-col gap-6" in:fly={{ y: 64 }}>
	<div class="flex flex-col items-stretch gap-2">
		<label id="transport-network-label" for="transport-network">Transport Network *</label>
		<div class="flex flex-col items-stretch gap-4">
			{#if $constructor.networks.ican.network !== 'other'}
				<div in:fade>
					<ListBox
						id="transport-network"
						bind:value={$constructor.networks.ican.network}
						items={TRANSPORT.ican}
						onChange={validateCurrentAddress}
					/>
				</div>
			{:else}
				<div class="flex items-center relative" in:fade>
					<button
						class="flex items-center justify-between absolute start-0 ms-2 p-2 text-gray-50 bg-gray-700 hover:bg-gray-600 rounded-full outline-none transition duration-200 focus-visible:bg-green-900 focus-visible:text-green-50 active:scale-(0.95)"
						title="Back to network menu options"
						aria-label="Back to network menu options"
						onpointerdown={() => {
							$constructor.networks.ican.network = 'xcb';
							resetAddress();
						}}
					>
						<svg
							class="w-5"
							fill="none"
							stroke="currentColor"
							stroke-width="1.5"
							viewBox="0 0 24 24"
							xmlns="http://www.w3.org/2000/svg"
							aria-hidden="true"
						>
							<path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
						</svg>
					</button>
					<input
						class="w-full h-12 p-3 ps-14 text-start bg-gray-900 rounded-md border-0"
						type="text"
						id="transport-network"
						placeholder="Other network"
						bind:value={$constructor.networks.ican.other}
						oninput={validateCurrentAddress}
					/>
				</div>
			{/if}
		</div>
	</div>

	<FieldGroup>
		<FieldGroupLabel>Address / <span class="relative overflow-hidden cursor-help group hover:overflow-visible focus-visible:outline-none border-b border-dotted border-gray-400" aria-describedby="tooltip-ns">
			NS
			<span role="tooltip" id="tooltip-ns" class="invisible absolute bottom-full left-1/2 z-10 mb-2 w-48 -translate-x-1/2 rounded bg-slate-700 p-2 text-xs text-white opacity-0 transition-all before:invisible before:absolute before:left-1/2 before:top-full before:z-10 before:mb-2 before:-ml-1 before:border-x-4 before:border-t-4 before:border-x-transparent before:border-t-slate-700 before:opacity-0 before:transition-all before:content-[''] group-hover:visible group-hover:block group-hover:opacity-100 group-hover:before:visible group-hover:before:opacity-100">Name Service</span>
		</span> *</FieldGroupLabel>
		<div class="relative">
			<FieldGroupText
				placeholder={getPlaceholder($constructor.networks.ican.network)}
				bind:value={addressValue}
				oninput={handleAddressInput}
				classValue={`tracking-widest placeholder:tracking-normal [&:not(:placeholder-shown)]:font-code ${
					addressError ? 'border-2 border-rose-500' :
					addressTestnet ? 'border-2 border-amber-500' :
					addressEnterprise ? 'border-2 border-amber-500' :
					addressValidated ? 'border-2 border-emerald-500' : ''
				}`}
			/>
			{#if addressError}
				<div class="text-sm mt-3 text-rose-500">Error: {addressMsg}</div>
			{:else if addressTestnet}
				<div class="text-amber-500 text-sm mt-3">Warning: {addressMsg}</div>
			{:else if addressEnterprise}
				<div class="text-amber-500 text-sm mt-3">Warning: {addressMsg}</div>
			{/if}
		</div>
	</FieldGroup>

	{#if tokens}
		<FieldGroup>
			<FieldGroupLabel>Token code / Token address</FieldGroupLabel>
			<FieldGroupText
				placeholder="e.g. CTN; 0x1ab…"
				bind:value={$constructor.networks.ican.params.currency.value}
				classValue={`tracking-widest placeholder:tracking-normal [&:not(:placeholder-shown)]:font-code ${classUpperValue}`}
			/>
			<FieldGroupAppendix>If left empty, the default is the network currency or local fiat.</FieldGroupAppendix>
		</FieldGroup>
	{/if}

	<FieldGroup>
		<FieldGroupLabel>{($constructor.networks.ican.isFiat ? 'Fiat Amount' : 'Amount')}</FieldGroupLabel>
		<FieldGroupNumber placeholder="e.g. 3.14" bind:value={$constructor.networks.ican.params.amount.value} />
	</FieldGroup>

	{#if ['eth', 'other'].includes($constructor.networks.ican.network)}
		<FieldGroup>
			<FieldGroupLabel>Chain ID</FieldGroupLabel>
			<FieldGroupText
				placeholder="e.g. 61"
				bind:value={$constructor.networks.ican.chain}
			/>
			<FieldGroupAppendix>If left empty, the default network chain will be used.</FieldGroupAppendix>
		</FieldGroup>
	{/if}

	<FieldGroup>
		<div class="flex items-center">
			<input
				type="checkbox"
				bind:checked={$constructor.networks.ican.isFiat}
				id="fiatCheckbox"
				onchange={handleFiatChange}
			/>
			<label for="fiatCheckbox" class="ml-2">Fiat quote for Digital Assets</label>
		</div>
	</FieldGroup>

	{#if $constructor.networks.ican.isFiat}
		<FieldGroup>
			<FieldGroupLabel>Fiat Currency</FieldGroupLabel>
			<FieldGroupText
				placeholder="e.g. USD"
				classValue="uppercase placeholder:normal-case"
				bind:value={$constructor.networks.ican.params.fiat.value}
			/>
		</FieldGroup>
	{/if}

	<FieldGroup>
		<div class="flex items-center">
			<input
				type="checkbox"
				bind:checked={$constructor.networks.ican.isSwap}
				id="swapCheckbox"
				onchange={handleSwapChange}
			/>
			<label for="swapCheckbox" class="ml-2">Swap</label>
		</div>
	</FieldGroup>

	{#if $constructor.networks.ican.isSwap}
		<FieldGroup>
			<FieldGroupLabel>Asset to receive</FieldGroupLabel>
			<FieldGroupText
				placeholder="e.g. USDC"
				classValue="uppercase placeholder:normal-case"
				bind:value={$constructor.networks.ican.params.swap.value}
			/>
		</FieldGroup>
	{/if}

	<FieldGroup>
		<div class="flex items-center">
			<input
				type="checkbox"
				bind:checked={$constructor.networks.ican.isDl}
				id="expirationCheckbox"
				onchange={handleExpirationChange}
			/>
			<label for="expirationCheckbox" class="ml-2">Expiration</label>
		</div>
	</FieldGroup>

	{#if $constructor.networks.ican.isDl}
		<FieldGroup>
			<FieldGroupLabel>
				<div class="flex items-center">
					<span class="mr-3">Expiration {$constructor.networks.ican.params.dl.isMinutes ? 'Minutes' : 'Date'}</span>
					<input
						type="checkbox"
						bind:checked={$constructor.networks.ican.params.dl.isMinutes}
						id="expirationTypeCheckbox"
					/>
					<label for="expirationTypeCheckbox" class="ml-2">Use Minutes</label>
				</div>
			</FieldGroupLabel>

			{#if $constructor.networks.ican.params.dl.isMinutes}
				<FieldGroupNumber
					placeholder="e.g. 30 (minutes from execution)"
					bind:value={$constructor.networks.ican.params.dl.value}
					min={1}
					max={60}
				/>
				<FieldGroupAppendix>Enter a value between 1-60 minutes from execution.</FieldGroupAppendix>
			{:else}
				<FieldGroupDateTime
					id="expirationInput"
					min={getCurrentDateTime()}
					bind:value={timeDateValue}
					bind:unixTimestamp={$constructor.networks.ican.params.dl.value}
				/>
			{/if}
		</FieldGroup>
	{/if}

	<FieldGroup>
		<div class="flex items-center">
			<input
				type="checkbox"
				bind:checked={$constructor.networks.ican.isRc}
				id="recurringCheckbox"
				onchange={handleRecurringChange}
			/>
			<label for="recurringCheckbox" class="ml-2">Recurring Payments</label>
		</div>
	</FieldGroup>

	{#if $constructor.networks.ican.isRc}
		<FieldGroupRadioWithNumber
			options={[
				{ name: 'Yearly', value: 'y' },
				{ name: 'Monthly', value: 'm' },
				{ name: 'Weekly', value: 'w' },
				{ name: 'Daily', value: 'd', hasNumberInput: true }
			]}
			defaultChecked={$constructor.networks.ican.params.rc.value}
			bind:outputValue={$constructor.networks.ican.params.rc.value}
		/>
	{/if}

	<FieldGroup>
		<div class="flex items-center">
			<input
				type="checkbox"
				bind:checked={$constructor.networks.ican.isSplit}
				id="splitCheckbox"
				onchange={handleSplitChange}
			/>
			<label for="splitCheckbox" class="ml-2">Transaction Split</label>
		</div>
	</FieldGroup>

	{#if $constructor.networks.ican.isSplit}
		<FieldGroup>
			<FieldGroupLabel>Split Address / <abbr title="Name Service">NS</abbr></FieldGroupLabel>
			<div class="relative">
				<FieldGroupText
					placeholder={getPlaceholder($constructor.networks.ican.network)}
					bind:value={splitAddressValue}
					oninput={handleSplitAddressInput}
					classValue={`tracking-widest placeholder:tracking-normal [&:not(:placeholder-shown)]:font-code ${
						splitAddressError ? 'border-2 border-rose-500' :
						splitAddressTestnet ? 'border-2 border-amber-500' :
						splitAddressEnterprise ? 'border-2 border-amber-500' :
						splitAddressValidated ? 'border-2 border-emerald-500' : ''
					}`}
				/>
				{#if splitAddressError}
					<div class="text-sm mt-3 text-rose-500">Error: {splitAddressMsg}</div>
				{:else if splitAddressTestnet}
					<div class="text-amber-500 text-sm mt-3">Warning: {splitAddressMsg}</div>
				{:else if splitAddressEnterprise}
					<div class="text-amber-500 text-sm mt-3">Warning: {splitAddressMsg}</div>
				{/if}
			</div>
		</FieldGroup>
		<FieldGroup>
			<FieldGroupLabel>
				<div class="flex items-center">
					<span class="mr-3">Amount ({$constructor.networks.ican.params.split.isPercent ? 'Percentage' : 'Value'})</span>
					<input
						type="checkbox"
						bind:checked={$constructor.networks.ican.params.split.isPercent}
						id="splitPCheckbox"
					/>
					<label for="splitPCheckbox" class="ml-2">Percentage</label>
				</div>
			</FieldGroupLabel>

			<FieldGroupNumber
				placeholder={$constructor.networks.ican.params.split.isPercent ? 'e.g. 10%' : 'e.g. 3.14'}
				bind:value={$constructor.networks.ican.params.split.value}
				type="number"
				min={0}
				max={$constructor.networks.ican.params.split.isPercent ? 100 : undefined}
			/>
			{#if !$constructor.networks.ican.params.split.isPercent}<FieldGroupAppendix>Amount must be lower than requested amount.</FieldGroupAppendix>{/if}
		</FieldGroup>
	{/if}
</div>
