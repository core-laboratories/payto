<script lang="ts">
	import { PARTNERS } from '$lib/data/partners.data';
	import { ExternalLink, UserPlus } from 'lucide-svelte';
</script>

<svelte:head>
	<title>PayTo:Money Pro - Partners</title>
	<meta name="description" content="List of PayTo partners to offer various services." />
</svelte:head>

<div class="flex flex-col items-center gap-8 p-4">
	<!-- Header Section -->
	<div class="w-full max-w-6xl text-center">
		<h1 class="text-3xl font-bold text-green-300 mb-4">PayTo Partners</h1>
		<p class="text-slate-400 text-lg">List of PayTo partners to offer various services.</p>
	</div>

	<!-- Partners Grid -->
	<div class="w-full max-w-6xl space-y-6">
		{#each PARTNERS as partner}
			<div class="mx-auto gap-4 my-8 flex max-w-screen-sm rounded-xl border border-gray-600 bg-gray-800/75 p-4 text-left text-gray-300 shadow-lg sm:p-8">
				<div class="mr-5 flex h-8 w-8 items-center justify-center sm:h-16 sm:w-16">
					<img
						class="max-h-full max-w-full object-contain"
						src={partner.logo}
						alt="{partner.name} Logo"
					/>
				</div>
				<div class="w-full text-left flex flex-col gap-4">
					<div class="flex flex-col justify-between text-gray-300 sm:flex-row">
						<h3 class="font-semibold">{partner.name}</h3>
					</div>
					<p class="text-slate-400">{partner.description}</p>
					<div class="flex gap-4">
						<a
							href={partner.url}
							target="_blank"
							rel="noopener"
							class="cursor-pointer border border-emerald-600 py-2 px-6 text-center leading-tight transition-colors duration-150 ease-in-out hover:border-emerald-500 hover:bg-emerald-600 hover:text-white rounded-lg text-emerald-300 !no-underline"
						>
							Visit Website
						</a>
						{#if partner.cta}
							<a
								href={partner.cta.url}
								target="_blank"
								rel="noopener"
								class="cursor-pointer border border-emerald-600 py-2 px-6 text-center leading-tight transition-colors duration-150 ease-in-out hover:border-emerald-500 hover:bg-emerald-600 hover:text-white rounded-lg text-emerald-300 !no-underline"
							>
								{partner.cta.label}
							</a>
						{/if}
					</div>
				</div>
			</div>
		{/each}
	</div>

	<!-- Call to Action Section -->
	<div class="w-full max-w-screen-sm rounded-xl border border-gray-600 bg-gray-800/75 p-8 text-center">
		<h2 class="text-2xl font-semibold mb-4">Want to become a partner?</h2>
		<p class="text-slate-400 mb-6">Join PayTo:Money network of banking partners and offer your customers FIAT to FIAT instant settlement and digital assets support.</p>
		<a
			href="/pro#pro-business"
			class="inline-flex items-center justify-center gap-2 px-8 py-3 font-semibold text-white transition duration-300 rounded-lg bg-emerald-700 hover:bg-emerald-600 focus:bg-emerald-700 focus-visible:outline-none !no-underline"
		>
			Join Pro:Business
		</a>
	</div>
</div>
