# Shadow Heist

**Shadow Heist** is a two-player confidential strategy game built with React, Solidity, and [Zama FHEVM](https://www.zama.org/). Players secretly choose **Steal**, **Guard**, or **Scout**. Their moves are encrypted before submission, compared while encrypted, and revealed only when the round resolves.

> The vault is public. Your move isn’t.

## Why it matters

On a public blockchain, an opponent could watch a move before choosing a counter. Shadow Heist demonstrates a fair sealed-action game: both players commit encrypted choices, the contract evaluates the matchup privately, and the result is revealed after both moves are locked.

## Hackathon features

- Sepolia wallet support through WalletConnect, with automatic add and switch to Sepolia.
- Client-side Zama FHEVM encryption with encrypted input proofs.
- Best-of-three matches using encrypted move evaluation and scores.
- Public result reveal only after round resolution, with cinematic staged feedback.
- Noir arcade UI with countdown, sound cues, responsive mobile layout, and rematches.

## Play the game

### Demo mode

```bash
pnpm install
pnpm dev
```

Open the app, choose **Create a vault**, select **Simulate rival joining**, enter the vault, and play a round. Demo mode needs no wallet.

### Live Sepolia mode

The V2 contract is deployed at [`0xcd8E285b61437EE0AfDdbD5EBA54c1A3ea6FBFb6`](https://sepolia.etherscan.io/address/0xcd8E285b61437EE0AfDdbD5EBA54c1A3ea6FBFb6).

Create `.env.local`:

```env
VITE_SHADOW_HEIST_ADDRESS=0xcd8E285b61437EE0AfDdbD5EBA54c1A3ea6FBFb6
VITE_WALLETCONNECT_PROJECT_ID=your_public_project_id
```

Connect with WalletConnect (the app adds and switches to Sepolia for you), create or join a numeric match, then submit encrypted moves from two wallets. Both wallets need Sepolia ETH for gas.

## Privacy model

- Moves are encrypted in the browser with Zama’s FHE public key.
- The contract accepts encrypted `euint8` inputs and validates their associated proof.
- FHEVM computes the matchup and points without exposing the plaintext moves during the round.
- Round results are intentionally made publicly decryptable after resolution so both players can verify the outcome.
- Moves outside Steal, Guard and Scout are treated as Scout inside the contract, so a hand-crafted transaction cannot create a move that never loses.
- If a player stops moving for 30 minutes, the other player can claim the match. The forfeit winner wins whatever the score says.

Transaction hashes, wallet addresses, match metadata, and timing remain public on Sepolia. FHE protects the strategic move data, not the surrounding blockchain metadata.

## Move cycle

| Move | Beats | Loses to |
|---|---|---|
| Steal | Scout | Guard |
| Guard | Steal | Scout |
| Scout | Guard | Steal |

Equal moves draw. Best-of-three matches progress through three encrypted rounds.

## Development

```bash
pnpm build
pnpm contracts:compile
pnpm contracts:test
```

## Key files

- `src/App.tsx` — game state machine and live/demo flow
- `src/fhevm.ts` — Zama SDK encryption and public decryption
- `src/liveGame.ts` — V2 contract transaction and read adapter
- `src/chain.ts` — Sepolia wallet providers and V2 ABI
- `contracts/ShadowHeistV2.sol` — confidential best-of-three contract
- `test/ShadowHeistV2.cjs` — contract tests

## Stack

React, TypeScript, Vite, ethers v6, WalletConnect, Zama FHEVM SDK, Solidity, and Hardhat.

Built for the **Zama Developer Program — Mainnet Season 5: Confidential Gaming**.


## Tests

```bash
pnpm contracts:test
```

Runs the FHEVM mock tests: all nine move pairings, event bonuses, privacy of unresolved moves, out-of-range moves, best-of-three scoring, forfeits and abandoned matches.
