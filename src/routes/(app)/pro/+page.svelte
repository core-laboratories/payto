<script lang="ts">
	import { env } from '$env/dynamic/public';
	import { CircleCheck, Plus } from 'lucide-svelte';
</script>

<svelte:head>
	<title>PayTo:Money Pro</title>
	<meta name="description" content="PayTo:Money Pro is a subscription service that allows you to create and manage PayPasses for your organization. It includes a range of features to help you manage your PayPasses and payments." />
</svelte:head>

<div class="flex flex-col items-center gap-8 p-4">
	<!-- First row: Dynamic flex layout based on number of items -->
	<div class="flex flex-wrap gap-8 w-full max-w-screen-lg">
		<div class="w-full md:flex-1 lg:flex-1 rounded shadow-lg text-gray-100 bg-gray-800/75 h-fit">
			<a id="plus" aria-hidden="true" aria-label="Pro Plus"></a>
			<div class="flex flex-col h-full">
				<header class="flex flex-col gap-4 p-4 text-slate-400">
					<h3 class="text-xl font-bold text-green-300">
						Pro<span class="text-2xl text-emerald-500">+</span>
						<span class="block text-sm font-normal text-slate-400">PayTo:FIAT</span>
					</h3>
					<a href="/pro/partners" class="inline-flex items-center justify-center gap-2 px-8 py-3 font-semibold text-white transition duration-300 rounded-lg bg-emerald-700 hover:bg-emerald-600 focus:bg-emerald-700 focus-visible:outline-none !no-underline">
						<span>Register with partner</span>
					</a>
				</header>
				<div class="px-6 pt-2 pb-4 flex-1">
					<ul class="space-y-4">
						<li class="flex items-start gap-2">
							<Plus class="w-6 h-6 p-1 shrink-0 text-emerald-500" aria-hidden="true" />
							<div>FIAT to FIAT settlement</div>
						</li>
						<li class="flex items-start gap-2">
							<Plus class="w-6 h-6 p-1 shrink-0 text-emerald-500" aria-hidden="true" />
							<div>Digital Assets support</div>
						</li>
						<li class="flex items-start gap-2">
							<CircleCheck class="w-6 h-6 p-1 shrink-0 text-emerald-500" aria-hidden="true" />
							<div>Partner's support</div>
						</li>
					</ul>
				</div>
				<footer class="p-6 text-sm text-center border-t border-emerald-800 bg-gray-700/75 mt-auto">
					Passes for FIAT
				</footer>
			</div>
		</div>
		<div class="w-full md:flex-1 lg:flex-1 rounded shadow-lg text-gray-100 bg-gray-800/75 h-fit">
			<a id="org" aria-hidden="true" aria-label="Pro Organization"></a>
			<div class="flex flex-col h-full">
				<header class="flex flex-col gap-4 p-4 text-slate-400">
					<h3 class="text-xl font-bold text-green-300">
						Organization
						<span class="block text-sm font-normal text-slate-400">PayTo:Org</span>
					</h3>
					<h4>
						<span class="text-2xl">EUR</span>
						<span class="text-4xl font-bold tracking-tighter transition-all duration-300 text-green-500">€ 10,000</span>
						<span class="text-sm">/year</span>
					</h4>
					<a href="mailto:sales@payto.money?subject=Pro%20Organization&body=ORIC%3A%20%0AMessage%3A%20%0A%0A%28Please%20attach%20the%20JSON%20file%20with%20the%20details%29%0A" class="inline-flex items-center justify-center gap-2 px-8 py-3 font-semibold text-white transition duration-300 rounded-lg bg-emerald-700 hover:bg-emerald-600 focus:bg-emerald-700 focus-visible:outline-none !no-underline">
						<span>Enter Details by Email</span>
					</a>
				</header>
				<div class="px-6 pt-2 pb-4 flex-1">
					<div class="mb-4">Limited to <a href="https://payto.onl/solutions/oric" target="_blank" rel="noopener">ORIC holders</a>.</div>
					<ul class="space-y-4">
						<li class="flex items-start gap-2">
							<Plus class="w-6 h-6 p-1 shrink-0 text-emerald-500" aria-hidden="true" />
							<span>Issue PayPasses with POST form or API</span>
						</li>
						<li class="flex items-start gap-2">
							<Plus class="w-6 h-6 p-1 shrink-0 text-emerald-500" aria-hidden="true" />
							<div>White-labelled PayPass</div>
						</li>
						<li class="flex items-start gap-2">
							<Plus class="w-6 h-6 p-1 shrink-0 text-emerald-500" aria-hidden="true" />
							<div>Up to 10 Custom Currencies for PayPass</div>
						</li>
						<li class="flex items-start gap-2">
							<CircleCheck class="w-6 h-6 p-1 shrink-0 text-emerald-500" aria-hidden="true" />
							<div>Possibility to list as a partner</div>
						</li>
					</ul>
				</div>
				<footer class="p-6 text-sm text-center border-t border-emerald-800 bg-gray-700/75 mt-auto">
					Passes for Organizations
				</footer>
			</div>
		</div>
	</div>

	<!-- Second row: Pro only (full width) -->
	<div class="w-full max-w-6xl rounded shadow-lg text-gray-100 bg-gray-800/75">
		<a id="pro" aria-hidden="true" aria-label="Pro"></a>
		<div class="flex flex-col">
			<header class="flex flex-col gap-4 p-4 text-slate-400">
				<h3 class="text-xl font-bold text-green-300">
					Pro
					<span class="block text-sm font-normal text-slate-400">PayTo:Money Daily Users</span>
				</h3>
				<h4>
					<span class="text-2xl">CTN</span>
					<span class="text-4xl font-bold tracking-tighter transition-all duration-300 text-green-500">Ƈ 500</span>
					<span class="text-sm">/month</span>
				</h4>
				<a href="/?pass=1#pass" class="inline-flex items-center justify-center gap-2 px-8 py-3 font-semibold text-white transition duration-300 rounded-lg bg-emerald-700 hover:bg-emerald-600 focus:bg-emerald-700 focus-visible:outline-none !no-underline">
					<span>Create and Activate inside PayPass</span>
				</a>
			</header>
			<div class="px-6 pt-2 pb-4">
				<ul class="space-y-4">
					<li class="flex items-start gap-2">
						<Plus class="w-6 h-6 p-1 shrink-0 text-emerald-500" aria-hidden="true" />
						<div>
							PayPass Live notification for incoming payments via <span class="relative overflow-hidden cursor-help group hover:overflow-visible focus-visible:outline-none border-b border-dotted border-gray-400" aria-describedby="tooltip-messenger">messengers<span role="tooltip" id="tooltip-messenger" class="invisible absolute bottom-full left-1/2 z-10 mb-2 w-48 -translate-x-1/2 rounded bg-slate-700 p-2 text-xs text-white opacity-0 transition-all before:invisible before:absolute before:left-1/2 before:top-full before:z-10 before:mb-2 before:-ml-1 before:border-x-4 before:border-t-4 before:border-x-transparent before:border-t-slate-700 before:opacity-0 before:transition-all before:content-[''] group-hover:visible group-hover:block group-hover:opacity-100 group-hover:before:visible group-hover:before:opacity-100">Currently supported: Email, Telegram</span></span> for{' '}
							<span class="relative overflow-hidden cursor-help group hover:overflow-visible focus-visible:outline-none border-b border-dotted border-gray-400" aria-describedby="tooltip-assets">
								Assets<span role="tooltip" id="tooltip-assets" class="invisible absolute bottom-full left-1/2 z-10 mb-2 w-48 -translate-x-1/2 rounded bg-slate-700 p-2 text-xs text-white opacity-0 transition-all before:invisible before:absolute before:left-1/2 before:top-full before:z-10 before:mb-2 before:-ml-1 before:border-x-4 before:border-t-4 before:border-x-transparent before:border-t-slate-700 before:opacity-0 before:transition-all before:content-[''] group-hover:visible group-hover:block group-hover:opacity-100 group-hover:before:visible group-hover:before:opacity-100">Currently supported: XCB</span>
							</span>
							{' '}and{' '}
							<span class="relative overflow-hidden cursor-help group hover:overflow-visible focus-visible:outline-none border-b border-dotted border-gray-400" aria-describedby="tooltip-tokens">
								Predefined Tokens<span role="tooltip" id="tooltip-tokens" class="invisible absolute bottom-full left-1/2 z-10 mb-2 w-48 -translate-x-1/2 rounded bg-slate-700 p-2 text-xs text-white opacity-0 transition-all before:invisible before:absolute before:left-1/2 before:top-full before:z-10 before:mb-2 before:-ml-1 before:border-x-4 before:border-t-4 before:border-x-transparent before:border-t-slate-700 before:opacity-0 before:transition-all before:content-[''] group-hover:visible group-hover:block group-hover:opacity-100 group-hover:before:visible group-hover:before:opacity-100">Currently supported:<br />CTN</span>
							</span>.
						</div>
					</li>
					<li class="flex items-start gap-2">
						<CircleCheck class="w-6 h-6 p-1 shrink-0 text-emerald-500" aria-hidden="true" />
						<div>Blockies identicon</div>
					</li>
					{#if env.PUBLIC_COMMUNITY_URL}
					<li class="flex items-start gap-2">
						<CircleCheck class="w-6 h-6 p-1 shrink-0 text-emerald-500" aria-hidden="true" />
						<div><a href={env.PUBLIC_COMMUNITY_URL} target="_blank" rel="noopener">Discord community support</a></div>
					</li>
					{/if}
					<li class="flex items-start gap-2">
						<div class="italic">+ Everything in Free version</div>
					</li>
				</ul>
			</div>
			<footer class="p-6 text-sm text-center border-t border-emerald-800 bg-gray-700/75">
				Passes for public use with extended features
			</footer>
		</div>
	</div>
</div>
