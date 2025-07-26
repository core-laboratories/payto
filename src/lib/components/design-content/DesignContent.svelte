<script lang="ts">
	import {
		FieldGroup,
		FieldGroupColorPicker,
		FieldGroupLabel,
		FieldGroupText,
		ListBox
	} from '$lib/components';
	import { ChevronDown, ChevronUp } from 'lucide-svelte';

	import { derived, get, writable } from 'svelte/store';
	import { constructor } from '$lib/store/constructor.store';
	import { calculateColorDistance } from '$lib/helpers/euclidean-distance.helper';
	import { enhance } from '$app/forms';
	import { generateWebLink, getWebLink } from '$lib/helpers/generate.helper';
	import { getAddress } from '$lib/helpers/get-address.helper';
	import { toast } from '$lib/components/toast';

	export let hostname: ITransitionType | undefined = undefined;
	export let authority: string | undefined = undefined;

	const barcodeTypes = [
		{ label: 'QR Code', value: 'qr', ticker: 'QR' },
		{ label: 'PDF 417', value: 'pdf417', ticker: 'PDF' },
		{ label: 'Aztec', value: 'aztec', ticker: 'Aztec' },
		{ label: 'Code 128', value: 'code128', ticker: 'Code 128' }
	];

	const passModes = [
		{ label: 'Auto', value: 'auto', ticker: 'Autoselect by the App' },
		{ label: 'Tap to Pay', value: 'tap', ticker: 'NFC mode' },
		{ label: 'Code', value: 'code', ticker: 'QR Code mode' }
	];

	const constructorStore = derived(constructor, $c => $c);

	const distance = derived(constructorStore, $constructor =>
		Math.floor(
			calculateColorDistance($constructor.design.colorF || '#9AB1D6', $constructor.design.colorB || '#2A3950')
		)
	);

	const barcodeValue = derived(constructorStore, $constructor => $constructor.design.barcode ?? 'qr');
	const passMode = derived(constructorStore, $constructor => $constructor.design.mode ?? 'auto');
	const address = derived(constructorStore, $constructor =>
		hostname ? getAddress($constructor.networks[hostname], hostname) : undefined
	);
	const isGenerating = writable(false);

	const GENERATION_TIMEOUT = 30000; // 30 seconds timeout

	function updateBarcode(value: string | number) {
		constructor.update(c => ({
			...c,
			design: { ...c.design, barcode: String(value) }
		}));
	}

	function updatePassMode(value: string | number) {
		constructor.update(c => ({
			...c,
			design: { ...c.design, mode: String(value) }
		}));
	}

	const formEnhance = () => {
		isGenerating.set(true);
		const timeoutId = setTimeout(() => {
			isGenerating.set(false);
			toast({ message: 'Generation timed out. Please try again.', type: 'error' });
		}, GENERATION_TIMEOUT);

		return async ({ result }: { result: any }) => {
			clearTimeout(timeoutId);
			try {
				if (result.type === 'error') {
					isGenerating.set(false);
					toast({ message: result.error?.message || 'Failed to generate pass', type: 'error' });
					return;
				}

				if (result.type === 'success' && result.data instanceof Blob) {
					const url = URL.createObjectURL(result.data);
					const a = document.createElement('a');
					a.href = url;
					document.body.appendChild(a);
					a.click();
					toast({ message: 'Pass downloaded successfully', type: 'success' });
					document.body.removeChild(a);
					URL.revokeObjectURL(url);
				} else {
					throw new Error('Invalid response format');
				}
			} catch (error) {
				toast({ message: 'An unexpected error occurred', type: 'error' });
			} finally {
				isGenerating.set(false);
			}
		};
	};

	const link = derived(
		[constructor],
		([$constructor]) => {
			if (!hostname) return '#';

			const links = get(constructor.build(hostname));
			const webLink = links.find((link) => link.label === 'Link');

			return generateWebLink(webLink?.value!);
		}
	);

	function getLink(): string {
		if (!hostname) return '#';
		const networkData = {
			...$constructorStore.networks[hostname],
			design: $constructorStore.design
		};
		return getWebLink({
			network: hostname,
			networkData,
			design: true,
			transform: true
		});
	}

	let showCustomization = false;
</script>

