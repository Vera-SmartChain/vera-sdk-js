# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.1] - 2026-10-18

### Changed
- Repository hygiene: removed environment-specific test wallet paths and debug scripts.
- CI pipeline configured to use `npm stage publish` with npm 11.15.0 and OIDC Trusted Publishing.
- No API changes.

## [0.1.0] - 2026-10-18

### Added
- Initial release of `@verachain/sdk`: read-only, keyless, zero runtime dependencies.
- Subpaths: `@verachain/sdk`, `@verachain/sdk/viem`, `@verachain/sdk/ethers`.
- Typed RPC client `createVeraClient` supporting all public testnet methods.
- Address conversions (`toEvmAddress` with EIP-55, `isVeraAddress`, `isEvmAddress`).
- Lossless unit conversions (`parseVera`, `formatVera`) in BigInt wei.
- Official testnet faucet client with typed rate-limit error handling.
