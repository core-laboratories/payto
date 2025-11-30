<script lang="ts">
	import "../../css/app.css";
	import {
		Row, Box, BoxContent, BoxTitle, Page, Tabs, Toast, WalletCard, DesignContent
	} from '$lib/components';

	import { TYPES } from '$lib/data/types.data';
	import { getObjectByType } from '$lib/helpers/get-object-by-type.helper';
	import { Icon } from '$lib/icons';
	import { constructor } from '$lib/store/constructor.store';
	import { derived, get, writable } from 'svelte/store';
	import { toast } from '$lib/components/toast';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { ChevronUp, ChevronDown, Copy, Sticker } from 'lucide-svelte';

	interface ILink {
		href: string;
		label: string;
	}

	function isObject(value: any): value is ILink[] {
		return Array.isArray(value) && value.length > 0 && typeof value[0] === 'object' && 'href' in value[0];
	}

	let type = writable<ITransitionType>('ican');
	let designEnabled = writable(false);
	let currentSentence = writable('');
	let currentLink = writable<string | ILink[]>([]);
	let currentShow = writable(false);
	let authority = writable('');
	let showInfoBox = $state(false);
	const purpose = writable("pay");
	const urlAuthority: string | undefined = page.data.authority;

	if (urlAuthority && urlAuthority.length < 10 && /^[a-z0-9]{3,}$/.test(urlAuthority)) {
		authority.set(urlAuthority);
	}

	onMount(() => {
		const passEnabled = page.url.searchParams.get('pass');
		if (passEnabled === '1') {
			designEnabled.set(true)
		}
		const purposeType = page.url.searchParams.get('purpose');
		if (purposeType && purposeType === 'donate') {
			purpose.set('donate');
		} else if (purposeType && purposeType === 'pay') {
			purpose.set('pay');
		}
	})

	const outputs = derived(
		[type, constructor, purpose],
		([$type, $constructor, $purpose]) => {
			const result = get(constructor.build($type));

			const outputLinks = result.filter(link => {
				if ($purpose === 'donate') {
					return !link.type?.includes('payment');
				}

				return !link.type?.includes('donation');
			});

			return Array.isArray(outputLinks) ? outputLinks : [];
		}
	);

	$effect(() => {
		const currentName = getObjectByType(TYPES, $type)?.label;

		const currentDonationValue = $constructor.networks[$type].params.donate?.value;
		const newDonationValue = $purpose === 'donate' ? 1 : undefined;

		if (currentDonationValue !== newDonationValue) {
			$constructor.networks[$type].params.donate = { value: newDonationValue };
		}

		if (currentName) {
			currentSentence.set(`What is ${currentName}?`);
			currentLink.set(getObjectByType(TYPES, $type)?.link || '');
			currentShow.set(true);
		}
	});

	const handleOnCopy = async (ev: Event) => {
		const value = (ev.currentTarget as HTMLButtonElement).dataset.value!;
		await window.navigator.clipboard.writeText(value);

		toast({
			message: 'Copied to clipboard',
			type: 'success'
		});
	};

	const resetConstructor = (type: ITransitionType) => {
		constructor.reset(type);
	};
</script>

<Toast />

