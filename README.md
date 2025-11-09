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

```jsonc
{
  "id": "pingchb2", // ORIC in lowercase, no spaces
  "name": "Ping Exchange", // Organization name
  "url": "https://ping.exchange", // Organization website
  "icons": { // Organization icons
    "apple": { // Apple Wallet icons
      "icon": "https://…/icons/apple/icon.png", // Icon 29x29 px
      "icon2x": "https://…/icons/apple/icon@2x.png", // Icon 58x58 px
      "icon3x": "https://…/icons/apple/icon@3x.png", // Icon 87x87 px
      "logo": "https://…/icons/apple/logo.png", // Logo 160x50 px
      "logo2x": "https://…/icons/apple/logo@2x.png", // Logo 320x100 px
      "logo3x": "https://…/icons/apple/logo@3x.png" // Logo 480x150 px
    },
    "google": { // Google Wallet icons
      "logo": "https://…/icons/google/logo.png", // Logo 160x50 px
      "icon": "https://…/icons/google/icon.png", // Icon 29x29 px
      "hero": "https://…/icons/google/hero.png", // Hero image
    }
  },
  "theme": { // Organization theme
    "colorB": "#77bc65", // Background color
    "colorF": "#192a14", // Foreground color
    "colorTxt": "#192a14" // Text/label color
  },
  "forceTheme": false, // If true, forces your theme even if users or system set their own custom colors
  "data": { // Organization data
    "google": { // Google Wallet data
      "redemptionIssuers": [ // Redemption issuers for Google Wallet
        "1234567890" // Redemption issuer ID
      ],
      "enableSmartTap": true // Enable Smart Tap (NFC) for Google Wallet
    }
  },
  "customCurrency": { // Custom currency definitions for non-standard currencies or tokens
    "XCB": {
      "symbol": "₡",
      "narrowSymbol": "₡",
      "code": "XCB",
      "name": "CoreCoin",
      "defaultDecimals": 2
    }
  },
  "currencyLocale": "en-US", // The locale used for currency formatting (e.g., `"en-US"`, `"de-DE"`, `"sk-SK"`)
  "postForm": false, // If true, allows Pass generation via HTML form submission from any origin
  "api": { // API access configuration for programmatic Pass generation
    "allowed": false, // Set to `true` to enable API access
    "secret": "your-api-secret-here" // Your API secret key used to generate bearer tokens (HMAC-SHA256)
  },
  "beacons": [ // Custom iBeacon proximity triggers to PayPasses
    {
      "proximityUUID": "F8F589E9-C07E-58B0-AEAB-A36BE4D48FAC", // The UUID of the iBeacon
      "relevantText": "You're near my store", // The text displayed when the iBeacon is in range
      "name": "My Store" // The name of the iBeacon
    }
  ]
}
```

#### Authority Object Fields

- **`id`** (required): The unique authority ID of the Pass. Must be a valid ORIC (Organization Registry Identification Code) in lowercase, no spaces.
  - Example: `"pingchb2"`

- **`name`** (required): The organization name displayed on the Pass. If set, it overrides the user's custom organization name.
  - Example: `"PayTo"`, `"My Company Inc."`

- **`url`** (optional): Your organization's website URL. Displayed in the Pass details.
  - Example: `"https://payto.money"`
  - Default: none

- **`icons`** (optional): Icon URLs for the Pass organized by platform. All formats must be PNG. Accepts standard URLs or IPFS links.
  - **`apple`** (object): Apple Wallet icons
    - `icon`: 29x29 px
    - `icon2x`: 58x58 px
    - `icon3x`: 87x87 px
    - `logo`: 160x50 px
    - `logo2x`: 320x100 px
    - `logo3x`: 480x150 px
  - **`google`** (object): Google Wallet icons
    - `logo`: 160x50 px
    - `icon`: 29x29 px
    - `hero`: Hero image
  - **Unified**: Same icons are used for both platforms when available, with platform-specific fallbacks
  - Default: PayTo logo with automatic dev/prod URL resolution

- **`theme`** (optional): Color theme for the Pass in hexadecimal format.
  - `colorB`: Background color (e.g., `"#77bc65"`)
  - `colorF`: Foreground color (e.g., `"#192a14"`)
  - `colorTxt`: Text/label color (e.g., `"#192a14"`)
  - Default: PayTo theme (`colorB: "#2A3950"`, `colorF: "#9AB1D6"`)

- **`forceTheme`** (optional): If `true`, forces your theme even if users or system set their own custom colors.
  - Example: `true` or `false`
  - Default: `false`

