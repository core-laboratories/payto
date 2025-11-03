<script lang="ts">
	import {
		FieldGroup,
		FieldGroupColorPicker,
		FieldGroupLabel,
		FieldGroupText,
		FieldGroupAppendix,
		ListBox
	} from '$lib/components';
	import { ChevronDown, ChevronUp, Copy, ExternalLink, Eraser } from 'lucide-svelte';

	import { derived, get, writable } from 'svelte/store';
	import { constructor } from '$lib/store/constructor.store';
	import { calculateColorDistance } from '$lib/helpers/euclidean-distance.helper';
	import { generateWebLink, getWebLink } from '$lib/helpers/generate.helper';
	import { getAddress } from '$lib/helpers/get-address.helper';
	import { toast } from '$lib/components/toast';
	import { setLocaleFromPaytoData } from '$i18n';
	import { onMount } from 'svelte';

	export let hostname: ITransitionType | undefined = undefined;

	const barcodeTypes = [
		{ label: 'QR Code', value: 'qr', ticker: '' },
		{ label: 'PDF 417', value: 'pdf417', ticker: '' },
		{ label: 'Aztec', value: 'aztec', ticker: '' },
		{ label: 'Code 128', value: 'code128', ticker: '' },
		{ label: 'UPC-A', value: 'upca', ticker: 'Android only' },
		{ label: 'EAN-13', value: 'ean13', ticker: 'Android only' },
		{ label: 'Code 39', value: 'code39', ticker: 'Android only' }
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

	const enableDistanceCheck = writable(false);
	const distance = derived([constructorStore, enableDistanceCheck], ([$constructor, $enableDistanceCheck]) => {

		if (!$enableDistanceCheck) return;

		// Only calculate distance if both colors are provided
		const hasBothColors = $constructor.design.colorF && $constructor.design.colorB;
		if (!hasBothColors) return;

		return Math.floor(
			calculateColorDistance($constructor.design.colorF!, $constructor.design.colorB!)
		);
	});

	const barcodeValue = derived(constructorStore, $constructor => $constructor.design.barcode ?? 'qr');
	const passMode = derived(constructorStore, $constructor => $constructor.design.mode ?? 'auto');
	const address = derived(constructorStore, $constructor =>
		hostname ? getAddress($constructor.networks[hostname], hostname) : undefined
	);
	const isGenerating = writable(false);
	const userOS = writable<'ios' | 'android' | 'unknown'>('unknown');

	$: showApple = $userOS === 'ios' || $userOS === 'unknown';
	$: showGoogle = $userOS === 'android' || $userOS === 'unknown';

	const GENERATION_TIMEOUT = 30000; // 30 seconds timeout

	onMount(() => {
		const userAgent = navigator.userAgent.toLowerCase();
		if (/iphone|ipad|ipod/.test(userAgent)) {
			userOS.set('ios');
		} else if (/android/.test(userAgent)) {
			userOS.set('android');
		}
	});

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

	async function downloadPass(osOverride?: 'ios' | 'android') {
		if (!hostname) {
			toast({ message: 'No hostname selected', type: 'error' });
			return;
		}

		isGenerating.set(true);
		const timeoutId = setTimeout(() => {
			isGenerating.set(false);
			toast({ message: 'Generation timed out. Please try again.', type: 'error' });
		}, GENERATION_TIMEOUT);

		try {
			const formData = new FormData();
			formData.append('hostname', hostname);
			formData.append('props', JSON.stringify($constructorStore.networks[hostname]));
			formData.append('design', JSON.stringify($constructorStore.design));
			const selectedOs = osOverride ?? get(userOS);
			formData.append('os', selectedOs);

			const response = await fetch('/pass', {
				method: 'POST',
				body: formData
			});

			clearTimeout(timeoutId);
			isGenerating.set(false);

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({ message: response.statusText }));
				toast({ message: errorData.message || 'Failed to generate pass', type: 'error' });
				return;
			}

			// Android returns JSON with saveUrl; iOS returns pkpass blob
			if (selectedOs === 'android') {
				const data = await response.json().catch(() => null);
				if (data && data.saveUrl) {
					window.open(data.saveUrl, '_blank', 'noopener');
					toast({ message: 'Opening Google Wallet…', type: 'success' });
					return;
				}
				toast({ message: 'Failed to get Google Wallet link', type: 'error' });
				return;
			}

			const blob = await response.blob();
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.click();
			toast({ message: 'Pass downloaded successfully', type: 'success' });
			URL.revokeObjectURL(url);
		} catch (error) {
			clearTimeout(timeoutId);
			isGenerating.set(false);
			const errorMessage = error instanceof Error ? error.message : String(error);
			toast({ message: errorMessage, type: 'error' });
		}
	}

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

	function normalizeAddress(addr: string | undefined, host: string | undefined): string {
		if (!addr) return '';
		const cleanAddr = addr.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
		if (host === 'ican' && cleanAddr.length > 8) {
			return `${cleanAddr.slice(0, 4)}${cleanAddr.slice(-4)}`;
		}
		return cleanAddr;
	}

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
					label="Background Color"
					bind:value={$constructor.design.colorB}
				/>
			</FieldGroup>

			<FieldGroup>
				<div class="flex items-center">
					<input
						type="checkbox"
						bind:checked={$enableDistanceCheck}
						id="distanceCheckbox"
					/>
					<label for="distanceCheckbox" class="ml-2 text-sm">Define foreground color</label>
				</div>
			</FieldGroup>

			{#if $enableDistanceCheck}

				<FieldGroup flexType="row" itemPosition="items-center">
					<FieldGroupColorPicker
						label="Foreground Color"
						bind:value={$constructor.design.colorF}
					/>
				</FieldGroup>

				<div>
					Current Color Euclidean distance:
					<span class:text-red-500={$distance && $distance < 100}>{$distance}</span>
					<p class="-mb-1 text-gray-400 text-sm">
						Minimum Euclidean distance of 100 is required.
					</p>
				</div>
			{/if}

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
						class="button flex-1 bs-12 py-2 px-3 text-center text-white border border-gray-700 bg-gray-700 hover:bg-gray-600 rounded-lg transition duration-200 outline-none focus-visible:ring focus-visible:ring-green-800 focus-visible:ring-offset-2 active:scale-(0.99) text-sm flex items-center justify-center gap-2"
					>
						<ExternalLink class="w-4 h-4 flex-shrink-0" />
						Open Weblink
					</a>
				</div>
			{:else}
				<div class="button is-full lg:basis-1/2 bs-12 py-2 px-3 text-center text-white border border-gray-700 bg-gray-700 opacity-50 cursor-not-allowed rounded-lg text-sm flex items-center justify-center gap-2">
					<ExternalLink class="w-4 h-4 flex-shrink-0" />
					Open Weblink
				</div>
			{/if}

			<button
				class="is-full lg:basis-1/2 bs-12 py-2 px-3 text-center text-white border border-gray-700 bg-gray-700 hover:bg-gray-600 rounded-lg transition duration-200 outline-none focus-visible:ring focus-visible:ring-green-800 focus-visible:ring-offset-2 active:scale-(0.99) sm:text-sm flex items-center justify-center gap-2"
				type="button"
				onclick={() => {
					constructor.resetDesign();
					setLocaleFromPaytoData('en');
				}}
			>
				<Eraser class="w-4 h-4 flex-shrink-0" />
				Clear PayPass Data
			</button>
		</div>

		<div class="is-full">
			<div class="flex flex-col sm:flex-row gap-3 justify-center items-center mb-4">
				<!-- Apple Wallet Button -->
				{#if showApple}
					<button
						class="w-full sm:w-1/2 py-2 px-3 text-center text-white border border-gray-700 bg-gray-700 hover:bg-gray-600 rounded-lg transition duration-200 outline-none focus-visible:ring focus-visible:ring-green-800 focus-visible:ring-offset-2 active:scale-(0.99) disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-4"
						type="button"
                        onclick={() => downloadPass('ios')}
						disabled={!hostname || $isGenerating}
					>
						<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xml:space="preserve" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:2" viewBox="0 0 48 36" class="h-6 flex-shrink-0"><g transform="matrix(1.85185 0 0 1.875 -13.778 -13.95)"><clipPath id="a"><path d="M33.265 10.691v12.628l-.001.381a17.18 17.18 0 0 1-.005.321c-.006.233-.02.468-.061.698a2.355 2.355 0 0 1-.219.664 2.26 2.26 0 0 1-1.64 1.195c-.23.041-.465.055-.698.061a17.18 17.18 0 0 1-.321.005l-.381.001-1.459-.001 1.358.001H10.984l1.358-.001-1.459.001-.381-.001a17.18 17.18 0 0 1-.321-.005 4.665 4.665 0 0 1-.698-.061 2.366 2.366 0 0 1-.664-.219 2.26 2.26 0 0 1-1.195-1.64 4.665 4.665 0 0 1-.061-.698 17.18 17.18 0 0 1-.005-.321l-.001-.381v-12.42 1.25-1.459l.001-.381c.001-.107.002-.214.005-.321.006-.233.02-.468.061-.698.042-.234.111-.452.219-.664a2.244 2.244 0 0 1 .977-.975c.212-.108.43-.177.664-.219.23-.041.465-.055.698-.061.107-.003.214-.004.321-.005l.381-.001h19.055l.381.001c.107.001.214.002.321.005.233.006.468.02.698.061.234.042.451.111.664.219a2.26 2.26 0 0 1 1.195 1.64c.041.23.055.465.061.698.003.107.004.214.005.321l.001.381Z"/></clipPath><g clip-path="url(#a)"><path d="M8.351 8.168h24.1v16.781h-24.1z" style="fill:#dedbce"/><path d="M8.629 8.436h23.565v9.997H8.629z" style="fill:#40a5d9"/><use xlink:href="#b" width="117" height="58" transform="matrix(.22359 0 0 .21517 7.44 9.075)"/><path d="M32.193 20.575v-8.129l-.003-.204a2.988 2.988 0 0 0-.039-.443 1.499 1.499 0 0 0-.139-.421 1.424 1.424 0 0 0-1.041-.759 2.988 2.988 0 0 0-.443-.039 6.939 6.939 0 0 0-.204-.003H10.497l-.204.003a2.988 2.988 0 0 0-.443.039c-.148.027-.286.07-.421.139a1.424 1.424 0 0 0-.759 1.041 2.988 2.988 0 0 0-.039.443 6.939 6.939 0 0 0-.003.204v1.167-.727 7.689h23.565Z" style="fill:#ffb003"/><use xlink:href="#c" width="117" height="54" transform="matrix(.22359 0 0 .23111 7.44 11.235)"/><path d="M32.193 22.717v-8.129l-.003-.204a2.988 2.988 0 0 0-.039-.443 1.499 1.499 0 0 0-.139-.421 1.424 1.424 0 0 0-1.041-.759 2.988 2.988 0 0 0-.443-.039 6.939 6.939 0 0 0-.204-.003H10.497l-.204.003a2.988 2.988 0 0 0-.443.039c-.148.027-.286.07-.421.139a1.424 1.424 0 0 0-.759 1.041 2.988 2.988 0 0 0-.039.443 6.939 6.939 0 0 0-.003.204v1.167-.727 7.689h23.565Z" style="fill:#40c740"/><use xlink:href="#d" width="117" height="54" transform="matrix(.22359 0 0 .23111 7.44 13.395)"/><path d="M32.193 24.859V16.73l-.003-.204a2.988 2.988 0 0 0-.039-.443 1.499 1.499 0 0 0-.139-.421 1.424 1.424 0 0 0-1.041-.759 2.988 2.988 0 0 0-.443-.039 6.939 6.939 0 0 0-.204-.003H10.497l-.204.003a2.988 2.988 0 0 0-.443.039c-.148.027-.286.07-.421.139a1.424 1.424 0 0 0-.759 1.041 2.988 2.988 0 0 0-.039.443 6.939 6.939 0 0 0-.003.204v1.167-.727 7.689h23.565Z" style="fill:#f26d5f"/><path d="M7.201 7.008v11.068h1.428v-7.772l.003-.204c.004-.148.013-.297.039-.443.027-.148.07-.286.139-.421a1.424 1.424 0 0 1 1.04-.757c.146-.026.295-.035.443-.039l.204-.003h19.829l.204.003c.148.004.297.013.443.039.148.027.286.07.421.139a1.424 1.424 0 0 1 .759 1.041c.026.146.035.295.039.443l.003.204v7.772h1.428V7.008H7.201Z" style="fill:#d9d6cc"/><use xlink:href="#e" width="125" height="54" transform="matrix(.23232 0 0 .23111 6 15.555)"/><path d="m26.985 17.005-.46.001c-.129.001-.258.002-.387.006a5.678 5.678 0 0 0-.843.074 2.866 2.866 0 0 0-.801.264c-.033.017-.738.337-1.372 1.323-.481.749-1.417 1.543-2.728 1.543-1.31 0-2.246-.794-2.728-1.543-.667-1.039-1.428-1.351-1.373-1.323a2.803 2.803 0 0 0-.801-.264 5.547 5.547 0 0 0-.843-.074 24.97 24.97 0 0 0-.387-.006l-.46-.001h-6.6v9.997h26.421v-9.997h-6.638Z" style="fill:#dedbce"/></g></g></svg>
						<span class="flex items-start flex-col gap-1 leading-none">
							<span class="text-sm text-gray-300">Add PayPass to</span>
							<span class="font-medium text-white">Apple Wallet</span>
						</span>
					</button>
				{/if}

				<!-- Google Wallet Button -->
				{#if showGoogle}
					<button
						class="w-full sm:w-1/2 py-2 px-3 text-center text-white border border-gray-700 bg-gray-700 hover:bg-gray-600 rounded-lg transition duration-200 outline-none focus-visible:ring focus-visible:ring-green-800 focus-visible:ring-offset-2 active:scale-(0.99) disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-4"
						type="button"
                        onclick={() => downloadPass('android')}
						disabled={!hostname || $isGenerating}
					>
						<svg xmlns="http://www.w3.org/2000/svg" xml:space="preserve" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:2" viewBox="0 0 43 36" class="h-6 flex-shrink-0"><path d="M57 23.791H21v-5.646c0-3.064 2.642-5.645 5.78-5.645h24.44c3.138 0 5.78 2.581 5.78 5.645v5.646Z" style="fill:#34a853;fill-rule:nonzero" transform="translate(-25.083 -14.93) scale(1.19444)"/><path d="M57 29H21v-6c0-3.257 2.642-6 5.78-6h24.44c3.138 0 5.78 2.743 5.78 6v6Z" style="fill:#fbbc04;fill-rule:nonzero" transform="translate(-25.083 -14.93) scale(1.19444)"/><path d="M57 34H21v-6c0-3.257 2.642-6 5.78-6h24.44c3.138 0 5.78 2.743 5.78 6v6Z" style="fill:#ea4335;fill-rule:nonzero" transform="translate(-25.083 -14.93) scale(1.19444)"/><path d="m21 25.241 22.849 5.161c2.631.645 5.589 0 7.726-1.613L57 24.918v12.097c0 3.065-2.63 5.485-5.753 5.485H26.753C23.63 42.5 21 40.08 21 37.015V25.241Z" style="fill:#4285f4;fill-rule:nonzero" transform="translate(-25.083 -14.93) scale(1.19444)"/></svg>
						<span class="flex items-start flex-col gap-1 leading-none">
							<span class="text-sm text-gray-300">Add PayPass to</span>
							<span class="font-medium text-white">Google Wallet</span>
						</span>
					</button>
				{/if}
			</div>
		</div>
	</div>
</div>
