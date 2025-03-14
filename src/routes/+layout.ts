import { redirect } from '@sveltejs/kit';

export async function load({ url }) {
	const { hostname, pathname, search, protocol } = new URL(url.href);

	if (hostname === 'localhost' || hostname === 'payto.money') {
		const cleanPath = pathname.startsWith('/://') ? pathname.slice(3) : undefined;
		const fullPath = cleanPath?.startsWith('/') ? cleanPath.slice(1) : cleanPath;
		const redirectUrl = fullPath ? `/show?url=payto://${fullPath}${search}` : '';

		if (fullPath) {
			throw redirect(302, redirectUrl);
		}
	}

	return {};
}
