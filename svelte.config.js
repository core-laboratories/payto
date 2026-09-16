import adapter from '@sveltejs/adapter-cloudflare';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://github.com/sveltejs/svelte-preprocess
	// for more information about preprocessors
	kit: {
		adapter: adapter(),
		alias: {
			'$i18n': './src/i18n',
			'$payqr': '../payto-rl/src/payqr/index.ts'
		},
		csrf: {
			trustedOrigins: ['*']
		}
	}
};

export default config;
