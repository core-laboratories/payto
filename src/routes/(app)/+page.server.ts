import { redirect } from '@sveltejs/kit';

export async function load({ url }) {
	const fullUrl = new URL(url.href);
	const authority = url.searchParams.get('authority') ?? undefined;
	const hasPass = url.searchParams.get('pass') === '1';

	if (fullUrl.hostname === 'payto.money') {
		const hasValidProtocol = fullUrl.protocol === 'payto.money:';
		const path = fullUrl.pathname.startsWith('/://') ? fullUrl.pathname.slice(3) : fullUrl.pathname;

		if (hasValidProtocol && path) {
			throw redirect(302, `/show?url=${encodeURIComponent(path)}`);
		}
	}

	return {
		authority,
		hasPass,
	};
}
