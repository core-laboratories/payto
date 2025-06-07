# PayTo Scheme

## Specification: PAYTO Uniform Resource Identifier (URI) Scheme

This memo introduces an interim URI scheme for resources that identify a payment recipient. Typically, these resources are resolved by making a payment to the designated recipient. However, resolution may also include non-financial operations, such as sending a message to the recipient. This interpretation expands upon [RFC 8905][RFC8905].

## PAYTO URI Scheme

### Introduction

The PAYTO URI scheme designates the recipient of a payment. The resource designated by this URI is the recipient itself. Typically, when a PAYTO URI is "dereferenced" (used within a context that expects a URI to provide a representation of the resource it identifies), a payment is made to the designated recipient.

### Scheme Syntax

This document defines the 'payto' [Uniform Resource Identifier (URI)][RFC3986] scheme to designate transfer form data for payments.

The general syntax is:

```txt
payto-URI = "payto://" authority path-abempty [ "?" opts ]
    opts = opt *( "&" opt )
    opt-name = generic-opt / authority-specific-opt
    opt-value = *pchar
    opt = opt-name "=" opt-value
    generic-opt = "amount" / "receiver-name" / "sender-name" /
                  "message" / "instruction"
    authority-specific-opt = ALPHA *( ALPHA / DIGIT / "-" / "." )
    authority = ALPHA *( ALPHA / DIGIT / "-" / "." )
```

### Operations

The primary operation on a PAYTO URI is its resolution. This is typically accomplished by making a payment to the designated recipient.

## PayTo Functionalities

### Network

Supported payment types:

- ICAN (International Crypto Asset Network)
- CASH (Void)

Constructors:

For ICAN:

- `xcb` (Core Blockchain)
- `btc` (Bitcoin)
- `eth` (Ethereum)
- `ltc` (Litecoin)
- `xmr` (Monero)
- Other (user-defined)

Example: `payto://${type}/${address}`

Note: Avoid using the `type` for predefined payment types.

For CASH:

- `geo` (Geolocation)
- `plus` (Google Plus Code)
- Other (user-defined)

Example: `payto://void/${type}`

### Address

The address field specifies the recipient's address for the payment. The address can be a cryptocurrency wallet address or a name service of the network (NS).

Supported payment types:

- ICAN (International Crypto Asset Network)

Example: `payto://xcb/${address}`

### Token Code / Address

The token code field specifies the token code for the payment. The token code can be a well-known token on the network (for example, listed on CoinGecko) or a token address of the smart contract.

Supported payment types:

- ICAN (International Crypto Asset Network)

Example: `payto://xcb/${address}?amount=${token_code}:${amount}`

### Chain ID

The chain ID field specifies the blockchain network for the transaction. The chain ID can be the ID of the network such as parachains or enterprise networks. Chain ID is added after the address field, prefixed with `@`.

Supported payment types:

- ICAN (International Crypto Asset Network)

Example: `payto://${type}/${address}@${chain_id}`

### Amount

The amount field specifies the number of assets to be sent. The amount is separated by `:` from the asset code. The asset code is the requested asset on the network (mostly token code or address). The asset code is an optional field and separated by the character `:`. If no asset code is present, the default network currency is used. The amount cannot be negative. The decimal point is marked by `.`.

Supported payment types:

- ICAN (International Crypto Asset Network)
- IBAN (International Bank Account Number)
- ACH (Automated Clearing House)
- UPI (Unified Payments Interface)
- PIX (Central Bank of Brazil)
- BIC (Bank Identifier Code)
- CASH (Void)

Example: `payto://${type}/${address}?amount=${asset_code}:${amount}`

Note: ACH uses the currency noted with a decimal place and is not recalculated to cents.

### Fiat Currency

The fiat field specifies the fiat currency for the transaction. The fiat currency is separated by `:` from the amount. The fiat currency is the government-issued money. The fiat currency is an optional field and separated by the character `:`.

Note: ICAN has Fiat defined in a separate field.

Supported payment types:

