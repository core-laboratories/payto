import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
	PRIVATE_API_TOKEN_TIMEOUT: { schema: (input) => input ?? '' },
	PRIVATE_GW_ISSUER_ID: { schema: (input) => input ?? '' },
	PRIVATE_GW_SA_EMAIL: { schema: (input) => input ?? '' },
	PRIVATE_GW_SA_PRIVATE_KEY: { schema: (input) => input ?? '' },
	PRIVATE_PASS_P12_BASE64: { schema: (input) => input ?? '' },
	PRIVATE_PASS_P12_PASSWORD: { schema: (input) => input ?? '' },
	PRIVATE_PASS_TEAM_IDENTIFIER: { schema: (input) => input ?? '' },
	PRIVATE_PASS_TYPE_IDENTIFIER: { schema: (input) => input ?? '' },
	PRIVATE_SUPABASE_KEY: { schema: (input) => input ?? '' },
	PRIVATE_SUPABASE_URL: { schema: (input) => input ?? '' },
	PRIVATE_WWDR_PEM: { schema: (input) => input ?? '' },

	PUBLIC_ENV: { public: true, schema: (input) => input ?? '' },
	PUBLIC_DEV_SERVER_URL: { public: true, schema: (input) => input ?? '' },
	PUBLIC_ENABLE_STATS: { public: true, static: true, schema: (input) => input ?? 'false' },
	PUBLIC_SWAP_URL: { public: true, schema: (input) => input ?? '' },
	PUBLIC_PRO_PRICE: { public: true, schema: (input) => input ?? '' },
	PUBLIC_COMMUNITY_URL: { public: true, schema: (input) => input ?? '' },
	PUBLIC_PRO_ORG_PRICE: { public: true, schema: (input) => input ?? '' },
	PUBLIC_COREAPI_URL: { public: true, schema: (input) => input ?? '' },
	PUBLIC_WEB_ACTIVATION_URL: { public: true, schema: (input) => input ?? '' },
	PUBLIC_PRO_CTN_ADDRESS: { public: true, schema: (input) => input ?? '' },
	PUBLIC_TG_BOT_NAME: { public: true, schema: (input) => input ?? '' },
	PUBLIC_GW_CALLBACK_URL: { public: true, schema: (input) => input ?? '' },
	PUBLIC_GW_UPDATE_REQUEST_URL: { public: true, schema: (input) => input ?? '' },
	PUBLIC_GW_MULTIPLE_STATUS: { public: true, schema: (input) => input ?? '' }
});
