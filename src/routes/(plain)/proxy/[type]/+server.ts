import { redirect } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { getExplorerUrl } from '$lib/helpers/tx-explorer.helper';

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
			const chain = url.searchParams.get('chain');
			const address = url.searchParams.get('address');
			if (!chain || !address) {
				throw new Error('Missing required parameters: chain and address');
			}
			const targetUrl = getExplorerUrl(chain, { address });
			if (!targetUrl) {
				throw new Error('Invalid chain or address');
			}

			// Perform 301 permanent redirect
			throw redirect(301, targetUrl);
		}

		default:
			throw new Error(`Unknown proxy type: ${type}`);
	}
}
