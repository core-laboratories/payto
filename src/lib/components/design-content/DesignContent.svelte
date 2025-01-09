<script lang="ts">
	import {
		FieldGroup,
		FieldGroupColorPicker,
		FieldGroupLabel,
		FieldGroupText,
		ListBox
	} from '$lib/components';

	import { derived, writable } from 'svelte/store';
	import { constructor } from '$lib/store/constructor.store';
	import { calculateColorDistance } from '$lib/helpers/euclidean-distance.helper';
	import { join } from '$lib/helpers/join.helper';

	const barcodeTypes = [
		{ label: 'QR Code', value: 'qr', ticker: 'QR' },
		{ label: 'PDF 417', value: 'pdf417', ticker: 'PDF' },
		{ label: 'Aztec', value: 'aztec', ticker: 'Aztec' }
	];

	const distance = derived(constructor, $constructor =>
		Math.floor(
			calculateColorDistance($constructor.design.colorF || '#192a14', $constructor.design.colorB || '#77bc65')
		)
	);

	const barcodeValue = derived(constructor, $constructor => $constructor.design.barcode ?? 'qr');

	function updateBarcode(value: string | number) {
		constructor.update(c => ({
			...c,
			design: { ...c.design, barcode: String(value) }
		}));
	}
</script>

<div class="[ flex flex-col gap-6 ]">
	<FieldGroup>
		<FieldGroupLabel>Company Name</FieldGroupLabel>
		<FieldGroupText
			placeholder="PayTo"
			bind:value={$constructor.design.org}
			maxlength="25"
		/>
	</FieldGroup>

	<FieldGroup>
		<FieldGroupLabel>Item Name</FieldGroupLabel>
		<FieldGroupText
			placeholder="Payment for…"
			bind:value={$constructor.design.item}
			maxlength="40"
		/>
	</FieldGroup>

	<div class="[ flex flex-col gap-6 ]">Theme setup:</div>

	<div>
		Current Color Euclidean distance:
		<span class:text-red-500={$distance < 100}>{$distance}</span>
	</div>

	<FieldGroup flexType="row" itemPosition="items-center">
		<FieldGroupColorPicker
			label="Foreground Color"
			bind:value={$constructor.design.colorF}
		/>
	</FieldGroup>

	<FieldGroup flexType="row" itemPosition="items-center">
		<FieldGroupColorPicker
			label="Background Color"
			bind:value={$constructor.design.colorB}
		/>
	</FieldGroup>

	<div class="[ flex flex-col ]">
		<p class="[ -mb-1 text-gray-400 ]">
			Note: Similar Colors will not be accepted - the minimum Euclidean distance is 100.
		</p>
	</div>

	<FieldGroup>
		<FieldGroupLabel>Default Barcode Type</FieldGroupLabel>
		<ListBox
			id="barcode-list"
			value={$barcodeValue}
			on:change={e => updateBarcode(e.detail)}
			items={barcodeTypes}
		/>
	</FieldGroup>

	<button
		class={join(
			'[ is-full bs-12 mbs-auto plb-2 pli-3 text-center text-white border border-gray-700 bg-gray-700 rounded-md transition-all duration-200 outline-none ]',
			'[ focus-visible:ring-4 focus-visible:ring-opacity-75 focus-visible:ring-green-800 focus-visible:ring-offset-green-700 focus-visible:ring-offset-2 ]',
			'[ active:scale-[.99] ]',
			'[ sm:text-sm ]'
		)}
		type="button"
		on:pointerdown={() => constructor.resetDesign()}
	>
		Clear
	</button>
</div>
