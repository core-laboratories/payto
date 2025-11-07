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

    switch (normalizedCurrency) {
        case 'XCB':
            url = `https://blockindex.net/address/${data.address}`;
            break;
        case 'XAB':
            url = `https://xab.blockindex.net/address/${data.address}`;
            break;
        case 'BTC':
            url = `https://blockstream.info/address/${data.address}`;
            break;
        case 'ETH':
            url = `https://etherscan.io/address/${data.address}`;
            break;
        case 'LTC':
            url = `https://blockchair.com/litecoin/address/${data.address}`;
            break;
        case 'SOL':
            url = `https://explorer.solana.com/address/${data.address}`;
            break;
        case 'BCH':
            url = `https://blockchair.com/bitcoin-cash/address/${data.address}`;
            break;
        case 'BNB':
            url = `https://bscscan.com/address/${data.address}`;
            break;
        case 'ADA':
            url = `https://cardanoscan.io/address/${data.address}`;
            break;
        case 'DOGE':
            url = `https://dogechain.info/address/${data.address}`;
            break;
        case 'XMR':
            url = `https://xmrchain.net/search?value=${data.address}`;
            break;
        case 'DOT':
            url = `https://polkascan.io/polkadot/account/${data.address}`;
            break;
        case 'TRON':
            url = `https://tronscan.org/#/address/${data.address}`;
            break;
        default:
            url = null;
    }

    if (proxy) {
        url = `${urlBase}/proxy/explorer?url=${url}`;
    }

    return url;
}
