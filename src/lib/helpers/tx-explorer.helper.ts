/**
 * Returns the transaction explorer URL for a given cryptocurrency, using an object of data.
 * If the currency is not supported, returns `null`.
 * @param {string} currency - The cryptocurrency symbol (e.g., "BTC", "ETH", "XCB").
 * @param {object} data - An object containing data to insert into the URL (e.g., `address`, `txId`).
 * @returns {string | null} The formatted URL or `null` if the currency is not supported.
 */
export function getExplorerUrl(currency: string, data: Record<string, string>): string | null {
    const normalizedCurrency = currency.toUpperCase();

    switch (normalizedCurrency) {
        case 'XCB':
            return `https://blockindex.net/address/${data.address}`;
        case 'XAB':
            return `https://xab.blockindex.net/address/${data.address}`;
        case 'BTC':
            return `https://blockstream.info/address/${data.address}`;
        case 'ETH':
            return `https://etherscan.io/address/${data.address}`;
        case 'LTC':
            return `https://blockchair.com/litecoin/address/${data.address}`;
        case 'SOL':
            return `https://explorer.solana.com/address/${data.address}`;
        case 'BCH':
            return `https://blockchair.com/bitcoin-cash/address/${data.address}`;
        case 'BNB':
            return `https://bscscan.com/address/${data.address}`;
        case 'ADA':
            return `https://cardanoscan.io/address/${data.address}`;
        case 'DOGE':
            return `https://dogechain.info/address/${data.address}`;
        case 'XMR':
            return `https://xmrchain.net/search?value=${data.address}`;
        case 'DOT':
            return `https://polkascan.io/polkadot/account/${data.address}`;
        case 'TRON':
            return `https://tronscan.org/#/address/${data.address}`;
        default:
            return null;
    }
}
