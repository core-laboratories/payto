<script lang="ts">
	import { onMount } from 'svelte';
	import '../app.postcss';
	import {
		Row, Box, BoxContent, BoxTitle, Page, Tabs, Toast, WalletCard, DesignContent
	} from '$lib/components';

	import { TYPES } from '$lib/data/types.data';
	import { getObjectByType } from '$lib/helpers/get-object-by-type.helper';
	import { Icon } from '$lib/icons';
	import { constructor } from '$lib/store/constructor.store';
	import { derived, get, writable } from 'svelte/store';
	import { toast } from '$lib/components/toast';

	let type = writable<ITransitionType>('ican');
	let designEnabled = writable(false);
	let currentSentence = writable('');
	let currentLink = writable('');
	let currentShow = writable(false);
	let outputs = derived(
		[type, constructor],
		([$type, $constructor]) => {
			const result = get(constructor.build($type));
			return Array.isArray(result) ? result : [];
		}
	);

	onMount(() => {
		const currentName = getObjectByType(TYPES, $type)?.label;
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
</script>

<Toast />

<Page>
	<Row classValue="lg:flex-row lg:gap-4">
		<Box classValue="lg:basis-[calc(50%-2.5rem)]">
			<BoxTitle>Payment Constructor</BoxTitle>
			<BoxContent>
				<Tabs bind:selectedTab={$type} />
				<button
					class="is-full bs-12 mt-auto py-2 px-3 text-center text-white border border-gray-700 bg-gray-700 rounded-sm transition duration-200 outline-none focus-visible:ring-4 focus-visible:ring-opacity-75 focus-visible:ring-green-800 focus-visible:ring-offset-green-700 focus-visible:ring-offset-2 active:scale-(0.99) text-sm"
					type="button"
					on:click={() => constructor.reset($type)}
				>
					Clear
				</button>
			</BoxContent>
		</Box>

		<Icon.Convert classValue="w-10 h-10 self-center text-green-500 rotate-90 lg:block lg:rotate-0" />

		<Box classValue="lg:basis-[calc(50%-2.5rem)]">
			<BoxTitle>Integrations</BoxTitle>
			<BoxContent>
				<div class="flex flex-col gap-6">
					{#each $outputs as output, index}
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
									on:click={(e) => e.currentTarget.select()}
								/>
								<button
									class="flex items-center justify-between absolute end-0 me-2 p-2 text-gray-50 bg-gray-700 hover:bg-gray-600 rounded-full outline-none transition duration-200 focus-visible:bg-green-900 focus-visible:text-green-50 active:scale-(0.95) !cursor-copy"
									type="button"
									title="Copy to clipboard"
									aria-label="Copy to clipboard"
									data-value={output.value}
									on:click={handleOnCopy}
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
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											d="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.057 1.123-.08M15.75 18H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08M15.75 18.75v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5A3.375 3.375 0 006.375 7.5H5.25m11.9-3.664A2.251 2.251 0 0015 2.25h-1.5a2.251 2.251 0 00-2.15 1.586m5.8 0c.065.21.1.433.1.664v.75h-6V4.5c0-.231.035-.454.1-.664M6.75 7.5H4.875c-.621 0-1.125.504-1.125 1.125v12c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V16.5a9 9 0 00-9-9z"
										/>
									</svg>
								</button>
							</div>

							{#if output.previewable}
								<div class="flex flex-col items-stretch gap-2 mb-2">
									<label class="text-gray-300 text-sm" for={'previewOf' + index}>
										Preview
									</label>
									<output id={'previewOf' + index}>{@html output.value}</output>
								</div>
							{/if}

							{#if output.note}
								<div class="flex flex-col items-stretch gap-2 mb-2">
									<small class="text-gray-400" id={'noteOf' + index}>
										{output.note}
									</small>
								</div>
							{/if}
						</div>
					{/each}
				</div>
			</BoxContent>
		</Box>
	</Row>
	<Row>
		<Box>
			<BoxTitle>
				<label for="designCheckbox" class="mr-2">Pass</label>
				<input
					type="checkbox"
					bind:checked={$designEnabled}
					id="designCheckbox"
				/>
			</BoxTitle>
			<BoxContent>
				{#if $designEnabled}
					<div class="flex flex-col gap-x-6 gap-y-4 md:flex-row md:flex-nowrap">
						<div class="w-full md:w-[400px] flex-shrink-0">
							<WalletCard
								bind:hostname={$type}
							/>
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
		<Box>
			<h1 class="m-0 text-xl font-bold text-white">Information</h1>
			<BoxContent>
				<div class="flex flex-col gap-2">
					<div>Expanded on the specification
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
					</div>
					{#if $currentShow}
						<div>
							<span class="mr-1">{$currentSentence}</span>
							<span>Read more
								<a
									class="transition duration-200 visited:text-gray-200 hover:text-gray-300"
									href={$currentLink}
									target="_blank"
									rel="noreferrer"
								>here</a>.
							</span>
						</div>
					{/if}
					<div>
						Compatibility: Desktop - Chromium from version 121 & enabled flags (Experimental Web Platform Features); Opera; Safari. Mobile - All major browsers.
					</div>
					<div>
						Source code is located at
						<a
							class="transition duration-200 visited:text-gray-200 hover:text-gray-300"
							href="https://github.com/core-laboratories/Payto"
							target="_blank"
							rel="noreferrer"
						>GitHub</a>.
						Licensed under the
						<a
							class="transition duration-200 visited:text-gray-200 hover:text-gray-300"
							href="https://github.com/core-laboratories/core-license/blob/master/LICENSE"
							target="_blank"
							rel="noreferrer"
						>CORE License</a>.
					</div>
				</div>
			</BoxContent>
		</Box>
	</Row>
</Page>
