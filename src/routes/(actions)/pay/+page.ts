import type { PageLoad } from './$types';

export const load: PageLoad = ({ url }) => {
	const urlParam = url.toString().split("?url=")[1];
	return { urlParam };
};
