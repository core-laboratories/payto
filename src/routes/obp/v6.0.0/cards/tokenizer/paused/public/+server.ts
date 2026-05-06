import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { Contract, JsonRpcProvider, Network } from 'corebc';
import { env } from '$env/dynamic/private';

const DEFAULT_RPC_URL = 'https://xcbapi.coreblockchain.net';
const DEFAULT_NETWORK_ID = 1;

const ABI = ['function paused() view returns (bool)'];

function getRequiredConfig() {
	const contractAddress = env.PRIVATE_CARD_CORE_ID_REGISTRY ?? env.DEVIN_CORE_ID_REGISTRY;
	const rpcUrl = env.PRIVATE_CARD_RPC_URL ?? env.DEVIN_RPC_URL ?? DEFAULT_RPC_URL;
	const networkId = Number(
		env.PRIVATE_CARD_NETWORK_ID ?? env.DEVIN_NETWORK_ID ?? String(DEFAULT_NETWORK_ID)
	);

	if (!contractAddress) {
		throw new Error('Core ID registry address is not configured.');
	}

	if (!Number.isFinite(networkId) || networkId <= 0) {
		throw new Error('Core ID network id is invalid.');
	}

	return {
		contractAddress,
		rpcUrl,
		networkId
	};
}

export const GET: RequestHandler = async () => {
	try {
		const { contractAddress, rpcUrl, networkId } = getRequiredConfig();
		const network = Network.from(networkId);
		const provider = new JsonRpcProvider(rpcUrl, network, {
			staticNetwork: network
		});
		const contract = new Contract(contractAddress, ABI, provider);
		const paused = Boolean(await contract.paused());

		return json({
			paused,
			networkId
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Failed to read paused state.';
		return json({ error: message }, { status: 500 });
	}
};
