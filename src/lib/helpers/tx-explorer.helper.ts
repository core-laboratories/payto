/**
 * Returns the transaction explorer URL for a given cryptocurrency, using an object of data.
 * If the currency is not supported, returns `null`.
 * @param {string} currency - The cryptocurrency symbol (e.g., "BTC", "ETH", "XCB").
 * @param {object} data - An object containing data to insert into the URL (e.g., `address`, `txId`).
 * @returns {string | null} The formatted URL or `null` if the currency is not supported.
 */
export function getExplorerUrl(currency: string, data: Record<string, string>, proxy: boolean = false, urlBase: string = 'https://payto.money'): string | null {
	const normalizedCurrency = currency.toUpperCase();
	let url = null;

	const explorers = [
		{
			value: 'xcb',
			url: 'https://blockindex.net/address/${address}'
		},
		{
			value: 'xab',
			url: 'https://xab.blockindex.net/address/${address}'
		},
		{
			value: 'btc',
			url: 'https://blockstream.info/address/${address}'
		},
		{
			value: 'eth',
			url: 'https://etherscan.io/address/${address}'
		},
		{
			value: 'ltc',
			url: 'https://blockchair.com/litecoin/address/${address}'
		},
		{
			value: 'sol',
			url: 'https://explorer.solana.com/address/${address}'
		},
		{
			value: 'bch',
			url: 'https://blockchair.com/bitcoin-cash/address/${address}'
		},
		{
			value: 'bnb',
			url: 'https://bscscan.com/address/${address}'
		},
		{
			value: 'ada',
			url: 'https://cardanoscan.io/address/${address}'
		},
		{
			value: 'doge',
			url: 'https://dogechain.info/address/${address}'
		},
		{
			value: 'xmr',
			url: 'https://xmrchain.net/search?value=${address}'
		},
		{
			value: 'dot',
			url: 'https://polkascan.io/polkadot/account/${address}'
		},
		{
			value: 'trx',
			url: 'https://tronscan.org/#/address/${address}'
		}
	]

	const explorer = explorers.find(explorer => explorer.value === normalizedCurrency);
	if (!explorer) {
		return null;
	}

	if (!data?.address) {
		return null;
	}

	if (proxy) {
		return `${urlBase}/proxy/explorer?chain=${explorer.value}&address=${data.address}`;
	}

	return explorer.url.replace('${address}', data.address);
}
