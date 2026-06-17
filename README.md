# QR Generator

A simple client-side QR code generator. All processing happens in your browser — nothing is sent to a server.

Available at [qr-generator.80.cz](https://qr-generator.80.cz)

## Supported content types

- Text
- URL
- Wi-Fi network
- Geolocation
- Email
- Phone number
- SMS message
- SEPA payment (EUR)
- QR Payment (CZ – SPAYD)

## Usage

Open `index.html` in any modern browser. No build step or installation required.

```bash
# Just open in a browser
open index.html
```

## Development

```bash
# Install dependencies (linter, formatter)
npm install

# Run linter
npm run lint

# Format code
npm run format
```

## Features

- **Extremely small PNG files** — Uses a custom 1-bit indexed PNG encoder that produces up to 80% smaller files than conventional canvas-based generators, while preserving full QR code quality.
- Fully client-side — nothing is sent to a server
- i18n — supports Czech, English, and Spanish (auto-detected from browser language)

## Tech stack

- HTML, CSS, Vanilla JavaScript (no framework)
- [qrcode.js](https://cdnjs.cloudflare.com/ajax/libs/qrcode/1.5.1/qrcode.min.js) for QR code generation
- No build tool – plain static files

## License

MIT
