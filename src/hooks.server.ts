import type { Handle } from '@sveltejs/kit';
import { error, json, text } from '@sveltejs/kit';

function isFormContentType(request: Request) {
	const type = request.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase() ?? '';
	return (
		type === 'application/x-www-form-urlencoded' ||
		type === 'multipart/form-data' ||
		type === 'text/plain'
	);
}

export const handle: Handle = async ({ event, resolve }) => {
	const { request, url } = event;

	const isForm =
		['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method) &&
		isFormContentType(request);

	const origin = request.headers.get('origin');
	const sameOrigin = origin === null || origin === url.origin; // same-origin or no origin (Postman, curl)
	const isPassRoute = url.pathname === '/pass';                // <-- your endpoint

	const forbidden = isForm && !sameOrigin && !isPassRoute;

	if (forbidden) {
		const message = `Cross-site ${request.method} form submissions are forbidden`;

		if (request.headers.get('accept') === 'application/json') {
			return json({ message }, { status: 403 });
		}

		return text(message, { status: 403 });
	}

	return resolve(event);
};
