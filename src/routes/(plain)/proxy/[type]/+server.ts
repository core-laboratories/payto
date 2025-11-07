import { redirect } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';

/**
 * Proxy route handler
 * Handles different proxy types and performs appropriate actions
 * @param event - SvelteKit request event
 */
export async function GET(event: RequestEvent) {
	const { params, url } = event;
	const type = params.type?.toLowerCase();

	if (!type) {
		throw new Error('Missing type parameter');
	}

	switch (type) {
		case 'explorer': {
			const targetUrl = url.searchParams.get('url');
			if (!targetUrl) {
				throw new Error('Missing url query parameter for explorer proxy');
			}

			// Validate that the URL is safe (starts with http:// or https://)
			if (!/^https?:\/\//i.test(targetUrl)) {
				throw new Error('Invalid URL format. Must start with http:// or https://');
			}

			// Perform 301 permanent redirect
			throw redirect(301, targetUrl);
		}

		default:
			throw new Error(`Unknown proxy type: ${type}`);
	}
}
