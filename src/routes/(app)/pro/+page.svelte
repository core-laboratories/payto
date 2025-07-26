<script lang="ts">
	import { env } from '$env/dynamic/public';
	import { CircleCheck } from 'lucide-svelte';
</script>

<svelte:head>
	<title>PayTo:Money Pro</title>
	<meta name="description" content="PayTo:Money Pro is a subscription service that allows you to create and manage PayPasses for your business. It includes a range of features to help you manage your PayPasses and payments." />
</svelte:head>

<div class="flex flex-col items-center gap-8 p-4">
	<!-- First row: Dynamic flex layout based on number of items -->
	<div class="flex flex-wrap gap-8 w-full max-w-6xl">
		<div class="w-full md:flex-1 lg:flex-1 rounded shadow-lg text-gray-100 bg-gray-800/75 h-fit">
			<a id="pro-plus" aria-hidden="true" aria-label="Pro Plus"></a>
			<div class="flex flex-col h-full">
				<header class="flex flex-col gap-6 p-6 text-slate-400">
					<h3 class="text-xl font-bold text-green-300">
						Pro<span class="text-2xl text-emerald-500">+</span>
						<span class="block text-sm font-normal text-slate-400">Ideal for PayTo:Merchants.</span>
					</h3>
					<h4>
						<span class="text-2xl">USD</span>
						<span class="text-4xl font-bold tracking-tighter transition-all duration-300 text-green-500">$ 100</span>
						<span class="text-sm">/month</span>
					</h4>
					<a href="mailto:sales@payto.money?subject=Pro%20Plus&body=Core%20ID%3A%0AIcon%3A%0AIcon%202x%3A%0AIcon%203x%3A%0ALogo%3A%0ALogo%202x%3A%0AWebhook%3A" class="inline-flex items-center justify-center w-full h-12 gap-2 px-6 text-sm font-bold tracking-wide !text-white transition duration-300 rounded shadow-sm whitespace-nowrap bg-emerald-700 shadow-emerald-600 hover:bg-emerald-400 hover:shadow-md hover:shadow-emerald-400 focus:bg-emerald-700 focus:shadow-md focus:shadow-emerald-400 focus-visible:outline-none no-underline!">
						<span>Enter Details by Email</span>
					</a>
				</header>
				<div class="p-6 flex-1">
					<ul class="space-y-4">
						<li class="flex items-start gap-2">
							<CircleCheck class="w-6 h-6 p-1 shrink-0 text-emerald-500" aria-hidden="true" />
							<div>Merchant URL or IPFS Logo for Digital PayPass</div>
						</li>
						<li class="flex items-start gap-2">
							<CircleCheck class="w-6 h-6 p-1 shrink-0 text-emerald-500" aria-hidden="true" />
							<div>Get a verified checkmark for Digital PayPass if Core ID is KYC/KYB‑verified</div>
						</li>
						<li class="flex items-start gap-2">
							<CircleCheck class="w-6 h-6 p-1 shrink-0 text-emerald-500" aria-hidden="true" />
							<div>Webhook for PayPass to receive payment information for supported assets as defined in Pro plan</div>
						</li>
						<li class="flex items-start gap-2">
							<CircleCheck class="w-6 h-6 p-1 shrink-0 text-emerald-500" aria-hidden="true" />
							<div><a href="mailto:support@payto.money">Priority Support</a></div>
						</li>
					</ul>
				</div>
				<footer class="p-6 text-sm text-center border-t border-emerald-800 bg-gray-700/75 mt-auto">
					Pass for merchant
				</footer>
			</div>
		</div>
		<div class="w-full md:flex-1 lg:flex-1 rounded shadow-lg text-gray-100 bg-gray-800/75 h-fit">
			<a id="pro-business" aria-hidden="true" aria-label="Pro Business"></a>
			<div class="flex flex-col h-full">
				<header class="flex flex-col gap-6 p-6 text-slate-400">
					<h3 class="text-xl font-bold text-green-300">
						Business
						<span class="block text-sm font-normal text-slate-400">Ideal for PayTo:Businesses.</span>
					</h3>
					<h4>
						<span class="text-2xl">USD</span>
						<span class="text-4xl font-bold tracking-tighter transition-all duration-300 text-green-500">$ 2,000</span>
						<span class="text-sm">/month</span>
					</h4>
					<a href="mailto:sales@payto.money?subject=Pro%20Business&body=Name%3A%0AURL%3A%0AIcon%3A%0AIcon%202x%3A%0AIcon%203x%3A%0ALogo%3A%0ALogo%202x%3A%0AColor%20B%3A%0AColor%20F%3A%0AColor%20Txt%3A%0AForce%20Theme%3A%0ACustom%20Currency%3A" class="inline-flex items-center justify-center w-full h-12 gap-2 px-6 text-sm font-bold tracking-wide !text-white transition duration-300 rounded shadow-sm whitespace-nowrap bg-emerald-700 shadow-emerald-600 hover:bg-emerald-400 hover:shadow-md hover:shadow-emerald-400 focus:bg-emerald-700 focus:shadow-md focus:shadow-emerald-400 focus-visible:outline-none no-underline!">
						<span>Enter Details by Email</span>
					</a>
				</header>
				<div class="p-6 flex-1">
					<ul class="space-y-4">
						<li class="flex items-start gap-2">
							<CircleCheck class="w-6 h-6 p-1 shrink-0 text-emerald-500" aria-hidden="true" />
							<span>PayPass issuance for your company</span>
						</li>
						<li class="flex items-start gap-2">
							<CircleCheck class="w-6 h-6 p-1 shrink-0 text-emerald-500" aria-hidden="true" />
							<div>White-labelled Digital PayPass</div>
						</li>
						<li class="flex items-start gap-2">
							<CircleCheck class="w-6 h-6 p-1 shrink-0 text-emerald-500" aria-hidden="true" />
							<div>Custom issuance authority for Digital PayPass</div>
						</li>
						<li class="flex items-start gap-2">
							<CircleCheck class="w-6 h-6 p-1 shrink-0 text-emerald-500" aria-hidden="true" />
							<div>One Custom Currency extension for Digital PayPass</div>
						</li>
						<li class="flex items-start gap-2">
							<CircleCheck class="w-6 h-6 p-1 shrink-0 text-emerald-500" aria-hidden="true" />
							<div>Company URL included in Digital PayPass</div>
						</li>
						<li class="flex items-start gap-2">
							<CircleCheck class="w-6 h-6 p-1 shrink-0 text-emerald-500" aria-hidden="true" />
							<div>Webhook for PayPass to receive payment information for supported assets as defined in Pro plan</div>
						</li>
						<li class="flex items-start gap-2">
							<CircleCheck class="w-6 h-6 p-1 shrink-0 text-emerald-500" aria-hidden="true" />
							<div><a href="mailto:support@payto.money">Priority Support</a></div>
						</li>
					</ul>
				</div>
				<footer class="p-6 text-sm text-center border-t border-emerald-800 bg-gray-700/75 mt-auto">
					Passes for multiple users
				</footer>
			</div>
		</div>
	</div>

	<!-- Second row: Pro only (full width) -->
	<div class="w-full max-w-6xl rounded shadow-lg text-gray-100 bg-gray-800/75">
		<a id="pro" aria-hidden="true" aria-label="Pro"></a>
		<div class="flex flex-col">
			<header class="flex flex-col gap-6 p-6 text-slate-400">
				<h3 class="text-xl font-bold text-green-300">
					Pro
					<span class="block text-sm font-normal text-slate-400">Ideal for PayTo:Money Daily Users.</span>
				</h3>
				<h4>
					<span class="text-2xl">CTN</span>
					<span class="text-4xl font-bold tracking-tighter transition-all duration-300 text-green-500">Ƈ 400</span>
					<span class="text-sm">/month</span>
				</h4>
				<a href="/?pass=1#pass" class="inline-flex items-center justify-center w-full h-12 gap-2 px-6 text-sm font-bold tracking-wide !text-white transition duration-300 rounded shadow-sm whitespace-nowrap bg-emerald-700 shadow-emerald-600 hover:bg-emerald-400 hover:shadow-md hover:shadow-emerald-400 focus:bg-emerald-700 focus:shadow-md focus:shadow-emerald-400 focus-visible:outline-none no-underline!">
					<span>Create and Activate inside PayPass</span>
				</a>
			</header>
			<div class="p-6">
				<ul class="space-y-4">
					<li class="flex items-start gap-2">
						<CircleCheck class="w-6 h-6 p-1 shrink-0 text-emerald-500" aria-hidden="true" />
						<div>
							PayPass Live notification for incoming payments via <span class="relative overflow-hidden cursor-help group hover:overflow-visible focus-visible:outline-none border-b border-dotted border-gray-400" aria-describedby="tooltip-messenger">messengers<span role="tooltip" id="tooltip-messenger" class="invisible absolute bottom-full left-1/2 z-10 mb-2 w-48 -translate-x-1/2 rounded bg-slate-700 p-2 text-xs text-white opacity-0 transition-all before:invisible before:absolute before:left-1/2 before:top-full before:z-10 before:mb-2 before:-ml-1 before:border-x-4 before:border-t-4 before:border-x-transparent before:border-t-slate-700 before:opacity-0 before:transition-all before:content-[''] group-hover:visible group-hover:block group-hover:opacity-100 group-hover:before:visible group-hover:before:opacity-100">Currently supported: Email, Telegram</span></span> for{' '}
							<span class="relative overflow-hidden cursor-help group hover:overflow-visible focus-visible:outline-none border-b border-dotted border-gray-400" aria-describedby="tooltip-assets">
								Assets<span role="tooltip" id="tooltip-assets" class="invisible absolute bottom-full left-1/2 z-10 mb-2 w-48 -translate-x-1/2 rounded bg-slate-700 p-2 text-xs text-white opacity-0 transition-all before:invisible before:absolute before:left-1/2 before:top-full before:z-10 before:mb-2 before:-ml-1 before:border-x-4 before:border-t-4 before:border-x-transparent before:border-t-slate-700 before:opacity-0 before:transition-all before:content-[''] group-hover:visible group-hover:block group-hover:opacity-100 group-hover:before:visible group-hover:before:opacity-100">Currently supported: XCB</span>
							</span>
							{' '}and{' '}
							<span class="relative overflow-hidden cursor-help group hover:overflow-visible focus-visible:outline-none border-b border-dotted border-gray-400" aria-describedby="tooltip-tokens">
								Predefined Tokens<span role="tooltip" id="tooltip-tokens" class="invisible absolute bottom-full left-1/2 z-10 mb-2 w-48 -translate-x-1/2 rounded bg-slate-700 p-2 text-xs text-white opacity-0 transition-all before:invisible before:absolute before:left-1/2 before:top-full before:z-10 before:mb-2 before:-ml-1 before:border-x-4 before:border-t-4 before:border-x-transparent before:border-t-slate-700 before:opacity-0 before:transition-all before:content-[''] group-hover:visible group-hover:block group-hover:opacity-100 group-hover:before:visible group-hover:before:opacity-100">Currently supported:<br />CTN, USDX</span>
							</span>. *
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
					<li>
						* <span class="text-sm">This feature applies if you configure the notification while creating a PayPass.</span>
					</li>
					<li class="flex items-start gap-2">
						<div class="italic">+ Everything in Free version</div>
					</li>
				</ul>
			</div>
			<footer class="p-6 text-sm text-center border-t border-emerald-800 bg-gray-700/75">
				<a class="transition-colors duration-300 text-emerald-500 hover:text-emerald-600 focus:text-emerald-700" target="_blank" rel="noopener" href="https://app.ping.exchange/trade?market=ctn_usdc">On-Ramp CTN</a>
			</footer>
		</div>
	</div>
</div>
