import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { Contract, Interface, JsonRpcProvider, Network } from 'corebc';
import { env } from '$env/dynamic/private';
import {
	buildLookupIdMaterial,
	computePepperedSearchHash,
	isValidCardholderName,
	normalizeName
} from '$lib/helpers/cryptocard.helper';

const DEFAULT_RPC_URL = 'https://xcbapi.coreblockchain.net';
const DEFAULT_NETWORK_ID = 1;

const ABI = [
	'error NoValidRecord(bytes32 searchHash)',
	'function getCoreId(bytes32 searchHash) view returns (bytes22 coreId)'
];

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

function decodeCallError(error: unknown) {
	const typed = error as {
		data?: string;
		info?: { error?: { data?: string } };
		shortMessage?: string;
		reason?: string;
		message?: string;
		code?: string;
	};
	const data = typed?.data || typed?.info?.error?.data || null;
	let decodedError = null;

	if (data) {
		try {
			const parsed = iface.parseError(data);
			if (parsed) {
				decodedError = {
					name: parsed.name,
					signature: parsed.signature,
					args: Array.from(parsed.args ?? [])
				};
			}
		} catch {
			// ignore decode failure
		}
	}

	return {
		message: typed?.shortMessage || typed?.reason || typed?.message || String(error),
		code: typed?.code || null,
		data,
		decodedError
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

		const network = Network.from(networkId);
		const provider = new JsonRpcProvider(rpcUrl, network, {
			staticNetwork: network
		});
		const contract = new Contract(contractAddress, ABI, provider);
		const coreId = await contract.getCoreId(searchHash);

		return json({
			coreId,
			networkId,
			searchHash
		});
	} catch (error) {
		return json(
			{
				error: decodeCallError(error)
			},
			{ status: 500 }
		);
	}
};