<Page classValue="space-y-6 lg:space-y-8">
	<Row classValue="lg:flex-row gap-4">
		<Box classValue="sm:min-w-[480px] lg:basis-[calc(50%-2.5rem)]">
			<a id="constructor" aria-hidden="true" aria-label="Constructor"></a>
			<BoxTitle>
				Payment Constructor
			</BoxTitle>
			<BoxContent>
				<Tabs bind:selectedTab={$type} />
				<button
					class="is-full bs-12 mt-auto py-2 px-3 text-center text-white border border-gray-700 bg-gray-700 rounded-sm transition duration-200 outline-none focus-visible:ring-4 focus-visible:ring-opacity-75 focus-visible:ring-green-800 focus-visible:ring-offset-green-700 focus-visible:ring-offset-2 active:scale-(0.99) text-sm"
					type="button"
					onclick={() => resetConstructor($type)}
				>
					Clear
				</button>
			</BoxContent>
		</Box>

		<Icon.Convert classValue="w-10 h-10 self-center text-green-500 rotate-90 lg:block lg:rotate-0" />

		<Box classValue="sm:min-w-[480px] lg:basis-[calc(50%-2.5rem)]">
			<a id="integrations" aria-hidden="true" aria-label="Integrations"></a>
			<BoxTitle>Integrations</BoxTitle>
			<BoxContent>
				<div class="flex flex-row gap-3">
					<span class="font-bold">Purpose:</span>
					<div class="flex items-center gap-2">
						<input
							type="radio"
							name="purpose"
							value="pay"
							id="payment_purpose"
							bind:group={$purpose}
						/>
						<label for="payment_purpose">Payment</label>
					</div>
					<div class="flex items-center gap-2">
						<input
							type="radio"
							name="purpose"
							value="donate"
							id="donation_purpose"
							bind:group={$purpose}
						/>
						<label for="donation_purpose">Donation</label>
					</div>
				</div>
				<div class="flex flex-col gap-6">
					{#each $outputs as output, index}
						{#if output.length && output.length > 2000}
							<div class="self-start max-w-screen-sm px-4 py-3 my-3 text-sm border rounded border-amber-700 bg-amber-900/50 text-amber-200" role="alert">
								<h3 class="mb-1 font-semibold">Warning: Link too long</h3>
								<p>PayTo link exceeds 2000 characters. Some browsers and servers may not support these lengthy links. Consider shortening your parameters.</p>
							</div>
						{/if}
						<div class="flex flex-col gap-2">
							<label for={`item_${index}`}>{output.label}</label>
							<div
								class="flex items-center justify-between relative w-full bs-12 text-start bg-gray-900 rounded-sm border-none text-sm"
							>
								<input
									class="appearance-none bg-transparent rounded-md border-0 w-full p-3 pe-12 caret-teal-500 focus:outline-none focus-visible:ring-4 focus-visible:ring-opacity-75 focus-visible:ring-green-800 focus-visible:ring-offset-green-700 focus-visible:ring-offset-2"
									type="text"
									value={output.value}
									readonly
									id={`item_${index}`}
									aria-labelledby={`item_${index}`}
									onclick={(e) => e.currentTarget.select()}
								/>
								<button
									class="flex items-center justify-between absolute end-0 me-2 p-2 text-gray-50 bg-gray-700 hover:bg-gray-600 rounded-full outline-none transition duration-200 focus-visible:bg-green-900 focus-visible:text-green-50 active:scale-(0.95) !cursor-copy"
									type="button"
									title="Copy to clipboard"
									aria-label="Copy to clipboard"
									data-value={output.value}
									onclick={handleOnCopy}
								>
									<Copy class="w-4 h-4" />
								</button>
							</div>

							{#if output.previewable}
								<div class="flex flex-col items-stretch gap-2">
									<label class="text-gray-300 text-sm" for={'previewOf' + index}>
										Preview
									</label>
									<output id={'previewOf' + index}>{@html output.value}</output>
								</div>
							{/if}

							{#if output.note}
								<div class="flex flex-col items-stretch gap-2">
									<small class="text-gray-400" id={'noteOf' + index}>
										{output.note}
									</small>
								</div>
							{/if}
						</div>
					{/each}
					<div class="flex flex-col gap-2">
						<a href="/stickers/payto-stickers.pdf" download class="font-semibold text-sm text-gray-400 hover:text-gray-300 flex items-center gap-2"><Sticker class="w-4 h-4" />Download PayTo Stickers</a>
					</div>
				</div>
			</BoxContent>
		</Box>
	</Row>
	<Row>
		<a id="pass" aria-hidden="true" aria-label="PayPass"></a>
		<Box>
			<BoxTitle>
				<div class="relative flex items-center w-full">
					<input
						type="checkbox"
						bind:checked={$designEnabled}
						id="designCheckbox"
						class="relative left-30 lg:left-36"
					/>
					<label for="designCheckbox" class="flex-1 cursor-pointer relative -left-4">PayPass</label>
				</div>
			</BoxTitle>
			<BoxContent>
				{#if $designEnabled}
					<div class="flex flex-col gap-x-6 gap-y-4 md:flex-row md:flex-nowrap">
						<div class="w-full md:w-[400px] flex-shrink-0">
							<div class="flex flex-col gap-1 text-center mb-2">
								<h1 class="text-white text-xl font-bold">Online Pass preview</h1>
								<p class="text-gray-400 text-sm">Online and digital passes look and work differently.</p>
							</div>
							<WalletCard
								bind:hostname={$type}
							/>
							<div class="flex flex-col mt-4 gap-4">
								<div class="w-full px-4 py-3 text-sm border rounded border-gray-700 bg-gray-800 text-gray-300 flex flex-col gap-2" role="alert">
									<div class="flex items-center justify-between">
										<p class="m-0">
											{#if $authority}
												Issuing authority ORIC: <span class="font-bold">{$authority.toUpperCase()}</span>
											{:else}
												Default issued by <span class="font-bold">PayTo</span>
											{/if}
										</p>
										<a href="/pro#org" target="_blank" class="font-semibold ml-2 px-2 py-0.5 text-xs rounded-sm bg-emerald-500 text-gray-700! no-underline! hover:bg-emerald-400">Organization</a>
									</div>
								</div>
								<div class="flex items-center gap-4">
									<div>
										<a href="/pro#pro" target="_blank" class="font-semibold mr-2 px-2 py-0.5 text-xs rounded-sm bg-emerald-500 text-gray-700! no-underline! hover:bg-emerald-400">Pro</a>
										<span>Notifications</span>
									</div>
									<div>
										<a href="/pro#plus" target="_blank" class="font-semibold mr-2 px-2 py-0.5 text-xs rounded-sm bg-emerald-500 text-gray-700! no-underline! hover:bg-emerald-400">Pro+</a>
										<span>Fiat</span>
									</div>
								</div>
								<a href="/pro" target="_blank" rel="noreferrer" class="button is-full bs-12 py-2 px-3 text-center !text-white italic border border-gray-700 bg-gray-700 rounded-md text-sm hover:opacity-100 transition duration-200 font-bold">
									Get <span class="text-green-300">Pay</span><span class="text-emerald-500">To</span><span class="text-green-300">:Pro</span> Plans
								</a>
							</div>
						</div>
						<div class="w-full flex-1 min-w-0">
							<DesignContent
								bind:hostname={$type}
							/>
						</div>
					</div>
				{/if}
			</BoxContent>
		</Box>
	</Row>
	<Row>
		<a id="information" aria-hidden="true" aria-label="Information"></a>
		<Box>
			<div>
				<button
					type="button"
					onclick={() => showInfoBox = !showInfoBox}
					class="flex items-center justify-between w-full p-0 text-left hover:text-gray-300 transition-colors duration-200 border-none bg-transparent"
				>
					<span class="text-lg font-bold">Information</span>
					{#if showInfoBox}
						<ChevronUp class="w-5 h-5" />
					{:else}
						<ChevronDown class="w-5 h-5" />
					{/if}
				</button>
			</div>
			<BoxContent>
				{#if showInfoBox}
					<div class="flex flex-col gap-2 max-w-screen-md overflow-y-auto">
						<p>Expanded on the specification
							<a
								class="transition duration-200 visited:text-gray-200 hover:text-gray-300"
								href="https://datatracker.ietf.org/doc/html/rfc8905"
								target="_blank"
								rel="noreferrer"
							>RFC 8905</a>.
							<a
								class="transition duration-200 visited:text-gray-200 hover:text-gray-300"
								href="https://github.com/core-laboratories/payto/blob/master/docs/scheme.md"
								target="_blank"
								rel="noreferrer"
							>Documentation</a>.
						</p>
						{#if $currentShow}
							<div class="flex inline-flex items-center gap-1">
								<div class="mr-1">{$currentSentence}</div>
								<div class="flex inline-flex items-center gap-1">Read more
									{#if isObject($currentLink)}
										about:
										{#each $currentLink as link, index}
										<a
											class="transition duration-200 visited:text-gray-200 hover:text-gray-300"
											href={link.href}
												target="_blank"
												rel="noreferrer"
											>{link.label}{#if $currentLink.length > 1 && $currentLink.length - 1 !== index};{/if}</a>
										{/each}
									{:else}
										<a
											class="transition duration-200 visited:text-gray-200 hover:text-gray-300"
											href={$currentLink}
											target="_blank"
											rel="noreferrer"
										>here</a>
									{/if}
								</div>
							</div>
						{/if}
						<p>
							<code class="text-xs">payto://</code> opens installed apps that support the PayTo protocol. If you don't have an app installed that handles PayTo links, clicking the link will not open anything. <code class="text-xs">web+payto://</code> is for web applications and will not open installed apps.
						</p>
					</div>
				{/if}
			</BoxContent>
		</Box>
	</Row>
</Page>
