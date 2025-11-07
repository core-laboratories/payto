<script lang="ts">
	import {
		FieldGroup,
		FieldGroupAppendix,
		FieldGroupLabel,
		FieldGroupNumber,
		FieldGroupText,
		ListBox
	} from '$lib/components';

	import { TRANSPORT } from '$lib/data/transports.data';
	import { constructor } from '$lib/store/constructor.store';
	import { fade, fly } from 'svelte/transition';
	import { coordinatesSchema, plusCodeSchema } from '$lib/validators/location.validator';
	import { bicSchema } from '$lib/validators/bic.validator';

	let latError = $state(false);
	let latMsg = $state('');
	let latValue = $state<string | undefined>(undefined);

	let lonError = $state(false);
	let lonMsg = $state('');
	let lonValue = $state<string | undefined>(undefined);

	let plusCodeError = $state(false);
	let plusCodeMsg = $state('');
	let plusCodeValue = $state<string | undefined>(undefined);

	let bicError = $state(false);
	let bicMsg = $state('');
	let bicValue = $state<string | undefined>(undefined);

	$effect(() => {
		if ($constructor.isCleared) {
			latValue = undefined;
			lonValue = undefined;
			latError = false;
			lonError = false;
			latMsg = '';
			lonMsg = '';
			plusCodeValue = undefined;
			plusCodeError = false;
			plusCodeMsg = '';
			bicValue = undefined;
			bicError = false;
			bicMsg = '';
		}
	});

	function validateCoordinates() {
		if (!latValue && !lonValue) {
			latError = false;
			lonError = false;
			latMsg = '';
			lonMsg = '';
			$constructor.networks.void.params.loc.lat = undefined;
			$constructor.networks.void.params.loc.lon = undefined;
			return;
		}

		try {
			const result = coordinatesSchema.safeParse({
				latitude: latValue || '',
				longitude: lonValue || ''
			});

			if (!result.success) {
				const errors = result.error.issues;
				errors.forEach((error: any) => {
					if (error.path.includes('latitude')) {
						latError = true;
						latMsg = error.message;
						$constructor.networks.void.params.loc.lat = undefined;
					} else {
						lonError = true;
						lonMsg = error.message;
						$constructor.networks.void.params.loc.lon = undefined;
					}
				});
			} else {
				latError = false;
				lonError = false;
				latMsg = '';
				lonMsg = '';
				$constructor.networks.void.params.loc.lat = latValue;
				$constructor.networks.void.params.loc.lon = lonValue;
			}
		} catch (error: any) {
			latError = true;
			lonError = true;
			latMsg = lonMsg = error.message || 'Invalid coordinate format';
		}
	}

	function validatePlusCode(value: string) {
		if (!value) {
			plusCodeError = false;
			plusCodeMsg = '';
			$constructor.networks.void.params.loc.plus = undefined;
			return;
		}

		try {
			const result = plusCodeSchema.safeParse({ code: value });

			if (!result.success) {
				plusCodeError = true;
				plusCodeMsg = result.error.issues[0]?.message || 'Invalid Plus Code format';
				$constructor.networks.void.params.loc.plus = undefined;
			} else {
				plusCodeError = false;
				plusCodeMsg = '';
				$constructor.networks.void.params.loc.plus = value.toUpperCase();
			}
		} catch (error: any) {
			plusCodeError = true;
			plusCodeMsg = error.message || 'Invalid Plus Code format';
		}
	}

	function handleLatInput(event: Event) {
		const value = (event.target as HTMLInputElement).value;
		latValue = value;
		validateCoordinates();
	}

	function handleLonInput(event: Event) {
		const value = (event.target as HTMLInputElement).value;
		lonValue = value;
		validateCoordinates();
	}

	function handlePlusCodeInput(event: Event) {
		const value = (event.target as HTMLInputElement).value.toUpperCase();
		plusCodeValue = value;
		validatePlusCode(value);
	}

	function validateBic(value: string) {
		if (value === '') {
			bicError = false;
			bicMsg = '';
			$constructor.networks.void.bic = value;
			return;
		}

		try {
			const result = bicSchema.safeParse({ bic: value });

			if (!result.success) {
				bicError = true;
				bicMsg = result.error.issues[0]?.message || 'Invalid BIC format';
				$constructor.networks.void.bic = undefined;
			} else {
				bicError = false;
				bicMsg = '';
				$constructor.networks.void.bic = value.toUpperCase();
			}
		} catch (error: any) {
			bicError = true;
			bicMsg = error.message || 'Invalid BIC format';
			$constructor.networks.void.bic = value;
		}
	}

	function handleBicInput(event: Event) {
		const value = (event.target as HTMLInputElement).value;
		bicValue = value;
		validateBic(value);
	}

	function handleOtherNetworkInput(event: Event) {
		const otherNetworkValue = $constructor.networks.void.other;

		if ($constructor.networks.void.transport === 'other') {
			const isOtherMatchToNetworks = TRANSPORT.void.find((network) => network.value.toLowerCase() === otherNetworkValue?.toLowerCase() || network.label.toLowerCase() === otherNetworkValue?.toLowerCase());

			if (isOtherMatchToNetworks) {
				$constructor.networks.void.transport = isOtherMatchToNetworks.value;
				$constructor.networks.void.other = undefined;
			}
		}
	}
