import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import ICAN from '@blockchainhub/ican';
import { env } from '$env/dynamic/private';
import {
	buildIdMaterialWithSha3,
	computeKeccak256Hex,
	computePepperedSearchHash,
	normalizeName
} from '$lib/helpers/cryptocard.helper';

const DEFAULT_RPC_URL = 'https://xcbapi.coreblockchain.net';
const DEFAULT_NETWORK_ID = 1;
const GET_CORE_ID_SELECTOR = computeKeccak256Hex('getCoreId(bytes32)').slice(0, 8);

type RpcSuccess = {
	id: number | string;
	jsonrpc: '2.0';
	result: string;
};

type RpcFailure = {
	id: number | string;
	jsonrpc: '2.0';
	error: {
		code: number;
		message: string;
		data?: unknown;
	};
};

function getRequiredConfig() {
	const pepperHex = env.PRIVATE_CARD_LOOKUP_PEPPER_HEX ?? env.PEPPER_HEX;
	const contractAddress = env.PRIVATE_CARD_CORE_ID_REGISTRY ?? env.DEVIN_CORE_ID_REGISTRY;
	const rpcUrl = env.PRIVATE_CARD_RPC_URL ?? env.DEVIN_RPC_URL ?? DEFAULT_RPC_URL;
	const networkId = Number(
		env.PRIVATE_CARD_NETWORK_ID ?? env.DEVIN_NETWORK_ID ?? String(DEFAULT_NETWORK_ID)
	);

	if (!pepperHex) {
		throw new Error('Card lookup pepper is not configured.');
	}

	if (!contractAddress) {
		throw new Error('Core ID registry address is not configured.');
	}

	if (!Number.isFinite(networkId) || networkId <= 0) {
		throw new Error('Core ID network id is invalid.');
	}

	return {
		pepperHex,
		contractAddress: normalizeCoreAddressForRpc(contractAddress),
		rpcUrl,
		networkId
	};
}

function normalizeCoreAddressForRpc(raw: string): string {
	const value = String(raw ?? '').trim();
	if (!value) return value;

	if (/^0x[0-9a-fA-F]{44}$/i.test(value)) {
		const body = value.slice(2);
		if (ICAN.isValid(body)) {
			return ICAN.electronicFormat(body);
		}
	}

	if (/^[a-z]{2}\d{2}[0-9a-fA-F]{40}$/i.test(value) && ICAN.isValid(value)) {
		return ICAN.electronicFormat(value);
	}

	return value;
}

function normalizeHex(value: string, expectedBytes: number, label: string): string {
	const withPrefix = value.startsWith('0x') ? value : `0x${value}`;
	const pattern = new RegExp(`^0x[0-9a-fA-F]{${expectedBytes * 2}}$`);
	if (!pattern.test(withPrefix)) {
		throw new Error(`${label} must be ${expectedBytes} bytes hex.`);
	}
	return withPrefix.toLowerCase();
}

function encodeGetCoreIdCall(searchHash: string): string {
	return `0x${GET_CORE_ID_SELECTOR}${normalizeHex(searchHash, 32, 'searchHash').slice(2)}`;
}

function decodeCoreIdResult(result: string): string {
	const raw = normalizeHex(result, 32, 'RPC result').slice(2);
	const coreId = raw.slice(0, 44).toLowerCase();
	if (/^0+$/.test(coreId)) {
		throw new Error('Registry returned an empty Core ID.');
	}
	return coreId;
}

async function lookupCoreIdBySearchHash(
	rpcUrl: string,
	contractAddress: string,
	searchHash: string
) {
	const payload = {
		jsonrpc: '2.0' as const,
		method: 'xcb_call',
		params: [
			{
				to: contractAddress,
				data: encodeGetCoreIdCall(searchHash)
			},
			'latest'
		],
		id: Date.now()
	};

	const response = await fetch(rpcUrl, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(payload)
	});

	if (!response.ok) {
		throw new Error(`Core RPC request failed with ${response.status} ${response.statusText}.`);
	}

	const body = (await response.json()) as RpcSuccess | RpcFailure;
	if ('error' in body) {
		throw new Error(body.error.message || 'Core RPC lookup failed.');
	}

	if (typeof body.result !== 'string') {
		throw new Error('Core RPC lookup did not return hex data.');
	}

	return decodeCoreIdResult(body.result);
}

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		const cardNumber = String(body?.cardNumber ?? '').replace(/\D/g, '');
		const name = normalizeName(String(body?.name ?? ''), { diacritics: 'strip' });

		if (cardNumber.length < 10) {
			return json(
				{ error: 'Card number must include at least the first 6 and last 4 digits.' },
				{ status: 400 }
			);
		}

		if (!name || name.replace(/ /g, '').length < 3) {
			return json({ error: 'Cardholder name is required.' }, { status: 400 });
		}

		const { pepperHex, contractAddress, rpcUrl, networkId } = getRequiredConfig();
		const bin6 = cardNumber.slice(0, 6);
		const last4 = cardNumber.slice(-4);
		const { idMaterial } = buildIdMaterialWithSha3(bin6, last4, name);
		const searchHash = `0x${computePepperedSearchHash(idMaterial, pepperHex)}`;
		const coreId = await lookupCoreIdBySearchHash(rpcUrl, contractAddress, searchHash);

		return json({
			coreId,
			networkId,
			searchHash
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Core ID lookup failed.';
		return json({ error: message }, { status: 500 });
	}
};
