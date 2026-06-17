# AGENTS.md — QR Generator

## Project structure

```
docs/                    ← GitHub Pages root
  index.html
  style.css
  script.js
  manifest.json
  sw.js
  qr-generator-logo.png
  lang/
    i18n.js              ← Language detection + loader
    cs.js                ← Czech translations
    en.js                ← English translations (fallback)
    es.js                ← Spanish translations
root:
  CONTRIBUTING.md
  README.md
  AGENTS.md
  Makefile
  package.json           ← Dev dependencies (ESLint, Prettier)
  eslint.config.mjs
  .prettierrc
  .editorconfig
  .gitignore
  .github/workflows/ci.yml
  LICENSE                ← MIT
```

## Architecture

- Vanilla JS, no framework, no bundler
- All code wrapped in an IIFE (`(function() { 'use strict'; ... })()`)
- Global scope is kept clean — only `window.getCurrentGeolocation` and `window.__` are exposed
- The app is initialized in `appInit()` which waits for `i18n-ready` event before proceeding

## i18n system

- `i18n.js` detects browser language and loads the corresponding language file
- Each language file defines `window.__(key)` returning translated text
- Static HTML is translated via `data-i18n` attributes
- Dynamic form fields use `labelKey`, `placeholderKey`, `textKey` in config and resolve them with `tr()` → `window.__()`
- Fallback to English for unsupported languages
- Key naming convention: `namespace.key` (e.g. `field.ssid`, `msg.enterData`, `qrType.wifi`)

## QR code export

- Custom PNG encoder producing 1-bit indexed PNG (color type 3, bit depth 1)
- Module size: 8px, quiet zone: 16px
- Compression via `CompressionStream('deflate')`
- No transparency, exactly 2 colors
- The `createOptimizedQrBlob()` function handles all export logic

## QR type config

Located in `qrCodeTypes` in `script.js`. Each type has:

- `fields[]` — array of field descriptors with `labelKey`, `placeholderKey`, `textKey`
- `formatter(data)` — returns the QR content string

## Coding conventions

- Tabs for indentation, tab width 3
- Single quotes for strings
- Trailing commas where possible
- `no-unused-vars` is a warning (not error), `caughtErrors: "none"`
- `no-undef` is an error
- Run `npm run lint` and `npm run format` before committing
- ESLint 9 flat config with `globals` package for browser + service worker globals

## Building

No build step. Just serve the `docs/` folder as a static site.
