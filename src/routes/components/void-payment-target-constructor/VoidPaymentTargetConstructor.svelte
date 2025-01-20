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
	import { join } from '$lib/helpers/join.helper';
	import { constructor } from '$lib/store/constructor.store';
	import { fade, fly } from 'svelte/transition';
	import { coordinatesSchema, plusCodeSchema } from '$lib/validators/location.validator';

	let latError: boolean = false;
	let latMsg: string = '';
	let latValue: string | undefined = undefined;

	let lonError: boolean = false;
	let lonMsg: string = '';
	let lonValue: string | undefined = undefined;

	let plusCodeError: boolean = false;
	let plusCodeMsg: string = '';
	let plusCodeValue: string | undefined = undefined;

	function validateCoordinates() {
		if (!latValue && !lonValue) {
			latError = lonError = false;
			latMsg = lonMsg = '';
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
				const errors = result.error.errors;
				errors.forEach(error => {
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
				latError = lonError = false;
				latMsg = lonMsg = '';
				$constructor.networks.void.params.loc.lat = latValue;
				$constructor.networks.void.params.loc.lon = lonValue;
			}
		} catch (error: any) {
			latError = lonError = true;
			latMsg = lonMsg = error.message || 'Invalid coordinate format';
			$constructor.networks.void.params.loc.lat = undefined;
			$constructor.networks.void.params.loc.lon = undefined;
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
				plusCodeMsg = result.error.errors[0]?.message || 'Invalid Plus Code format';
				$constructor.networks.void.params.loc.plus = undefined;
			} else {
				plusCodeError = false;
				plusCodeMsg = '';
				$constructor.networks.void.params.loc.plus = value.toUpperCase();
			}
		} catch (error: any) {
			plusCodeError = true;
			plusCodeMsg = error.message || 'Invalid Plus Code format';
			$constructor.networks.void.params.loc.plus = undefined;
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
		const value = (event.target as HTMLInputElement).value;
		plusCodeValue = value;
		validatePlusCode(value);
	}
</script>

<div class="[ flex flex-col gap-6 ]" in:fly={{ y: 64 }}>
	<div class={join('[ flex flex-col items-stretch gap-2 ]')}>
		<label id="transport-network-label" for="transport-network">Transport Network *</label>
		<div class="[ flex flex-col items-stretch gap-4 ]">
			{#if $constructor.networks.void.transport !== 'other'}
				<div in:fade>
					<ListBox bind:value={$constructor.networks.void.transport} items={TRANSPORT.void} />
				</div>
			{/if}
			{#if $constructor.networks.void.transport === 'other'}
				<div class={join('[ flex items-center ]', '[ relative ]')} in:fade>
					<button
						class={join(
							'[ flex items-center justify-between ]',
							'[ absolute inline-start-0 mli-3 p-2 text-gray-50 bg-gray-700 rounded-full outline-none transition-all duration-200 ]',
							'[ focus-within:bg-green-900 focus-within:text-green-50 active:scale-95 ]'
						)}
						type="button"
						title="Back to network menu options"
						aria-label="Back to network menu options"
						on:pointerdown={() => ($constructor.networks.void.transport = 'geo')}
					>
						<svg
							class={join('[ bs-4 is-4 ]')}
							fill="none"
							stroke="currentColor"
							stroke-width="1.5"
							viewBox="0 0 24 24"
							xmlns="http://www.w3.org/2000/svg"
							aria-hidden="true"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
							/>
						</svg>
					</button>

					<input
						class={join(
							'[ is-full bs-12 plb-2 pis-14 pie-3 text-start bg-gray-900 rounded-md border-none caret-teal-500 ]',
							'[ focus:outline-none focus-visible:ring-4 focus-visible:ring-opacity-75 focus-visible:ring-green-800 focus-visible:ring-offset-green-700 focus-visible:ring-offset-2 ]',
							'[ sm:text-sm ]'
						)}
						type="text"
						id="transport-network"
						placeholder="Other network"
						autocomplete="off"
						aria-labelledby="transport-network-label"
						style="text-transform: uppercase"
						bind:value={$constructor.networks.void.other}
					/>
				</div>
			{/if}
		</div>
	</div>

	<div class={join('[ flex flex-col items-stretch gap-2 ]')}>
		<label id="exchange-point-label" for="exchange-point">Location</label>
		{#if $constructor.networks.void.transport === 'geo'}
			<div class="flex gap-4">
				<FieldGroup>
					<FieldGroupText
						placeholder="Latitude"
						bind:value={latValue}
						on:input={handleLatInput}
						on:change={handleLatInput}
						classValue={`font-mono ${
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
						placeholder="Longitude"
						bind:value={lonValue}
						on:input={handleLonInput}
						on:change={handleLonInput}
						classValue={`font-mono ${
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
			<small class="[ -mbs-1 text-gray-400 ]">
				Search for the geocoordinates -
				<a
					class="[ transition-all duration-200 ] [ visited:text-gray-200 hover:text-gray-300 ]"
					href="https://www.latlong.net/"
					target="_blank"
					rel="noreferrer"
				>
					Latitude & Longitude (DD - Decimal Degrees)
				</a>
			</small>
		{/if}

		{#if $constructor.networks.void.transport === 'plus'}
			<FieldGroup>
				<FieldGroupText
					placeholder="Plus Code, e.g. 87G8Q2PQ+96"
					bind:value={plusCodeValue}
					on:input={handlePlusCodeInput}
					on:change={handlePlusCodeInput}
					classValue={`font-mono uppercase ${
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
			<small class="[ -mbs-1 text-gray-400 ]">
				Search for the{' '}
				<a
					class="[ transition-all duration-200 ] [ visited:text-gray-200 hover:text-gray-300 ]"
					href="https://plus.codes/map"
					target="_blank"
					rel="noreferrer"
				>
					Plus Code
				</a>
			</small>
		{/if}

		{#if $constructor.networks.void.transport === 'other'}
			<input
				class={join(
					'[ is-full bs-12 plb-2 pli-3 text-start bg-gray-900 rounded-md border-none caret-teal-500 ]',
					'[ focus:outline-none focus-visible:ring-4 focus-visible:ring-opacity-75 focus-visible:ring-green-800 focus-visible:ring-offset-green-700 focus-visible:ring-offset-2 ]',
					'[ sm:text-sm ]'
				)}
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
			classValue="uppercase"
		/>
		<FieldGroupAppendix>Empty value uses the default network currency.</FieldGroupAppendix>
	</FieldGroup>
</div>
