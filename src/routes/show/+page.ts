import type { PageLoad } from './$types';

export const load: PageLoad = ({ url }) => {
	const urlParam = url.searchParams.get('url');
	return { urlParam };
};
