import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { Interface } from 'corebc';
import { env } from '$env/dynamic/private';
import {
	buildLookupIdMaterial,
	computePepperedSearchHash,
	isValidCardholderName,
	normalizeName
} from '$lib/helpers/cryptocard.helper';

const DEFAULT_RPC_URL = 'https://xcbapi.coreblockchain.net';
const DEFAULT_NETWORK_ID = 1;

const ABI = ['function getCoreIdStatus(bytes32 searchHash) view returns (bool isValid, bool isPaused)'];
const iface = new Interface(ABI);

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
		contractAddress,
		rpcUrl,
		networkId
	};
}

function resolveCardParts(body: Record<string, unknown>) {
	if (typeof body.cardNumber === 'string') {
		const digits = body.cardNumber.replace(/\D/g, '');
		if (digits.length >= 10) {
			return {
				bin6: digits.slice(0, 6),
				last4: digits.slice(-4)
			};
		}
	}

	if (typeof body.first === 'string' && typeof body.last === 'string') {
		const first = body.first.replace(/\D/g, '');
		const last = body.last.replace(/\D/g, '');

		if (/^\d{6}$/.test(first) && /^\d{4}$/.test(last)) {
			return {
				bin6: first,
				last4: last
			};
		}
	}

	throw new Error('Either cardNumber or first/last digits must be provided.');
}

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = (await request.json()) as Record<string, unknown>;
		const { bin6, last4 } = resolveCardParts(body);
		const rawName = String(body.name ?? '');
		const name = normalizeName(rawName, { diacritics: 'strip' });

		if (rawName !== name || !isValidCardholderName(name)) {
			return json({ error: 'Cardholder name is required.' }, { status: 400 });
		}

		const { pepperHex, contractAddress, rpcUrl, networkId } = getRequiredConfig();
		const idMaterial = buildLookupIdMaterial(bin6, last4, name);
		const searchHash = `0x${computePepperedSearchHash(idMaterial, pepperHex)}`;
		const data = iface.encodeFunctionData('getCoreIdStatus', [searchHash]);
		const response = await fetch(rpcUrl, {
			method: 'POST',
			headers: {
				'content-type': 'application/json'
			},
			body: JSON.stringify({
				jsonrpc: '2.0',
				id: 1,
				method: 'xcb_call',
				params: [
					{
						to: contractAddress,
						data
					},
					'latest'
				]
			})
		});

		const payload = (await response.json()) as {
			result?: string;
			error?: { message?: string };
		};

		if (!response.ok || payload.error || !payload.result) {
			throw new Error(payload.error?.message || 'Failed to read record status.');
		}

		const decoded = iface.decodeFunctionResult('getCoreIdStatus', payload.result);
		const isValid = Boolean(decoded[0]);
		const isPaused = Boolean(decoded[1]);

		return json({
			searchHash,
			isValid: Boolean(isValid),
			isPaused: Boolean(isPaused),
			networkId
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Failed to read record status.';
		return json({ error: message }, { status: 500 });
	}
};
