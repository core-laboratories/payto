<script lang="ts">
	import { House, Bug, MessageCircleQuestionMark, ArrowRight, MailQuestionMark, LifeBuoy } from 'lucide-svelte';
	import { page } from '$app/state';

	export const data = {};
	export let error: Error | null = null;
	$: status = page.status;

	// Navigation items for different error scenarios
	const getNavigations = () => {
		const commonItems = [
			{
				icon: House,
				title: 'Go back home',
				desc: 'Return to the main page of the website',
				href: '/'
			}
		];

		if (status === 404) {
			return [
				...commonItems,
				{
					icon: MessageCircleQuestionMark,
					title: 'Community',
					desc: 'Seek the right answers in our community',
					href: 'https://coretalk.space/@payto'
				},
				{
					icon: MailQuestionMark,
					title: 'Support',
					desc: 'Contact our support team for assistance by email',
					href: 'mailto:contact@payto.money'
				}
			];
		} else {
			return [
				...commonItems,
				{
					icon: Bug,
					title: 'Report problem',
					desc: 'Let us know about this issue so we can fix it',
					href: 'https://github.com/core-laboratories/payto/issues',
					target: '_blank'
				},
				{
					icon: LifeBuoy,
					title: 'Support',
					desc: 'Contact our support team for assistance by email',
					href: 'mailto:contact@payto.money'
				}
			];
		}
	};

	const navigations = getNavigations();
</script>

<main>
	<div class="max-w-screen-xl mx-auto px-4 flex items-center justify-start min-h-screen md:px-8">
		<div class="max-w-lg mx-auto">
			<div class="space-y-3 text-center">
				<h3 class="text-primary-600 font-semibold">
					{status} Error
				</h3>
				<p class="text-4xl font-semibold sm:text-5xl">
					{#if status === 404}
						Page not found
					{:else if status === 500}
						Server error
					{:else}
						Error occurred
					{/if}
				</p>
				<p>
					{#if status === 404}
						Sorry, the page you are looking for could not be found or has been removed.
					{:else if status === 500}
						We're having trouble processing your request.
					{:else}
						{error?.message || 'An unexpected error has occurred. Please try again later.'}
					{/if}
				</p>
			</div>
			<div class="mt-6">
				<ul class="divide-y divide-gray-400/50">
					{#each navigations as item, idx (idx)}
						<li class="flex gap-x-4 py-6">
							<div
								class="flex-none w-14 h-14 bg-gray-600 rounded-full text-gray-400 flex items-center justify-center"
							>
								<svelte:component this={item.icon} class="w-6 h-6" />
							</div>
							<div class="space-y-1">
								<h4 class="font-medium">{item.title}</h4>
								<p>
									{item.desc}
								</p>
								<a
									href={item.href}
									class="text-sm text-primary-600 duration-150 hover:text-primary-400 font-medium inline-flex items-center gap-x-1"
								>
									{item.title === 'Report problem' ? 'Report issue' : 'Continue'}
									<ArrowRight class="w-4 h-4" />
								</a>
							</div>
						</li>
					{/each}
				</ul>
			</div>
		</div>
	</div>
</main>
