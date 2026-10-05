import adapter from '@sveltejs/adapter-cloudflare';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from "@tailwindcss/vite";

/** @type {import('vite').UserConfig & { test: { include: string[] } }} */
const config = {
	// Browser integration tests are run by Playwright, not Vitest.
	test: { include: ['src/**/*.test.ts'] },
	plugins: [
		tailwindcss(),
		sveltekit({
			adapter: adapter(),
			alias: {
				'$i18n': './src/i18n'
			},
			csrf: { trustedOrigins: ['*'] }
		})
	]
};

export default config;