<div class="flex flex-col gap-6">
	{#if !authority}
		<FieldGroup>
			<FieldGroupLabel>Item Title</FieldGroupLabel>
			<FieldGroupText
				placeholder="e.g. Coffee ☕; Table №3"
				bind:value={$constructor.design.item}
				maxlength="40"
			/>
		</FieldGroup>
	{/if}

	<button
		type="button"
		onclick={() => showCustomization = !showCustomization}
		class="flex items-center justify-between w-full p-0 text-left hover:text-gray-300 transition-colors duration-200 border-none bg-transparent"
	>
		<span class="text-lg font-bold">Customization</span>
		{#if showCustomization}
			<ChevronUp class="w-5 h-5" />
		{:else}
			<ChevronDown class="w-5 h-5" />
		{/if}
	</button>

	{#if showCustomization}
		<div class="space-y-4">
			{#if !authority}
				<FieldGroup>
					<FieldGroupLabel>
						Organization Name
					</FieldGroupLabel>
					<FieldGroupText
						placeholder="e.g. PayTo"
						bind:value={$constructor.design.org}
						maxlength="25"
					/>
				</FieldGroup>
			{/if}

			<div class="flex flex-col gap-6">
				<h2 class="text-lg font-bold">Theme setup</h2>
			</div>

			<FieldGroup flexType="row" itemPosition="items-center">
				<FieldGroupColorPicker
					label="Foreground Color"
					bind:value={$constructor.design.colorF}
				/>
			</FieldGroup>

			<FieldGroup flexType="row" itemPosition="items-center">
				<FieldGroupColorPicker
					label="Background Color (Online)"
					bind:value={$constructor.design.colorB}
				/>
			</FieldGroup>

			<div>
				Current Color Euclidean distance:
				<span class:text-red-500={$distance < 100}>{$distance}</span>
				<p class="-mb-1 text-gray-400 text-sm">
					Minimum Euclidean distance of 100 is required.
				</p>
			</div>

			<FieldGroup>
				<div class="flex items-center">
					<input
						type="checkbox"
						bind:checked={$constructor.design.rtl}
						id="rtlCheckbox"
					/>
					<label for="rtlCheckbox" class="ml-2">Right-to-Left typing (RTL)</label>
				</div>
			</FieldGroup>

			<FieldGroup>
				<FieldGroupLabel>Barcode Type for digital PayPass</FieldGroupLabel>
				<ListBox
					id="barcode-list"
					value={$barcodeValue}
					onChange={updateBarcode}
					items={barcodeTypes}
				/>
			</FieldGroup>

			<!--<FieldGroup>
				<FieldGroupLabel>Default Pass mode in Apps <span class="text-gray-400 text-sm">If mode is supported by the App</span></FieldGroupLabel>
				<ListBox
					id="pass-mode"
					value={$passMode}
					onChange={updatePassMode}
					items={passModes}
				/>
			</FieldGroup>-->
		</div>
	{/if}

	<div class="flex flex-col gap-3">
		<div class="flex items-center">
			<span>Notifications</span>
			<a href="/pro#pro" target="_blank" class="inline-flex items-center font-bold ml-2 px-2 py-0.5 text-xs rounded-sm bg-emerald-500 text-gray-700! no-underline! hover:bg-emerald-400">Pro</a>
		</div>

		<div class="flex items-center">
			<span>Webhook</span>
			<a href="/pro#pro-plus" target="_blank" class="inline-flex items-center font-bold ml-2 px-2 py-0.5 text-xs rounded-sm bg-emerald-500 text-gray-700! no-underline! hover:bg-emerald-400">Pro+</a>
		</div>
	</div>

	<div class="flex flex-col gap-3">
		<div class="flex flex-col lg:flex-row gap-3">
			{#if hostname}
				<a
					href={$link}
					target="_blank"
					rel="noreferrer"
					class="button is-full lg:basis-1/2 bs-12 py-2 px-3 text-center text-white border border-gray-700 bg-gray-700 hover:bg-gray-600 rounded-md transition duration-200 outline-none focus-visible:ring focus-visible:ring-green-800 focus-visible:ring-offset-2 active:scale-(0.99) text-sm"
				>
					Open Weblink
				</a>
			{:else}
				<div class="button is-full lg:basis-1/2 bs-12 py-2 px-3 text-center text-white border border-gray-700 bg-gray-700 opacity-50 cursor-not-allowed rounded-md text-sm">
					Open Weblink
				</div>
			{/if}

			<button
				class="is-full lg:basis-1/2 bs-12 py-2 px-3 text-center text-white border border-gray-700 bg-gray-700 hover:bg-gray-600 rounded-sm transition duration-200 outline-none focus-visible:ring focus-visible:ring-green-800 focus-visible:ring-offset-2 active:scale-(0.99) sm:text-sm"
				type="button"
				onclick={() => constructor.resetDesign()}
			>
				Clear PayPass Data
			</button>
		</div>

		<div class="is-full">
			<form
				method="POST"
				action="?/generatePass"
				use:enhance={formEnhance}
				class="w-full"
			>
				<input type="hidden" name="props" value={JSON.stringify($constructorStore.networks[hostname || 'ican'])} />
				<input type="hidden" name="design" value={JSON.stringify($constructorStore.design)} />
				<input type="hidden" name="hostname" value={hostname} />
				<input type="hidden" name="authority" value={authority} />
				<button
					class="w-full bs-12 py-2 px-3 text-center text-white border border-gray-700 bg-gray-700 hover:bg-gray-600 rounded-sm transition duration-200 outline-none focus-visible:ring focus-visible:ring-green-800 focus-visible:ring-offset-2 active:scale-(0.99) text-sm disabled:opacity-50 disabled:cursor-not-allowed"
					type="submit"
					disabled={!hostname || $isGenerating}
				>
					{$isGenerating ? 'Generating…' : 'Download Digital PayPass'}
				</button>
			</form>
			<p class="text-sm mt-2 text-gray-400 text-center">
				Load PayPass into your Google Wallet or Apple Wallet.
			</p>
		</div>
	</div>
</div>