- ICAN (International Crypto Asset Network)
- IBAN (International Bank Account Number)
- ACH (Automated Clearing House)
- UPI (Unified Payments Interface)
- PIX (Central Bank of Brazil)
- BIC (Bank Identifier Code)
- CASH (Void)

Examples:

- `payto://iban/${address}?amount=${fiat_currency}:${amount}`
- `payto://xcb/${address}?amount=${asset_code}:${amount}&fiat=${fiat_currency}`

### Expiration (Deadline)

The expiration field specifies the expiration date and time for the transaction. The expiration date and time is expressed in the local timezone and converted to a UNIX timestamp in seconds. Another way it can be defined is as minutes (1-60) from the current time. The expiration time is an optional field. Value as timestamp cannot be lower than the current time, otherwise the payment will be expired. The defined breakpoint is excluded. If the timestamp is in the last 30 minutes, the countdown will be shown. If the minutes value is defined, the countdown will be shown.

Supported payment types:

- ICAN (International Crypto Asset Network)

Example: `payto://xcb/${address}?amount=${asset_code}:${amount}&dl=${expiration}`

### Recurring payments

The recurring field specifies the recurrence of the payment. The recurring payment is an optional field. The recurring payment is prefixed with `rc` and the value is `y` for yearly, `m` for monthly, `w` for weekly, and `d` for daily. If `d` is prefixed with a number between `2-365`, it indicates the recurrence every "number" of days. Due to varying month lengths, if a chosen day doesn't exist in a subsequent month, the payment will execute on the last day of that month.

Supported payment types:

- ICAN (International Crypto Asset Network)
- IBAN (International Bank Account Number)
- ACH (Automated Clearing House)
- UPI (Unified Payments Interface)
- PIX (Central Bank of Brazil)

Example: `payto://${type}/${address}?amount=${asset_code}:${amount}&rc=${recurring}`

### Transaction split

The split field specifies the split of the transaction. The split is an optional field. The value is the amount to be deducted followed by `@` and the second address in the network to deposit that amount. If the split is prefixed with `p:` it indicates that the value is in percentage. Value cannot be higher than the amount and both should be defined. In case of percentage, the maximum value is 100. If split is correctly defined, two transactions will be streamed.

Supported payment types:

- ICAN (International Crypto Asset Network)

Example: `payto://xcb/${address}?amount=${asset_code}:${amount}&split=p:${split}@${split_address}`

### Swap

The **Swap** functionality in the PAYTO URI scheme enables automatic asset conversion during ICAN payments. By including the `swap` parameter in the URI, users can specify an asset code to which the payment amount should be automatically converted. This feature facilitates seamless transactions where the recipient prefers to receive a different asset than the one sent by the payer.

For instance, a URI formatted as `payto://xcb/${address}?swap=${asset_code}` will instruct the payment system to convert the incoming asset to the specified `asset_code` before completing the transaction. The conversion rate and fees are determined at the time of the swap, ensuring that the recipient receives the specified asset in their preferred form.

#### Supported use case

- Simplifies payments by enabling direct asset conversion.
- Ensures recipients can receive payments in their desired asset.
- Reduces manual conversion steps post-payment.

Example:

```txt
payto://xcb/recipientAddress?swap=ctn
```

### IBAN

The IBAN field specifies the IBAN for the transaction. The IBAN is the International Bank Account Number. The IBAN is a required field.

Supported payment types:

- IBAN (International Bank Account Number)

Example: `payto://iban/${iban}?amount=${fiat_currency}:${amount}`

### BIC / SWIFT

The BIC field specifies the BIC for the transaction. The BIC is the Bank Identifier Code. The BIC is a required field.

Supported payment types:

- IBAN (International Bank Account Number)
- BIC (Bank Identifier Code)

Examples:

- `payto://iban/${iban}?amount=${fiat_currency}:${amount}`
- `payto://bic/${bic}?amount=${fiat_currency}:${amount}`

### Beneficiary Full Name

The beneficiary field specifies the full name of the beneficiary for the transaction. The beneficiary is the recipient of the payment. The beneficiary is an optional or required field.

Supported payment types:

