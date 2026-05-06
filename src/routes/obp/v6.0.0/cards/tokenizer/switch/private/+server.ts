import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { Contract, JsonRpcProvider, Network, Wallet } from 'corebc';
import { env } from '$env/dynamic/private';

const DEFAULT_RPC_URL = 'https://xcbapi.coreblockchain.net';
const DEFAULT_NETWORK_ID = 1;

const ABI = [
	'function paused() view returns (bool)',
	'function switchPause()'
];

function getRequiredConfig() {
	const contractAddress = env.PRIVATE_CARD_CORE_ID_REGISTRY ?? env.DEVIN_CORE_ID_REGISTRY;
	const rpcUrl = env.PRIVATE_CARD_RPC_URL ?? env.DEVIN_RPC_URL ?? DEFAULT_RPC_URL;
	const networkId = Number(
		env.PRIVATE_CARD_NETWORK_ID ?? env.DEVIN_NETWORK_ID ?? String(DEFAULT_NETWORK_ID)
	);
	const privateKey = env.PRIVATE_CARD_ADMIN_PRIVATE_KEY ?? env.CORE_PRIVATE_KEY;
	const prefix = (env.PRIVATE_CARD_PREFIX ?? env.DEVIN_PREFIX ?? 'ab').replace(/^0x/i, '');
	const energyPrice = env.PRIVATE_CARD_ENERGY_PRICE ?? env.DEVIN_ENERGY_PRICE;

	if (!contractAddress) {
		throw new Error('Core ID registry address is not configured.');
	}

	if (!privateKey) {
		throw new Error('Card admin private key is not configured.');
	}

	if (!Number.isFinite(networkId) || networkId <= 0) {
		throw new Error('Core ID network id is invalid.');
	}

	return {
		contractAddress,
		rpcUrl,
		networkId,
		privateKey,
		prefix,
		energyPrice
	};
}

export const POST: RequestHandler = async () => {
	try {
		const { contractAddress, rpcUrl, networkId, privateKey, prefix, energyPrice } =
			getRequiredConfig();

		const network = Network.from(networkId);
		const provider = new JsonRpcProvider(rpcUrl, network, {
			staticNetwork: network
		});

		const signer = new Wallet({
			key: privateKey,
			prefix,
			provider
		});

		const contract = new Contract(contractAddress, ABI, signer);

		const pausedBefore = Boolean(await contract.paused());
		const tx = await contract.switchPause({
			...(energyPrice ? { energyPrice } : {})
		});
		const receipt = await tx.wait();
		const pausedAfter = Boolean(await contract.paused());

		return json({
			networkId,
			contractAddress,
			pausedBefore,
			pausedAfter,
			transactionHash: tx.hash,
			blockNumber: receipt?.blockNumber ?? null,
			status: receipt?.status ?? null
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Failed to switch pause state.';
		return json({ error: message }, { status: 500 });
	}
};
