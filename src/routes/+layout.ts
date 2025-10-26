import { redirect } from '@sveltejs/kit';

export const load = ({ url }: { url: URL }) => {
	if (url.pathname.startsWith('/://')) {
		const newPath = url.pathname.slice(3);
		const query = url.search ? url.search : '';
		throw redirect(307, '/show/payto%3A%2F%2F' + encodeURIComponent(newPath) + encodeURIComponent(query));
	}
};
