<script lang="ts">
	import {
		FieldGroup,
		FieldGroupColorPicker,
		FieldGroupLabel,
		FieldGroupText,
		ListBox
	} from '$lib/components';

	import { derived, get, writable } from 'svelte/store';
	import { constructor } from '$lib/store/constructor.store';
	import { calculateColorDistance } from '$lib/helpers/euclidean-distance.helper';
	import { enhance } from '$app/forms';
	import { generateWebLink, getWebLink } from '$lib/helpers/generate.helper';
	import { getAddress } from '$lib/helpers/get-address.helper';
	import { toast } from '$lib/components/toast';

	import { env } from '$env/dynamic/public';

	export let hostname: ITransitionType | undefined = undefined;
	export let authority: string | undefined = undefined;

	const barcodeTypes = [
		{ label: 'QR Code', value: 'qr', ticker: 'QR' },
		{ label: 'PDF 417', value: 'pdf417', ticker: 'PDF' },
		{ label: 'Aztec', value: 'aztec', ticker: 'Aztec' },
		{ label: 'Code 128', value: 'code128', ticker: 'Code 128' }
	];

	const constructorStore = derived(constructor, $c => $c);

	const distance = derived(constructorStore, $constructor =>
		Math.floor(
			calculateColorDistance($constructor.design.colorF || '#192a14', $constructor.design.colorB || '#77bc65')
		)
	);

	const barcodeValue = derived(constructorStore, $constructor => $constructor.design.barcode ?? 'qr');
	const address = derived(constructorStore, $constructor =>
		hostname ? getAddress($constructor.networks[hostname], hostname) : undefined
	);
	const isGenerating = writable(false);

	const GENERATION_TIMEOUT = 30000; // 30 seconds timeout

	// Add validation state stores
	const emailValid = writable(true);
	const telegramValid = writable(true);

	// Validation functions
	function validateEmail(email: string | undefined): boolean {
		if (!email) return true; // Empty is valid (optional field)
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		return emailRegex.test(email);
	}

	function validateTelegram(username: string | undefined): boolean {
		if (!username) return true; // Empty is valid (optional field)
		const telegramRegex = /^[a-zA-Z][a-zA-Z0-9_.]{4,31}$/;
		return telegramRegex.test(username);
	}

	function updateBarcode(value: string | number) {
		constructor.update(c => ({
			...c,
			design: { ...c.design, barcode: String(value) }
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
</script>

<div class="flex flex-col gap-6">
	{#if !authority}
		<FieldGroup>
			<FieldGroupLabel>Organization Name</FieldGroupLabel>
			<FieldGroupText
				placeholder="PayTo"
				bind:value={$constructor.design.org}
				maxlength="25"
			/>
		</FieldGroup>
	{/if}

	<FieldGroup>
		<FieldGroupLabel>Item Name</FieldGroupLabel>
		<FieldGroupText
			placeholder="Payment for…"
			bind:value={$constructor.design.item}
			maxlength="40"
		/>
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
			label="Background Color"
			bind:value={$constructor.design.colorB}
		/>
	</FieldGroup>

	<div>
		Current Color Euclidean distance:
		<span class:text-red-500={$distance < 100}>{$distance}</span>
		<p class="-mb-1 text-gray-400 text-sm">
			Note: Colors that are similar will not be accepted; a minimum Euclidean distance of 100 is required.
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
		<FieldGroupLabel>Barcode Type for downloaded pass</FieldGroupLabel>
		<ListBox
			id="barcode-list"
			value={$barcodeValue}
			onChange={updateBarcode}
			items={barcodeTypes}
		/>
	</FieldGroup>

	<div class="flex flex-col gap-6">
		<h2 class="text-lg font-bold flex items-center">
			Notifications
			<a href="/pro" target="_blank" class="inline-flex items-center ml-2 px-2 py-0.5 text-xs rounded-sm bg-emerald-500 text-gray-700! no-underline! hover:bg-emerald-400">Pro</a>
		</h2>

		<FieldGroup>
			<div class="flex items-center">
				<input
					type="checkbox"
					bind:checked={$constructor.design.isEmail}
					id="emailCheckbox"
					onchange={() => {
						if (!$constructor.design.isEmail) {
							$constructor.design.email = undefined;
						}
					}}
				/>
				<label for="emailCheckbox" class="ml-2">Email Notification</label>
			</div>

			{#if $constructor.design.isEmail}
				<FieldGroupText
					placeholder="e.g. user@onion.email"
					bind:value={$constructor.design.email}
					type="email"
					oninput={(e: Event) => {
						const input = e.target as HTMLInputElement;
						const isValid = validateEmail(input.value);
						emailValid.set(isValid);

						if (isValid) {
							constructor.update(c => ({
								...c,
								design: { ...c.design, email: input.value }
							}));
						}
					}}
				/>
				{#if !$emailValid}
					<p class="text-rose-500 text-sm mt-1">Please enter a valid email address</p>
				{/if}
			{/if}
		</FieldGroup>

		<FieldGroup>
			<div class="flex items-center">
				<input
					type="checkbox"
					bind:checked={$constructor.design.isTelegram}
					id="telegramCheckbox"
					onchange={() => {
						if (!$constructor.design.isTelegram) {
							$constructor.design.telegram = undefined;
						}
					}}
				/>
				<label for="telegramCheckbox" class="ml-2">Telegram Notification</label>
			</div>

			{#if $constructor.design.isTelegram}
				<div class="flex items-center">
					<span class="mr-2 text-white font-bold">@</span>
					<FieldGroupText
						placeholder="username"
						bind:value={$constructor.design.telegram}
						oninput={(e: Event) => {
							const input = e.target as HTMLInputElement;
							if (input.value.startsWith('@')) {
								input.value = input.value.substring(1);
							}

							const isValid = validateTelegram(input.value);
							telegramValid.set(isValid);

							if (isValid) {
								constructor.update(c => ({
									...c,
									design: { ...c.design, telegram: input.value }
								}));
							}
						}}
					/>
				</div>
				{#if env.PUBLIC_TG_BOT_NAME}
					<p class="text-sm mt-1">
						<a href={`https://t.me/${env.PUBLIC_TG_BOT_NAME}`} target="_blank" rel="noopener" class="text-blue-500 hover:text-blue-600">Initialize Telegram bot (required for notifications).</a>
					</p>
				{/if}
				{#if !$telegramValid}
					<p class="text-rose-500 text-sm mt-1">Username must be valid Telegram username</p>
				{/if}
			{/if}
		</FieldGroup>
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
					{$isGenerating ? 'Generating…' : 'Download PayPass'}
				</button>
			</form>
		</div>
	</div>
</div>
