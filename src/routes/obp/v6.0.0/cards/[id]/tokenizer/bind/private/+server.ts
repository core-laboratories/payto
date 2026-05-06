import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { Contract, Interface, JsonRpcProvider, Network, TypedDataEncoder, Wallet } from 'corebc';
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
	'error RecordAlreadyExists(bytes32 searchHash)',
	'error InvalidOracleSignatureLength(uint256 length)',
	'error InvalidOraclePubkeyLength(uint256 length)',
	'error OraclePubKeyMismatch()',
	'error ZeroAddress()',
	'function BINDER_ROLE() view returns (bytes32)',
	'function hasRole(bytes32 role, address account) view returns (bool)',
	'function getOraclePubKey() view returns (bytes)',
	'function getCoreId(bytes32 searchHash) view returns (bytes22 coreId)',
	'function bind(bytes32 searchHash, bytes22 coreId, bool validity, bytes oracleSigEd448)'
];

const iface = new Interface(ABI);

const BIND_TYPES = {
	Bind: [
		{ name: 'searchHash', type: 'bytes32' },
		{ name: 'coreId', type: 'bytes22' },
		{ name: 'validity', type: 'bool' }
	]
};

function getRequiredConfig() {
	const pepperHex = env.PRIVATE_CARD_LOOKUP_PEPPER_HEX ?? env.PEPPER_HEX;
	const contractAddress = env.PRIVATE_CARD_CORE_ID_REGISTRY ?? env.DEVIN_CORE_ID_REGISTRY;
	const rpcUrl = env.PRIVATE_CARD_RPC_URL ?? env.DEVIN_RPC_URL ?? DEFAULT_RPC_URL;
	const networkId = Number(
		env.PRIVATE_CARD_NETWORK_ID ?? env.DEVIN_NETWORK_ID ?? String(DEFAULT_NETWORK_ID)
	);
	const binderPrivateKey =
		env.PRIVATE_CARD_BINDER_PRIVATE_KEY ?? env.PRIVATE_CARD_ADMIN_PRIVATE_KEY ?? env.CORE_PRIVATE_KEY;
	const signerPrivateKey = env.PRIVATE_CARD_SIGNER_PRIVATE_KEY ?? env.CORE_PRIVATE_KEY;
	const prefix = (env.PRIVATE_CARD_PREFIX ?? env.DEVIN_PREFIX ?? 'ab').replace(/^0x/i, '');
	const energyPrice = env.PRIVATE_CARD_ENERGY_PRICE ?? env.DEVIN_ENERGY_PRICE;

	if (!pepperHex) {
		throw new Error('Card lookup pepper is not configured.');
	}

	if (!contractAddress) {
		throw new Error('Core ID registry address is not configured.');
	}

	if (!binderPrivateKey) {
		throw new Error('Card binder private key is not configured.');
	}

	if (!signerPrivateKey) {
		throw new Error('Card signer private key is not configured.');
	}

	if (!Number.isFinite(networkId) || networkId <= 0) {
		throw new Error('Core ID network id is invalid.');
	}

	return {
		pepperHex,
		contractAddress,
		rpcUrl,
		networkId,
		binderPrivateKey,
		signerPrivateKey,
		prefix,
		energyPrice
	};
}

function parseBool(value: unknown, fallback = true): boolean {
	if (value == null) return fallback;
	const normalized = String(value).trim().toLowerCase();
	if (['1', 'true', 'yes', 'y'].includes(normalized)) return true;
	if (['0', 'false', 'no', 'n'].includes(normalized)) return false;
	throw new Error(`Invalid boolean value: ${String(value)}`);
}

function normalizeBytes22(value: string, label: string): string {
	const withPrefix = value.startsWith('0x') ? value : `0x${value}`;
	if (!/^0x[0-9a-fA-F]{44}$/.test(withPrefix)) {
		throw new Error(`${label} must be exactly 22 bytes hex.`);
	}
	return withPrefix.toLowerCase();
}

function normalizeSearchHash(value: string): string {
	const withPrefix = value.startsWith('0x') ? value : `0x${value}`;
	if (!/^0x[0-9a-fA-F]{64}$/.test(withPrefix)) {
		throw new Error('searchHash must be a 32-byte hex value.');
	}
	return withPrefix.toLowerCase();
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

export const POST: RequestHandler = async ({ params, request }) => {
	try {
		const body = (await request.json()) as Record<string, unknown>;
		const { bin6, last4 } = resolveCardParts(body);
		const rawName = String(body.name ?? '');
		const name = normalizeName(rawName, { diacritics: 'strip' });
		const coreId = normalizeBytes22(String(body.coreId ?? ''), 'coreId');
		const validity = parseBool(body.validity, true);

		if (rawName !== name || !isValidCardholderName(name)) {
			return json({ error: 'Cardholder name is required.' }, { status: 400 });
		}

		const {
			pepperHex,
			contractAddress,
			rpcUrl,
			networkId,
			binderPrivateKey,
			signerPrivateKey,
			prefix,
			energyPrice
		} = getRequiredConfig();

		const idMaterial = buildLookupIdMaterial(bin6, last4, name);
		const searchHash = normalizeSearchHash(`0x${computePepperedSearchHash(idMaterial, pepperHex)}`);
		const network = Network.from(networkId);
		const provider = new JsonRpcProvider(rpcUrl, network, {
			staticNetwork: network
		});

		const binder = new Wallet({
			key: binderPrivateKey,
			prefix,
			provider
		});

		const signer = new Wallet({
			key: signerPrivateKey,
			prefix,
			provider
		});

		const contract = new Contract(contractAddress, ABI, binder);
		const binderAddress = await binder.getAddress();
		const binderRole = await contract.BINDER_ROLE();
		const hasBinderRole = await contract.hasRole(binderRole, binderAddress);

		if (!hasBinderRole) {
			return json(
				{
					error: `Configured binder address ${binderAddress} does not have BINDER_ROLE.`
				},
				{ status: 500 }
			);
		}

		const domain = {
			name: 'CoreIdRegistry',
			version: '1',
			networkId,
			verifyingContract: contractAddress
		};

		const value = {
			searchHash,
			coreId,
			validity
		};

		const bindDigest = TypedDataEncoder.hash(domain, BIND_TYPES, value);
		const oracleSigEd448 = await signer.signTypedData(domain, BIND_TYPES, value);
		const oraclePubKey = String(await contract.getOraclePubKey()).toLowerCase();
		const signatureOraclePubKey = `0x${oracleSigEd448.slice(-114).toLowerCase()}`;

		if (signatureOraclePubKey !== oraclePubKey) {
			return json(
				{
					error: 'Generated signature does not match current contract oracle pubkey.'
				},
				{ status: 500 }
			);
		}

		const tx = await contract.bind(searchHash, coreId, validity, oracleSigEd448, {
			...(energyPrice ? { energyPrice } : {})
		});
		const receipt = await tx.wait();
		const resolvedCoreId = await contract.getCoreId(searchHash);

		return json({
			cardId: params.id,
			searchHash,
			idMaterial,
			bindDigest,
			transactionHash: tx.hash,
			blockNumber: receipt?.blockNumber ?? null,
			status: receipt?.status ?? null,
			coreId,
			resolvedCoreId,
			matchesExpectedCoreId: String(resolvedCoreId).toLowerCase() === coreId,
			binder: binderAddress
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
