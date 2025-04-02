<script lang="ts">
	import { Row, Box, BoxContent, BoxTitle, Page } from '$lib/components';
	import { Header, Footer } from './components';

	export const data = {};
	export let status = 500;
	export let error: Error | null = null;
</script>

<article class="flex flex-col w-full h-screen">
	<Header />
	<main class="lg:px-8 mx-auto flex-1">
		<Page>
			<Row>
				<Box>
					<BoxTitle>
						{#if status === 404}
							Page Not Found
						{:else if status === 500}
							We have a problem!
						{:else}
							Error {status}
						{/if}
					</BoxTitle>
					<BoxContent>
						{#if status === 404}
							<div>We can't find the page you're looking for.</div>
						{:else if status === 500}
							<div>
								We're having trouble processing your request.
							</div>
							<div>
								Please
								<a href="https://github.com/core-laboratories/payto/issues" target="_blank" rel="noindex,nofollow">report the problem</a>
								and try again later.
							</div>
						{:else if error}
							<div>{error.message}</div>
						{:else}
							<div>Unexpected error.</div>
						{/if}
						<div>Remember - PayTo protocol works without any downtime.</div>
						<div>
							<a href="/" class="flex items-center gap-2 w-fit">
								<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
									<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
									<polyline points="9 22 9 12 15 12 15 22"/>
								</svg>
								Return Home
							</a>
						</div>
					</BoxContent>
				</Box>
			</Row>
		</Page>
	</main>
	<Footer />
</article>
