import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	// Check if this is a POST to /pass with debug=1
	const isPassEndpoint = event.url.pathname === '/pass';
	const isDebug = event.url.searchParams.get('debug') === '1';
	const isPost = event.request.method === 'POST';

	if (isPassEndpoint && isPost && isDebug) {
		// Try to resolve the request
		try {
			return await resolve(event);
		} catch (error: any) {
			// If it's a CSRF error (403 with "Cross-site POST form submissions are forbidden")
			if (error?.status === 403 && error?.body?.message?.includes('Cross-site POST form submissions are forbidden')) {
				// Return debug info about CSRF failure
				const contentType = event.request.headers.get('content-type') || '';
				const origin = event.request.headers.get('origin');
				const authority = event.url.searchParams.get('authority');

				const debugInfo = {
					error: 'CSRF_PROTECTION_BLOCKED',
					message: 'Request blocked by SvelteKit CSRF protection before reaching authorization code',
					contentType,
					origin,
					baseOrigin: event.url.origin,
					authority,
					hasOrigin: !!origin,
					originMatches: origin === event.url.origin,
					note: 'To allow cross-origin requests, ensure the authority has postForm: true in KV data, or use application/json with Bearer token'
				};

				return new Response(JSON.stringify({ message: error.body.message, debug: debugInfo }, null, 2), {
					status: 403,
					headers: {
						'Content-Type': 'application/json'
					}
				});
			}
			// Re-throw other errors
			throw error;
		}
	}

	return await resolve(event);
};

