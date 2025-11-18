import { error } from '@sveltejs/kit';
import { blo } from '@blockchainhub/blo';
import { validateWalletAddress } from 'blockchain-wallet-validator';

export async function GET({ params }: { params: { id: string } }) {
	const address = params.id;

	if (!address) {
		throw error(400, 'Missing address parameter');
	}

	try {
		// Validate the address using blockchain-wallet-validator
		const validation = validateWalletAddress(address, {
			nsDomains: [{ domain: 'card', maxLabelLength: 64, emojiAllowed: false }]
		});

		if (!validation.isValid) {
			throw error(400, 'Invalid blockchain address');
		}

		// Generate identicon using blo
		const identicon = blo(address);

		// Extract base64 data from data URI
		const base64Data = identicon.split(',')[1];
		const svgBuffer = Buffer.from(base64Data, 'base64');

		return new Response(svgBuffer, {
			headers: {
				'Content-Type': 'image/svg+xml',
				'Cache-Control': 'public, max-age=31536000, immutable'
			}
		});
	} catch (err: any) {
		console.error('Failed to generate identicon:', err);
		if (err && typeof err === 'object' && 'status' in err && 'body' in err) {
			throw err;
		}
		throw error(500, err instanceof Error ? err.message : 'Failed to generate identicon');
	}
}