- **`data`** (optional): Organization data.
  - `google`: Google Wallet data
    - `redemptionIssuers`: Redemption issuers for Google Wallet (array of strings)
      - Example: `["1234567890"]`
      - Default: none
    - `enableSmartTap`: Enable Smart Tap (NFC) for Google Wallet
      - Example: `true` or `false`
      - Default: `true`
  - Default: none

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

- **`beacons`** (optional): Custom iBeacon proximity triggers to PayPasses.
  - Format: `[ { "proximityUUID": "F8F589E9-C07E-58B0-AEAB-A36BE4D48FAC", "relevantText": "You're near my store", "name": "My Store" } ]`
  - Default: none

#### API Access

When `api.allowed` is `true`, you can generate Passes programmatically by:

1. Creating a bearer token using HMAC-SHA256 with your `api.secret`
2. Including the token in the `Authorization` header: `Bearer <token>`
3. Token expires after the configured timeout (default: 1 minute, set via `PRIVATE_API_TOKEN_TIMEOUT` environment variable)

Both `postForm` and `api.allowed` can be enabled simultaneously. The authorization flow checks:

1. If API is allowed and valid bearer token is provided → authorized
2. If postForm is allowed → authorized
3. Otherwise → check origin (must match application origin)

### Pass Generation API

Both `postForm` and API accept the same payload structure for generating Passes.

#### Request Methods

- Method: `POST`
- Endpoint: `https://payto.money/pass?authority={id}`
- Content-Type: `application/json` (for API) or `application/x-www-form-urlencoded` (for forms)
- Headers (for API): `Authorization: Bearer <token>`

#### Payload Structure

**Required Fields:**

- **`hostname`** (string): Payment type identifier
  - Examples: `"ican"`, `"ach"`, `"iban"`, `"bic"`, `"upi"`, `"pix"`, `"void"`

- **`props`** (object): Network and payment parameters
  - **`network`** (string): Network identifier (e.g., `"btc"`, `"eth"`, `"core"`, `"geo"`, `"plus"`, etc.)
  - **`destination`** (string): Payment destination address
  - **`params`** (object): Payment parameters
    - **`amount`** (object): Payment amount
      - `value` (number): Amount value
    - **`message`** (object, optional): Payment message
      - `value` (string): Message text
    - **`rc`** (object, optional): Recurring payment
      - `value` (string): Recurrence period (`"daily"`, `"weekly"`, `"monthly"`, `"yearly"`)
    - **`dl`** (object, optional): Deadline/expiration
      - `value` (number): Unix timestamp or minutes (1-60)
    - **`donate`** (object, optional): Donation flag
      - `value` (number): 0 or 1
    - **`loc`** (object, optional): Location (for `void` payments with `geo` or `plus` network)
      - `value` (string): Coordinates or Plus Code
  - **`split`** (object, optional): Split payment
    - `value` (number): Split amount or percentage
    - `isPercent` (boolean): Whether split is percentage
    - `address` (string): Split destination address
  - **`design`** (object, optional): Custom design for this payment
    - `item` (string): Item description

**Optional Fields:**

- **`design`** (object): Visual customization
  - **`org`** (string): Organization name (overrides authority name if not forced)
  - **`colorF`** (string): Foreground color (hex, e.g., `"#9AB1D6"`)
  - **`colorB`** (string): Background color (hex, e.g., `"#2A3950"`)
  - **`barcode`** (string): Barcode type (`"qr"`, `"pdf417"`, `"aztec"`, `"code128"`)
  - **`rtl`** (boolean): Right-to-left layout
  - **`lang`** (string): Language code (e.g., `"en"`, `"de"`, `"sk"`, `"zh-CN"`, `"ko-KR"`)
  - **`item`** (string): Item description

- **`destination`** (string, form data only): Payment destination address
  - When provided as a **form field** (not in JSON API), this overrides `props.destination`
  - Useful for dynamic destination addresses in HTML forms
  - Only works with `application/x-www-form-urlencoded` requests, not JSON API requests

- **`membership`** (string, optional): Member address for tracking
- **`authority`** (string, optional): Authority ID (auto-populated from URL parameter)
- **`os`** (string, optional): Target operating system (`"ios"`, `"android"`, or `"unknown"`)
  - Auto-detected from user agent if not specified
  - Determines which wallet integration to use

#### Example 1: ICAN Payment (HTML Form)

