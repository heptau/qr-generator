# Contributing

Thank you for your interest in contributing to QR Generator!

## Bug reports

- Use GitHub Issues to report bugs.
- Describe how to reproduce the issue, which browser and device you are using.
- If relevant, include a screenshot.

## Feature requests

- Issues are open for feature requests as well.
- Before opening a new issue, check if a similar request already exists.

## Development

This project is a plain static web application — no build tool, no server.

```bash
# Clone the repository
git clone https://github.com/zbynekvanzura/qr-generator.git
cd qr-generator

# Install development dependencies (linter, formatter)
npm install

# Run linter
npm run lint

# Format code
npm run format
```

### Guidelines

1. **No framework** — The project is intentionally framework-free, use vanilla JS.
2. **Follow `.editorconfig`** — Format files using `npm run format`.
3. **Lint must pass** — Run `npm run lint` before committing.
4. **Service worker** — When adding a new file, add it to the cache in `sw.js`.
5. **QR library** — We use [qrcode.js](https://cdnjs.cloudflare.com/ajax/libs/qrcode/1.5.1/qrcode.min.js) from CDN. Changing the library requires discussion.

## Pull Requests

1. Create a feature branch from `master`.
2. Make sure `npm run lint` and `npm run format:check` pass.
3. If adding a new QR content type, add its configuration to `qrCodeTypes` in `script.js`.
4. Open a PR with a description of the changes.

## License

By contributing, you agree that your code will be licensed under [MIT](LICENSE).
