# PayTo Money

> Decentralized Asset Transfer

The 'payto' URI scheme builder supports payments as outlined in [RFC 8905](https://datatracker.ietf.org/doc/rfc8905/) and subsequent amendments.

## Technical Specifications and Organizational Notes

- [Extended PayTo URI](docs/scheme.md)
- [RFC 8905](https://datatracker.ietf.org/doc/rfc8905/)

## Project Initialization

If you're reading this, you've likely already initialized your project. Congratulations!

```bash
# To create a new project in the current directory
npm create svelte@latest

# To create a new project in the 'my-app' directory
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

You can preview the production build using:

```bash
npm run preview
```

> For deploying your app, you may need to install an [adapter](https://kit.svelte.dev/docs/adapters) suited to your target environment.

## Pro Features

You can see the [Pro plans](https://payto.money/pro) for more information.

To customize the PayPass, you can become the authority of your own PayPass.

Issuing authorities[^authority] deliver an object like this example to the email: [sales@payto.money](mailto:sales@payto.money?subject=PayTo%20Authority%20Request)

### Organization Plan

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
    "customCurrency": {
        "XCB": {
            "symbol": "₡",
            "narrowSymbol": "₡",
            "code": "XCB",
            "name": "CoreCoin",
            "defaultDecimals": 2
        }
    },
    "currencyLocale": "en-US",
    "postForm": false,
    "api": {
        "allowed": false,
        "secret": "your-api-secret-here"
    }
}
```

#### Authority Object Fields

- **`id`** (required): The unique authority ID of the Pass. Must be lowercase, no spaces. This is used to identify your organization. If organization has issued ORIC, it should be the same as the ORIC in lowercase.
  - Example: `"payto"`, `"mycompany"`

- **`name`** (required): The organization name displayed on the Pass. If set, it overrides the user's custom organization name.
  - Example: `"PayTo"`, `"My Company Inc."`

- **`identifier`** (required): The unique Pass Type Identifier in reverse DNS format. This is required by Apple Wallet.
  - Example: `"pass.money.payto"`, `"pass.com.mycompany.wallet"`

- **`url`** (optional): Your organization's website URL. Displayed in the Pass details.
  - Example: `"https://payto.money"`
  - Default: none

- **`icons`** (required): Icon URLs for the Pass. All formats must be PNG. Accepts standard URLs or IPFS links.
  - `icon`: 29x29 px (87x87 px for @3x)
  - `icon2x`: 58x58 px
  - `icon3x`: 87x87 px
  - `logo`: 160x50 px
  - `logo2x`: 320x100 px
  - Default: PayTo logo

- **`theme`** (optional): Color theme for the Pass in hexadecimal format.
  - `colorB`: Background color (e.g., `"#77bc65"`)
  - `colorF`: Foreground color (e.g., `"#192a14"`)
  - `colorTxt`: Text/label color (e.g., `"#192a14"`)
  - Default: PayTo theme (`colorB: "#2A3950"`, `colorF: "#9AB1D6"`)

- **`forceTheme`** (optional): If `true`, forces your theme even if users or system set their own custom colors.
  - Example: `true` or `false`
  - Default: `false`

- **`customCurrency`** (optional): Custom currency definitions for non-standard currencies or tokens.
  - Format: `{ "CURRENCY_CODE": { "symbol", "narrowSymbol", "code", "name", "defaultDecimals" } }`
  - Example: CoreCoin (XCB) with ₡ symbol and 2 decimal places
  - Default: none
  - Library used: [exchange-rounding](https://github.com/bchainhub/exchange-rounding)

- **`currencyLocale`** (optional): The locale used for currency formatting (e.g., `"en-US"`, `"de-DE"`, `"sk-SK"`).
  - Default: undefined (auto-detected from user's browser)

- **`postForm`** (optional): If `true`, allows Pass generation via HTML form submission from any origin.
  - Example: `true` or `false`
  - Default: `false`
  - Note: When enabled, origin checks are bypassed for form submissions

- **`api`** (optional): API access configuration for programmatic Pass generation.
  - `allowed`: Set to `true` to enable API access
  - `secret`: Your API secret key used to generate bearer tokens (HMAC-SHA256)
  - Default: `{ "allowed": false, "secret": "" }`
  - Note: When API is enabled, requests must include `Authorization: Bearer <token>` header
  - Token format: HMAC-SHA256 hash of payload + expiration timestamp (default: 1 minute, configurable via `PRIVATE_API_TOKEN_TIMEOUT` env var)

#### API Access

When `api.allowed` is `true`, you can generate Passes programmatically by:

1. Creating a bearer token using HMAC-SHA256 with your `api.secret`
2. Including the token in the `Authorization` header: `Bearer <token>`
3. Token expires after the configured timeout (default: 1 minute, set via `PRIVATE_API_TOKEN_TIMEOUT` environment variable)

Both `postForm` and `api.allowed` can be enabled simultaneously. The authorization flow checks:

1. If API is allowed and valid bearer token is provided → authorized
2. If postForm is allowed → authorized
3. Otherwise → check origin (must match application origin)

[^authority]: Available for the [Organization plan](https://payto.money/pro#org).

After successfully registering the authority, to issue PayPass directly from payto UI you need to append the `authority` parameter to the URL:

```txt
https://payto.money?authority={id}
```

## PayTo Libraries

- TypeScript/JavaScript: [payto-rl](https://github.com/bchainhub/payto-rl)
- Flutter: [flutter_paytorl](https://github.com/bchainhub/flutter_paytorl)

## License

This project is licensed under the [CORE](LICENSE) License.

## Funding

If you find this project useful, please consider supporting it:

- [GitHub Sponsors](https://github.com/sponsors/core-laboratories)
- [Core](https://blockindex.net/address/cb7147879011ea207df5b35a24ca6f0859dcfb145999)
- [Bitcoin](https://www.blockchain.com/explorer/addresses/btc/bc1pd8guxjkr2p6n2kl388fdj2trete9w2fr89xlktdezmcctxvtzm8qsymg0d)
- [Litecoin](https://www.blockchain.com/explorer/addresses/ltc/ltc1ql8dvx0wv0nh2vncpt9j3zqefaehsd25cwp7pfx)

List of sponsors: [![GitHub Sponsors](https://img.shields.io/github/sponsors/core-laboratories)](https://github.com/sponsors/core-laboratories)