</script>

<div class="flex flex-col gap-6" in:fly={{ y: 64 }}>
	<div class="flex flex-col items-stretch gap-2">
		<label id="transport-network-label" for="transport-network">Network *</label>
		<div class="flex flex-col items-stretch gap-4">
			{#if $constructor.networks.void.transport !== 'other'}
				<div in:fade>
					<ListBox
						id="transport-network"
						bind:value={$constructor.networks.void.transport}
						items={TRANSPORT.void}
					/>
				</div>
			{/if}
			{#if $constructor.networks.void.transport === 'other'}
				<div class="flex items-center relative" in:fade>
					<button
						class="absolute start-0 ms-3 p-2 text-gray-50 bg-gray-700 rounded-full outline-none transition duration-200"
						type="button"
						title="Back to network menu options"
						aria-label="Back to network menu options"
						onpointerdown={() => ($constructor.networks.void.transport = 'geo')}
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
						class="w-full h-12 py-2 ps-14 pie-3 text-start bg-gray-900 rounded-sm border-none caret-teal-500"
						type="text"
						id="transport-network"
						placeholder="Other network"
						autocomplete="off"
						aria-labelledby="transport-network-label"
						style="text-transform: uppercase"
						bind:value={$constructor.networks.void.other}
						oninput={handleOtherNetworkInput}
					/>
				</div>
			{/if}
		</div>
	</div>

	<div class="flex flex-col items-stretch gap-2">
		{#if $constructor.networks.void.transport === 'geo'}
			<label id="exchange-point-label" for="latitude">Location *</label>
			<div class="flex gap-4">
				<FieldGroup>
					<FieldGroupText
						id="latitude"
						placeholder="Latitude"
						bind:value={latValue}
						oninput={handleLatInput}
						classValue={`tracking-widest placeholder:tracking-normal [&:not(:placeholder-shown)]:font-code ${
							latError
								? 'border-2 border-rose-500 focus:border-rose-500 focus-visible:border-rose-500'
								: latValue
									? 'border-2 border-emerald-500 focus:border-emerald-500 focus-visible:border-emerald-500'
									: ''
						}`}
					/>
				</FieldGroup>
				<FieldGroup>
					<FieldGroupText
						id="longitude"
						placeholder="Longitude"
						bind:value={lonValue}
						oninput={handleLonInput}
						classValue={`tracking-widest placeholder:tracking-normal [&:not(:placeholder-shown)]:font-code ${
							lonError
								? 'border-2 border-rose-500 focus:border-rose-500 focus-visible:border-rose-500'
								: lonValue
									? 'border-2 border-emerald-500 focus:border-emerald-500 focus-visible:border-emerald-500'
									: ''
						}`}
					/>
				</FieldGroup>
			</div>
			{#if latError && latMsg}
				<span class="text-sm text-rose-500">{latMsg}</span>
			{/if}
			{#if lonError && lonMsg}
				<span class="text-sm text-rose-500">{lonMsg}</span>
			{/if}
			<small class="-mt-1 text-gray-400">
				Search for the geocoordinates -
				<a
					class="transition-all duration-200 visited:text-gray-200 hover:text-gray-300"
					href="https://www.latlong.net/"
					target="_blank"
					rel="noreferrer"
				>
					Latitude & Longitude (Decimal Degrees)
				</a>
			</small>
		{/if}

		{#if $constructor.networks.void.transport === 'plus'}
			<label id="plus-code-label" for="plus-code">Plus Code *</label>
			<FieldGroup>
				<FieldGroupText
					id="plus-code"
					placeholder="Plus Code, e.g. 8FWV26PJ+87"
					bind:value={plusCodeValue}
					oninput={handlePlusCodeInput}
					classValue={`tracking-widest placeholder:tracking-normal [&:not(:placeholder-shown)]:font-code ${
						plusCodeError
							? 'border-2 border-rose-500 focus:border-rose-500 focus-visible:border-rose-500'
							: plusCodeValue
								? 'border-2 border-emerald-500 focus:border-emerald-500 focus-visible:border-emerald-500'
								: ''
					}`}
				/>
			</FieldGroup>
			{#if plusCodeError && plusCodeMsg}
				<span class="text-sm text-rose-500">{plusCodeMsg}</span>
			{/if}
			<small class="-mt-1 text-gray-400">
				Search for the{' '}
				<a
					class="transition-all duration-200 visited:text-gray-200 hover:text-gray-300"
					href="https://plus.codes/map"
					target="_blank"
					rel="noreferrer"
				>
					Plus Code (Long Format)
				</a>
			</small>
		{/if}

		{#if $constructor.networks.void.transport === 'intra'}

			<label id="bic-label" for="bic">BIC / <span class="relative overflow-hidden cursor-help group hover:overflow-visible focus-visible:outline-none border-b border-dotted border-gray-400" aria-describedby="tooltip-oric">
				ORIC
				<span role="tooltip" id="tooltip-oric" class="invisible absolute bottom-full left-1/2 z-10 mb-2 w-48 -translate-x-1/2 rounded bg-slate-700 p-2 text-xs text-white opacity-0 transition-all before:invisible before:absolute before:left-1/2 before:top-full before:z-10 before:mb-2 before:-ml-1 before:border-x-4 before:border-t-4 before:border-x-transparent before:border-t-slate-700 before:opacity-0 before:transition-all before:content-[''] group-hover:visible group-hover:block group-hover:opacity-100 group-hover:before:visible group-hover:before:opacity-100">Organization Registry Identifier Code</span>
			</span> *</label>
			<FieldGroup classValue="mb-3">
				<FieldGroupText
					id="bic"
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

			<label id="intra-account-number-label" for="intra-account-number">Account *</label>
			<FieldGroup>
				<FieldGroupText
					id="intra-account-number"
					placeholder="cb00…"
					bind:value={$constructor.networks.void.params.id.value}
				/>
			</FieldGroup>
		{/if}

		{#if $constructor.networks.void.transport === 'other'}
			<label id="exchange-point-label" for="exchange-point">Point *</label>
			<input
				class="w-full h-12 py-2 ps-3 text-start bg-gray-900 rounded-sm border-none caret-teal-500 text-sm tracking-widest placeholder:tracking-normal [&:not(:placeholder-shown)]:font-code"
				type="text"
				id="exchange-point"
				placeholder="Point"
				autocomplete="off"
				aria-labelledby="exchange-point-label"
				bind:value={$constructor.networks.void.params.loc.other}
			/>
		{/if}
	</div>

	<FieldGroup>
		<FieldGroupLabel>Beneficiary Full Name</FieldGroupLabel>
		<FieldGroupText
			placeholder="e.g. John Doe"
			bind:value={$constructor.networks.void.params.receiverName.value}
		/>
	</FieldGroup>

	<FieldGroup>
		<FieldGroupLabel>Message for Beneficiary</FieldGroupLabel>
		<FieldGroupText
			placeholder="e.g. ID001"
			bind:value={$constructor.networks.void.params.message.value}
		/>
	</FieldGroup>

	<FieldGroup>
		<FieldGroupLabel>Amount</FieldGroupLabel>
		<FieldGroupNumber
			placeholder="e.g. 3.14"
			bind:value={$constructor.networks.void.params.amount.value}
		/>
	</FieldGroup>

	<FieldGroup>
		<FieldGroupLabel>Currency code</FieldGroupLabel>
		<FieldGroupText
			placeholder="e.g. XCB; USD"
			bind:value={$constructor.networks.void.params.currency.value}
			classValue="uppercase placeholder:normal-case"
		/>
		<FieldGroupAppendix>Empty value uses the default network currency.</FieldGroupAppendix>
	</FieldGroup>
</div>
