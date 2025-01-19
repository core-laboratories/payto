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
			<div class="[ flex gap-4 ]">
				<input
					class={join(
						'[ is-full bs-12 plb-2 pli-3 text-start bg-gray-900 rounded-md border-none caret-teal-500 ]',
						'[ focus:outline-none focus-visible:ring-4 focus-visible:ring-opacity-75 focus-visible:ring-green-800 focus-visible:ring-offset-green-700 focus-visible:ring-offset-2 ]',
						'[ sm:text-sm ]'
					)}
					type="number"
					placeholder="Latitude"
					autocomplete="off"
					aria-labelledby="exchange-point-label"
					bind:value={$constructor.networks.void.params.loc.lat}
				/>
				<input
					class={join(
						'[ is-full bs-12 plb-2 pli-3 text-start bg-gray-900 rounded-md border-none caret-teal-500 ]',
						'[ focus:outline-none focus-visible:ring-4 focus-visible:ring-opacity-75 focus-visible:ring-green-800 focus-visible:ring-offset-green-700 focus-visible:ring-offset-2 ]',
						'[ sm:text-sm ]'
					)}
					type="number"
					id="exchange-point"
					placeholder="Longitude"
					autocomplete="off"
					aria-labelledby="exchange-point-label"
					bind:value={$constructor.networks.void.params.loc.lon}
				/>
			</div>
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
			<input
				class={join(
					'[ is-full bs-12 plb-2 pli-3 text-start bg-gray-900 rounded-md border-none caret-teal-500 ]',
					'[ focus:outline-none focus-visible:ring-4 focus-visible:ring-opacity-75 focus-visible:ring-green-800 focus-visible:ring-offset-green-700 focus-visible:ring-offset-2 ]',
					'[ sm:text-sm ]'
				)}
				type="text"
				id="exchange-point"
				placeholder="Plus Code, e.g. 87G8Q2PQ+96"
				autocomplete="off"
				aria-labelledby="exchange-point-label"
				style="text-transform: uppercase"
				bind:value={$constructor.networks.void.params.loc.plus}
			/>
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