- IBAN (International Bank Account Number)
- ACH (Automated Clearing House)
- UPI (Unified Payments Interface)
- PIX (Central Bank of Brazil)
- CASH (Void)

Example: `payto://iban/${iban}?amount=${fiat_currency}:${amount}&receiver-name=${beneficiary}`

### Message for Beneficiary / Message / Description

The message field specifies the message for the beneficiary. The message is an optional field.

Supported payment types:

- IBAN (International Bank Account Number)
- UPI (Unified Payments Interface)
- PIX (Central Bank of Brazil)
- CASH (Void)

Example: `payto://iban/${iban}?amount=${fiat_currency}:${amount}&message=${message}`

### Transaction ID

The transaction ID field specifies the unique identifier for the transaction. The transaction ID is an optional field.

Supported payment types:

- PIX (Central Bank of Brazil)

Example: `payto://pix/${pix}?amount=${fiat_currency}:${amount}&id=${transaction_id}`

### Location

The location field specifies the geolocation (or other identifier) for the transaction to take place. The location is expressed in latitude and longitude (in decimal degrees) for transport network `geo`; in plus code (from Google) for transport network `plus` and `other` can be custom defined. The location is a required field. Latitude and longitude are divided by `,`.

You can generate:

- [Geolocation](https://www.latlong.net/)
- [Google Plus Code](https://plus.codes/)

Supported payment types:

- CASH (Void)

Examples:

- `payto://void/geo?loc=${latitude},${longitude}`
- `payto://void/plus?loc=${plus_code}`

Open navigation apps with the payto locations are possible via the [geo URI scheme](https://en.wikipedia.org/wiki/Geo_URI_scheme) or [comgooglemaps URI scheme](https://developers.google.com/maps/documentation/urls/get-started#universal-cross-platform-syntax), alternatively any other map application.

### Pass

The PAYTO URI scheme is designed to be flexible and extensible. It allows for the inclusion of additional parameters to support various payment types and use-cases. The scheme is intended to be used in a wide range of applications, including web browsers, mobile apps, and other software that handles payments. For these purposes, you can define the payment instruction with some of the possibilities:

- Company name (`org`) - 25 characters max
- Item name (`item`) - 40 characters max
- Foreground color (`color-f`)
- Background color (`color-b`)
- Barcode type (`barcode`)

Foreground and background color are defined in hexadecimal format (without `#` sign). They are compared between each other with Color Euclidean distance. Minimum distance is 100.

Default barcode type is `qr`. Supported types are `qr`, `pdf417`, `aztec`.

Example: `payto://xcb/${address}?amount=${asset_code}:${amount}&org=${company_name}&item=${item_name}&color-f=${foreground_color}&color-b=${background_color}&barcode=${barcode_type}`

### Donations

The PAYTO URI scheme can be used to facilitate donations to charitable organizations, non-profit groups, and other causes. The scheme allows to indicate donations (`donate`) with boolean value `1` for true and `0` or missing the declaration for false.

Example: `payto://xcb/${address}?amount=${asset_code}:${amount}&donate=1`

### Security Considerations

Always validate the authenticity and correctness of PAYTO URIs. Due to the irreversible nature of crypto asset transactions, users should confirm both the recipient's address and the amount before initiating a transfer.

### Normative References

[RFC3986]: https://www.rfc-editor.org/rfc/rfc3986 (Berners-Lee, T., Fielding, R., and L. Masinter, "Uniform Resource Identifier URI: Generic Syntax", STD 66, RFC 3986, DOI 10.17487/RFC3986, January 2005.)

RFC3986: (Berners-Lee, T., Fielding, R., and L. Masinter, "Uniform Resource Identifier URI: Generic Syntax", STD 66, RFC 3986, DOI 10.17487/RFC3986, January 2005.)

[RFC8905]: https://www.rfc-editor.org/rfc/rfc8905 (Thaler, D., "The 'payto' URI Scheme for Payments", RFC 8905, DOI 10.17487/RFC8905, October 2020.)

RFC8905: (Thaler, D.), "The 'payto' URI Scheme for Payments", RFC
