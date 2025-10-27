<script lang="ts">
	import {
		FieldGroup,
		FieldGroupColorPicker,
		FieldGroupLabel,
		FieldGroupText,
		FieldGroupAppendix,
		ListBox
	} from '$lib/components';
	import { ChevronDown, ChevronUp, Copy, Download } from 'lucide-svelte';

	import { derived, get, writable } from 'svelte/store';
	import { constructor } from '$lib/store/constructor.store';
	import { calculateColorDistance } from '$lib/helpers/euclidean-distance.helper';
	import { enhance } from '$app/forms';
	import { generateWebLink, getWebLink } from '$lib/helpers/generate.helper';
	import { getAddress } from '$lib/helpers/get-address.helper';
	import { toast } from '$lib/components/toast';
	import { setLocaleFromPaytoData } from '$i18n';

	export let hostname: ITransitionType | undefined = undefined;

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

	const languageOptions = [
		{ label: 'Application Language (or English)', value: ''},
		{ label: 'Arabic', value: 'ar', rtl: true},
		{ label: 'Chinese', value: 'zh-CN'},
		{ label: 'Czech', value: 'cs-CZ'},
		{ label: 'English', value: 'en'},
		{ label: 'French', value: 'fr'},
		{ label: 'German', value: 'de'},
		{ label: 'Hindi', value: 'hi-IN'},
		{ label: 'Hungarian', value: 'hu'},
		{ label: 'Italian', value: 'it'},
		{ label: 'Japanese', value: 'ja'},
		{ label: 'Korean', value: 'ko-KR'},
		{ label: 'Persian', value: 'fa-IR', rtl: true},
		{ label: 'Polish', value: 'pl'},
		{ label: 'Portuguese (Brazil)', value: 'pt-BR'},
		{ label: 'Russian', value: 'ru'},
		{ label: 'Slovak', value: 'sk'},
		{ label: 'Spanish', value: 'es'},
		{ label: 'Tagalog', value: 'tl-PH' },
		{ label: 'Thai', value: 'th'},
		{ label: 'Turkish', value: 'tr'},
		{ label: 'Vietnamese', value: 'vi-VN'}
	];

	const constructorStore = derived(constructor, $c => $c);

	// Default to empty string for "Application Language (or English)" option
	const currentLanguageValue = derived(constructorStore, ($constructor) => $constructor.design.lang || '');

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

		return async ({ result, update }: { result: any; update: any }) => {
			clearTimeout(timeoutId);
			isGenerating.set(false);

			// Handle different result formats
			if (result.type === 'error') {
				// Extract error message from different possible formats
				let errorMessage = 'Failed to generate pass';
				if (result.error) {
					if (typeof result.error === 'string') {
						errorMessage = result.error;
					} else if (result.error.body?.message) {
						errorMessage = result.error.body.message;
					} else if (result.error.message) {
						errorMessage = result.error.message;
					}
				}
				toast({ message: errorMessage, type: 'error' });
				return;
			}

			// Handle case where result might not have type property (500 error, etc.)
			if (result.message && !result.type) {
				toast({ message: result.message, type: 'error' });
				return;
			}

			if (result.type === 'success' && result.data instanceof Blob) {
				try {
					const url = URL.createObjectURL(result.data);
					const a = document.createElement('a');
					a.href = url;
					document.body.appendChild(a);
					a.click();
					toast({ message: 'Pass downloaded successfully', type: 'success' });
					document.body.removeChild(a);
					URL.revokeObjectURL(url);
				} catch (error) {
					const errorMessage = error instanceof Error ? error.message : String(error);
					toast({ message: errorMessage, type: 'error' });
				}
			} else {
				toast({ message: 'Invalid response format', type: 'error' });
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

	async function copyToClipboard() {
		try {
			await navigator.clipboard.writeText($link);
			toast({ message: 'Link copied to clipboard', type: 'success' });
		} catch (err) {
			toast({ message: 'Failed to copy link', type: 'error' });
		}
	}
</script>

<div class="flex flex-col gap-6">
	<FieldGroup>
		<FieldGroupLabel>Item Title</FieldGroupLabel>
		<FieldGroupText
			placeholder="e.g. Coffee ☕; Table №3"
			bind:value={$constructor.design.item}
			maxlength="40"
		/>
	</FieldGroup>

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
			<FieldGroup>
				<FieldGroupLabel>
					Organization Name / ORIC
				</FieldGroupLabel>
				<FieldGroupText
					placeholder="e.g. PINGCHB2"
					bind:value={$constructor.design.org}
					maxlength="25"
				/>
				<FieldGroupAppendix>If organization has ORIC and matches receiving address, it will be marked as verified.</FieldGroupAppendix>
			</FieldGroup>

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
					label="Background Color (Online Payment)"
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
				<FieldGroupLabel>Language</FieldGroupLabel>
				<ListBox
					id="language-list"
					value={$currentLanguageValue}
					items={languageOptions}
					onChange={(val) => {
						const selectedValue = String(val) || '';
						const selectedLanguage = languageOptions.find(lang => lang.value === selectedValue);
						const isRtl = selectedLanguage?.rtl || false;

						constructor.update(c => ({
							...c,
							design: { ...c.design, lang: selectedValue, rtl: isRtl }
						}));
						setLocaleFromPaytoData(selectedValue || 'en');
					}}
				/>
			</FieldGroup>

			<FieldGroup>
				<div class="flex items-center">
					<input
						type="checkbox"
						bind:checked={$constructor.design.rtl}
						id="rtlCheckbox"
					/>
					<label for="rtlCheckbox" class="ml-2 text-sm">Right-to-Left typing (RTL)</label>
				</div>
			</FieldGroup>

			<FieldGroup>
				<FieldGroupLabel>Barcode Type for Wallets</FieldGroupLabel>
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
		<div class="flex flex-col lg:flex-row gap-3">
			{#if hostname}
				<div class="flex gap-3 lg:basis-1/2">
					<button
						type="button"
						onclick={copyToClipboard}
						class="bs-12 px-3 text-white border border-gray-700 bg-gray-700 hover:bg-gray-600 rounded-md transition duration-200 outline-none focus-visible:ring focus-visible:ring-green-800 focus-visible:ring-offset-2 active:scale-(0.99)"
						aria-label="Copy link to clipboard"
					>
						<Copy class="w-5 h-5" />
					</button>
					<a
						href={$link}
						target="_blank"
						rel="noreferrer"
						class="button flex-1 bs-12 py-2 px-3 text-center text-white border border-gray-700 bg-gray-700 hover:bg-gray-600 rounded-md transition duration-200 outline-none focus-visible:ring focus-visible:ring-green-800 focus-visible:ring-offset-2 active:scale-(0.99) text-sm"
					>
						Open Weblink
					</a>
				</div>
			{:else}
				<div class="button is-full lg:basis-1/2 bs-12 py-2 px-3 text-center text-white border border-gray-700 bg-gray-700 opacity-50 cursor-not-allowed rounded-md text-sm">
					Open Weblink
				</div>
			{/if}

			<button
				class="is-full lg:basis-1/2 bs-12 py-2 px-3 text-center text-white border border-gray-700 bg-gray-700 hover:bg-gray-600 rounded-sm transition duration-200 outline-none focus-visible:ring focus-visible:ring-green-800 focus-visible:ring-offset-2 active:scale-(0.99) sm:text-sm"
				type="button"
				onclick={() => {
					constructor.resetDesign();
					setLocaleFromPaytoData('en');
				}}
			>
				Clear PayPass Data
			</button>
		</div>

		<div class="is-full">
			<form
				method="POST"
				action="/pass"
				use:enhance={formEnhance}
				class="w-full"
			>
				<input type="hidden" name="hostname" value={hostname || 'ican'} />
				<input type="hidden" name="props" value={JSON.stringify($constructorStore.networks[hostname || 'ican'])} />
				<input type="hidden" name="design" value={JSON.stringify($constructorStore.design)} />
				<button
					class="w-full bs-12 py-2 px-3 text-center text-white border border-gray-700 bg-gray-700 hover:bg-gray-600 rounded-sm transition duration-200 outline-none focus-visible:ring focus-visible:ring-green-800 focus-visible:ring-offset-2 active:scale-(0.99) text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
					type="submit"
					disabled={!hostname || $isGenerating}
				>
					{#if !$isGenerating}
						<Download class="w-4 h-4" />
					{/if}
					{$isGenerating ? 'Generating…' : 'Download PayPass'}
				</button>
			</form>
			<p class="text-sm mt-2 text-gray-400 text-center">
				Load PayPass into your Apple or Google Wallet.
			</p>
		</div>
	</div>
</div>