```html
<!-- Form submission from external website -->
<form method="POST" action="https://payto.money/pass?authority=oric">
  <input type="hidden" name="hostname" value="ican" />

  <input type="hidden" name="props" value='{
    "network": "xcb",
    "destination": "cb7147879011ea207df5b35a24ca6f0859dcfb145999",
    "params": {
      "amount": { "value": "10.50" },
      "message": { "value": "Invoice #INV-2024-001" },
      "id": { "value": "INV-2024-001" },
      "rc": { "value": "monthly" }
    }
  }' />

  <input type="hidden" name="design" value='{
    "colorF": "#10B981",
    "colorB": "#065F46",
    "barcode": "qr",
    "lang": "en",
    "org": "My Company Inc.",
    "item": "Premium Subscription"
  }' />

  <button type="submit">Download PayPass</button>
</form>
```

#### Example 2: ICAN Payment (API Request)

```bash
curl -X POST https://payto.money/pass?authority=oric \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "hostname": "ican",
    "props": {
      "network": "core",
      "destination": "cb7147879011ea207df5b35a24ca6f0859dcfb145999",
      "params": {
        "amount": { "value": "100.50" },
        "message": { "value": "Invoice #INV-2024-001" },
        "id": { "value": "INV-2024-001" },
        "rc": { "value": "monthly" }
      }
    },
    "design": {
      "colorF": "#10B981",
      "colorB": "#065F46",
      "barcode": "qr",
      "lang": "en",
      "org": "My Company Inc.",
      "item": "Premium Subscription"
    }
  }'
```

#### Example 3: Form with Dynamic Destination Override

```html
<!-- Using destination field to override props.destination -->
<form method="POST" action="https://payto.money/pass?authority=oric" enctype="application/x-www-form-urlencoded">
  <input type="hidden" name="hostname" value="ican" />

  <!-- User can input their own address -->
  <label for="userAddress">Your Wallet Address:</label>
  <input type="text" id="userAddress" name="destination" value="cb7147879011ea207df5b35a24ca6f0859dcfb145999" required />

  <!-- Props contains default/fallback destination -->
  <input type="hidden" name="props" value='{
    "network": "xcb",
    "destination": "default-address-will-be-overridden",
    "params": {
      "amount": { "value": "50" },
      "message": { "value": "Donation" }
    }
  }' />

  <input type="hidden" name="design" value='{
    "colorF": "#10B981",
    "colorB": "#065F46",
    "barcode": "qr",
    "lang": "en"
  }' />

  <button type="submit">Generate Pass for My Address</button>
</form>
```

**Note:** The form field `destination` will override `props.destination`, allowing users to input their own wallet address dynamically.

#### Example: Complete Payload

```json
{
  "hostname": "ican",
  "props": {
    "network": "xcb",
    "destination": "cb71...",
    "params": {
      "amount": {
        "value": 100
      },
      "message": {
        "value": "Monthly subscription"
      },
      "rc": {
        "value": "monthly"
      },
      "dl": {
        "value": 30
      },
      "donate": {
        "value": 0
      }
    },
    "split": {
      "value": 10,
      "isPercent": true,
      "address": "cb72..."
    },
    "design": {
      "item": "Premium Plan"
    }
  },
  "design": {
    "org": "My Company",
    "colorF": "#192a14",
    "colorB": "#77bc65",
    "barcode": "qr",
    "rtl": false,
    "lang": "en",
    "item": "Premium Subscription"
  },
  "membership": "cb73..."
}
```

**Response:**

- **iOS/Apple Wallet**: `.pkpass` file download (binary)
- **Android/Google Wallet**: JSON response with `saveUrl` for Google Wallet integration
- **Error**: JSON with error message and HTTP status code

#### OS Detection and Wallet Integration

The PayPass generation system automatically detects the user's operating system and provides appropriate wallet integration:

- **iOS Detection**: Shows "Add PayPass to Apple Wallet" button, generates `.pkpass` file
- **Android Detection**: Shows "Add PayPass to Google Wallet" button, generates Google Wallet save link
- **Unknown/Desktop**: Shows both wallet options for maximum compatibility

The system uses `navigator.userAgent` to detect iOS (`iphone|ipad|ipod`) and Android (`android`) devices, providing a seamless user experience across all platforms.

#### UI Enhancements

The PayPass generation interface includes:

- **Responsive Design**: Buttons adapt to screen size (half-width on desktop, full-width stacked on mobile)
- **OS-Aware Interface**: Shows only relevant wallet button when OS is detected, both buttons when unknown
- **Consistent Styling**: Unified button design with proper icon sizing and spacing
- **Accessibility**: Proper focus states, ARIA labels, and keyboard navigation support
- **Visual Feedback**: Loading states, disabled states, and hover effects for better UX

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
