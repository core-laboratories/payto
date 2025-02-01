<script lang="ts">
	export let data: { status: number; error: string };
	import { Row, Box, BoxContent, BoxTitle, Page } from '$lib/components';
</script>

<Page>
	<Row>
		<Box>
			<BoxTitle>
				{#if data.status === 404}
					Page Not Found
				{:else if data.status === 500}
					We have a problem!
				{:else}
					Error {data.status}
				{/if}
			</BoxTitle>
			<BoxContent>
				{#if data.status === 404}
					<div>We can't find the page you're looking for.</div>
				{:else if data.status === 500}
					<div>
						We're having trouble processing your request.
					</div>
					<div>
						Please
						<a href="https://github.com/core-laboratories/payto/issues" target="_blank" rel="noindex,nofollow">report the problem</a>
						and try again later.
					</div>
				{:else if data.error}
					<div>{data.error}</div>
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
