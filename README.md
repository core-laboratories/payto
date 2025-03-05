# PayTo Money

> Decentralized Asset Transfer

The 'payto' URI scheme builder supports Payments as outlined in [RFC 8905](https://datatracker.ietf.org/doc/rfc8905/) and subsequent amendments.

## Technical Specifications and Organizational Notes

- [Extended PayTo URI](docs/scheme.md)
- [RFC 8905](https://datatracker.ietf.org/doc/rfc8905/)

## PayTo libraries

Typescript / JavaScript:

- [PayTo resource locator](https://github.com/core-laboratories/payto-rl)

## Project Initialization

If you're reading this, you've likely already initialized your project. Congratulations!

```bash
# To create a new project in the current directory
npm create svelte@latest

# To create a new project in 'my-app' directory
npm create svelte@latest my-app
```

## Development

After initializing your project and installing the necessary dependencies with `npm install` (or `pnpm install` or `yarn`), you can start a development server:

```bash
npm run dev

# To start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```bash
npm run build
```

The production build can be previewed using `npm run preview`.

> For deploying your app, you may need to install an [adapter](https://kit.svelte.dev/docs/adapters) suited to your target environment.

## Pro features

You can see the [Pro plans](https://payto.money/pro) for more information.

To customize the Pass, you can become the authority of your own Pass. Each authority has maximum validity of pass 3 years instead of 1 year.

Issuing authorities[^authority] are delivering object as this example to e-mail: [sales@payto.money](mailto:sales@payto.money?subject=PayTo%20Authority%20Request)

```json
{
    "id": "payto",
    "name": "PayTo",
    "identifier": "pass.money.payto",
    "url": "https://payto.money",
    "icons": {
        "icon": "https://payto.money/icons/icon.png",
        "icon2x": "https://payto.money/icons/icon@2x.png",
        "icon3x": "https://payto.money/icons/icon@3x.png",
        "logo": "https://payto.money/icons/logo.png",
        "logo2x": "https://payto.money/icons/logo@2x.png"
    },
    "theme": {
        "colorB": "#77bc65",
        "colorF": "#192a14",
        "colorTxt": "#192a14"
    },
    "forceTheme": false,
    "customCurrencyData": {
        "XCB": {
            "symbol": "₡",
            "narrowSymbol": "₡",
            "code": "XCB",
            "name": "CoreCoin",
            "defaultDecimals": 2
        }
    },
    "currencyLocale": "en-US"
}
```

Where:

- `id` is the authority id of the Pass. (Required, Unique, Lowercase no spaces)
- `name` is the organization name of the Pass. If set it is forced to the Pass. (Default: PayTo)
- `identifier` is the identifier of the Pass. (Required, Unique, Lowercase - Reverse DNS example: `pass.money.payto`)
- `url` is the url of the Pass. (Default: none)
- `icons` is the icons of the Pass. (Default: PayTo logo)
- `theme` is the theme of the Pass. (Default: PayTo theme)
- `forceTheme` do you want to force the theme if the user has set it's own? (Default: false)
- `customCurrencyData` is the custom currency data of the Pass. (Default: none)
- `currencyLocale` is the currency locale of the Pass. (Default: undefined - autodetect)

[^authority] are available for the [Business plan](https://payto.money/pro).

After successful registering the authority, you need to append to the url the `authority` parameter.

```txt
https://payto.money?authority={id}
```

## License

This project is licensed under the [CORE](LICENSE) License.

## Funding

If you find this project useful, please consider supporting it:

- [GitHub Sponsors](https://github.com/sponsors/core-laboratories)
- [Core](https://blockindex.net/address/cb7147879011ea207df5b35a24ca6f0859dcfb145999)
- [Bitcoin](https://www.blockchain.com/explorer/addresses/btc/bc1pd8guxjkr2p6n2kl388fdj2trete9w2fr89xlktdezmcctxvtzm8qsymg0d)
- [Litecoin](https://www.blockchain.com/explorer/addresses/ltc/ltc1ql8dvx0wv0nh2vncpt9j3zqefaehsd25cwp7pfx)

List of sponsors: [![GitHub Sponsors](https://img.shields.io/github/sponsors/core-laboratories)](https://github.com/sponsors/core-laboratories)
