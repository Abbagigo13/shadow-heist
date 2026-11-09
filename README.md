# Shadow Heist

Shadow Heist is a confidential two-player strategy arcade built with React, Solidity, and Zama FHEVM. Players secretly choose **Steal**, **Guard**, or **Scout**. Their actions are encrypted before they reach the contract, the contract evaluates the game logic over encrypted values, and the result is revealed only after both moves are committed.

> The game is designed to make confidential computing tangible: you can play the complete flow in demo mode, then inspect the contract and wallet/FHE adapters that power the live path.

## Why build this game?

Public blockchains make it difficult to hide strategy. If a player’s move is visible before an opponent commits, the game can be manipulated by observation. Shadow Heist uses FHE to create a small, understandable example of a sealed strategy round:

1. Player A chooses an action.
2. Player B chooses an action.
3. Both choices remain encrypted.
4. The contract computes the winner and points without reading plaintext actions.
5. The result handles become publicly decryptable after resolution.

The project is intentionally small enough for a two-minute demo, while exposing the important production seams: wallet connection, encrypted input proofs, ACL permissions, homomorphic comparisons, random events, public decryption, and on-chain lifecycle events.

## Explore the game

### Fastest path: demo mode

The visible React experience works without a wallet:

1. Run the app with `pnpm dev` or open the managed Preview.
2. On the lobby, select **Create a vault**.
3. In the waiting room, select **Simulate rival**.
4. Enter the game.
5. Pick **Steal**, **Guard**, or **Scout**.
6. Select **Seal my move**.
7. Watch the staged flow: encrypting, submitting, waiting, resolving, and decrypting.
8. Read the revealed actions and result.
9. Continue to the next round or start a rematch.

The demo uses local React state and a deterministic rival sequence so the experience is repeatable without a chain or wallet.

### Wallet exploration

Click **Connect wallet** in the header. The chooser supports:

- **Browser wallet:** MetaMask, Rabby, Coinbase Wallet, or another injected EIP-1193 wallet.
- **WalletConnect:** QR connection for mobile wallets.

The app validates Sepolia. To enable the WalletConnect QR option, create a public project ID and set:

```bash
VITE_WALLETCONNECT_PROJECT_ID=your_public_project_id
```

The environment template is [.env.example](./.env.example).

## Current implementation status

### Complete

- Polished lobby, waiting room, and round UI.
- Demo game state machine and result presentation.
- Injected wallet connection with Sepolia validation.
- WalletConnect QR connection with lazy loading.
- FHEVM Solidity contract for match creation, joining, encrypted actions, encrypted resolution, and public result handles.
- Current Zama SDK adapter for encrypted `euint8` action inputs and public result decryption.
- Live transaction adapter for create, join, submit, resolve, read, and decrypt operations.
- Hardhat deployment scaffold and passing contract smoke test.

### Next integration slice

The UI currently defaults to demo mode even after a wallet connects. The next slice is to wire the existing `src/liveGame.ts` functions into the React state machine:

- represent live match IDs separately from demo match codes;
- create and join real contract matches;
- submit encrypted actions from the round screen;
- wait for receipts and `RoundReady`;
- resolve the round;
- decrypt and render the contract result;
- settle verified scores using the public decryption proof path.

## Project map

```text
README.md                         Project overview and exploration guide
CHAIN_INTEGRATION.md              Current FHEVM, wallet, and Sepolia setup
docs/1.PRD.md                     Product requirements and game rules
docs/2.DESIGN SYSTEM.md           Visual language and interaction rules
docs/3.ARCHITECTURE.md            Frontend, wallet, FHE, and contract boundaries
docs/4.DATABASE.md                Persistence decisions and future indexing
docs/5.SECURITY.md                Privacy boundary and security checklist
docs/6.CODE_STYLE.md              Code and contribution conventions
docs/7.TESTING.md                 Test strategy and acceptance checks
docs/8.AGENTS.md                  Contributor and agent workflow
src/App.tsx                       React state machine and demo orchestration
src/components.tsx                Presentational components and wallet modal
src/game.ts                       Game rules and local result model
src/chain.ts                      Injected and WalletConnect providers + ABI
src/fhevm.ts                      Zama SDK encryption/decryption adapter
src/liveGame.ts                   Real contract transaction adapter
contracts/ShadowHeist.sol         Confidential FHEVM match contract
deploy/                           Hardhat deploy scripts
test/                             Contract tests
```

## Game rules

| Move | Beats | Loses to | Identity |
|---|---|---|---|
| Steal | Scout | Guard | high risk |
| Guard | Steal | Scout | counter play |
| Scout | Guard | Steal | quiet edge |

Equal moves draw. The demo alternates between a Silent Alarm and Dead Drop Bonus event. The live contract generates an encrypted random event bounded to two values and uses encrypted selections to calculate points.

## Run locally

### Frontend

```bash
pnpm install
pnpm dev
```

The development server listens on port 3000.

### Build

```bash
pnpm build
```

### Contract compile and test

```bash
pnpm contracts:compile
pnpm contracts:test
```

### Local Hardhat node

```bash
pnpm contracts:node
pnpm hardhat deploy --network localhost
```

### Sepolia deployment

Configure Hardhat variables without committing secrets:

```bash
pnpm hardhat vars set MNEMONIC
pnpm hardhat vars set INFURA_API_KEY
pnpm contracts:deploy:sepolia
```

Then set the deployed contract address:

```bash
VITE_SHADOW_HEIST_ADDRESS=0xYourDeployedAddress
```

The wallet must be connected to Sepolia and funded with Sepolia ETH for live transactions.

## Technical stack

- React + TypeScript + Vite
- ethers for EVM provider and contract calls
- `@walletconnect/ethereum-provider` for QR wallet sessions
- `@zama-fhe/sdk` for browser encryption and public decryption
- `@fhevm/solidity` and `@fhevm/hardhat-plugin` for the FHEVM contract
- Hardhat + hardhat-deploy
- Sepolia for the target live network

## Documentation guide

Start with [the PRD](./docs/1.PRD.md) to understand the product. Read [the architecture](./docs/3.ARCHITECTURE.md) to trace the code. Read [the security document](./docs/5.SECURITY.md) before changing encrypted state or public reveal behavior. Use [the testing guide](./docs/7.TESTING.md) before submitting a contract or wallet change.

## Sources

The integration follows the current Zama and Reown documentation referenced in [CHAIN_INTEGRATION.md](./CHAIN_INTEGRATION.md), including the [Zama FHEVM Hardhat template](https://github.com/zama-ai/fhevm-hardhat-template), [Zama SDK encryption guide](https://github.com/zama-ai/sdk/blob/main/docs/gitbook/src/guides/encrypt-decrypt.md), and [Reown Ethereum provider documentation](https://docs.reown.com/advanced/providers/ethereum).
