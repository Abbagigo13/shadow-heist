# Shadow Heist chain integration

The project now contains the first real FHEVM integration layer. The contract is in `contracts/ShadowHeist.sol`, the Hardhat configuration is in `hardhat.config.cjs`, and the browser adapters are in `src/chain.ts`, `src/fhevm.ts`, and `src/liveGame.ts`.

## What is live in this checkpoint

The frontend wallet button connects to an injected Sepolia wallet and rejects other networks. The contract compiles against the current Zama FHEVM Solidity library. The browser adapter uses the current `@zama-fhe/sdk` package to encrypt `euint8` actions and publicly decrypt the result handles. The live transaction adapter has functions for creating a match, joining, submitting an encrypted action, resolving a round, reading match state, and decrypting the round result.

The wallet button now opens a two-option chooser: injected browser wallets such as MetaMask/Rabby, or WalletConnect QR for mobile wallets. Set the public WalletConnect Cloud project ID in `VITE_WALLETCONNECT_PROJECT_ID`; without it, the injected-wallet path still works and the QR path shows a clear setup error. The implementation uses the [official Reown Ethereum provider](https://docs.reown.com/advanced/providers/ethereum) and lazy-loads the QR bundle only when selected.

The visible game screens still default to local mock mode. That is intentional until a deployed address is provided and the two-wallet flow is wired into the screens. This keeps the demo usable without requiring a wallet while the chain path is validated independently.

## Local contract checks

```bash
pnpm contracts:compile
pnpm contracts:test
```

To run a local Hardhat node:

```bash
pnpm contracts:node
pnpm hardhat deploy --network localhost
```

The official Zama FHEVM Hardhat plugin uses a local mock runtime for fast tests. Sepolia remains the required environment for real encrypted values.

The implementation follows Zama’s current [FHEVM Hardhat template](https://github.com/zama-ai/fhevm-hardhat-template), [FHEVM Solidity examples](https://raw.githubusercontent.com/zama-ai/fhevm-hardhat-template/main/contracts/FHECounter.sol), [Zama SDK encryption guide](https://github.com/zama-ai/sdk/blob/main/docs/gitbook/src/guides/encrypt-decrypt.md), and [Zama SDK quick start](https://github.com/zama-ai/sdk/blob/main/docs/gitbook/src/tutorials/quick-start.md).

## Sepolia deployment

Set the Hardhat variables without committing secrets:

```bash
pnpm hardhat vars set MNEMONIC
pnpm hardhat vars set INFURA_API_KEY
pnpm contracts:deploy:sepolia
```

For a test-only deployer account, the Hardhat config also accepts a private key instead of a mnemonic. Use the local prompt and never paste the key into chat, source files, `.env`, or GitHub:

```bash
pnpm hardhat vars set PRIVATE_KEY
pnpm hardhat vars set INFURA_API_KEY
pnpm contracts:deploy:sepolia
```

When `PRIVATE_KEY` is present, it takes precedence for the Sepolia deployer. The Hardhat and local test networks continue to use the configured mnemonic.

After deployment, copy the `ShadowHeist` address into a local Vite environment file:

```bash
VITE_SHADOW_HEIST_ADDRESS=0xYourDeployedAddress
```

Then start the frontend with `pnpm dev`. The wallet must be connected to Sepolia and funded with Sepolia ETH for contract transactions.

## Next integration slice

Wire `createLiveMatch`, `joinLiveMatch`, `submitLiveAction`, `resolveLiveRound`, `readLiveMatch`, and `decryptLiveRound` into the existing React state machine. Add a numeric match-id route or encode the deployed match ID in the share link, then validate a full two-wallet round on Sepolia before polishing the pitch demo.
