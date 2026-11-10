# Shadow Heist

**Shadow Heist** is a two-player confidential strategy game built with React, Solidity, and [Zama FHEVM](https://www.zama.org/). Players secretly choose **Steal**, **Guard**, or **Scout**. Their moves are encrypted before submission, compared while encrypted, and never published. Only who won each round is revealed.

> The vault is public. Your move isn’t.

## Why it matters

On a public blockchain, an opponent could watch a move before choosing a counter. Shadow Heist demonstrates a fair sealed-action game: both players commit encrypted choices, the contract evaluates the matchup privately, and the result is revealed after both moves are locked.

## Hackathon features

- Sepolia wallet support through WalletConnect, with automatic add and switch to Sepolia.
- Client-side Zama FHEVM encryption with encrypted input proofs.
- Best-of-three matches using encrypted move evaluation and scores.
- Sealed moves: the contract never publishes either player’s move, only who won each round, the points and the event.
- Invite-only vaults: name a rival wallet and nobody else can take the second seat.
- Confidential stakes: each player can stake cUSDT (an ERC-7984 token). The winner takes the pot, a draw returns both stakes, and a forfeit pays the player who stayed. Amounts stay encrypted.
- Staged result reveal with cinematic feedback.
- Noir arcade UI with countdown, sound cues, responsive mobile layout, and rematches.

## Play the game

### Demo mode

```bash
pnpm install
pnpm dev
```

Open the app, choose **Create a vault**, select **Simulate rival joining**, enter the vault, and play a round. Demo mode needs no wallet.

### Live Sepolia mode

The current contract is deployed on Sepolia at [`0xf107Eb78AC34a4D51493425Af7473d1B29c9053C`](https://sepolia.etherscan.io/address/0xf107Eb78AC34a4D51493425Af7473d1B29c9053C). To deploy your own, run `pnpm contracts:deploy:v2:sepolia`. On Sepolia it uses Zama’s Confidential USDT (Mock) at `0x4E7B06D78965594eB5EF5414c357ca21E1554491` for stakes. Set `STAKE_TOKEN` to use another ERC-7984 token, or to the zero address to turn stakes off. Add a full-match transaction trail here before submitting.

Create `.env.local`:

```env
VITE_SHADOW_HEIST_ADDRESS=0xf107Eb78AC34a4D51493425Af7473d1B29c9053C
VITE_WALLETCONNECT_PROJECT_ID=your_public_project_id
```

Connect with WalletConnect (the app adds and switches to Sepolia for you), create or join a numeric match, then submit encrypted moves from two wallets. Both wallets need Sepolia ETH for gas.

## Privacy model

- Moves are encrypted in the browser with Zama’s FHE public key.
- The contract accepts encrypted `euint8` inputs and validates their associated proof.
- FHEVM computes the matchup and points without exposing the plaintext moves during the round.
- Round outcomes, points and the random event are intentionally made publicly decryptable after resolution so anyone can verify the result.
- Moves are never made public. Each player can decrypt only their own move, and because this is a closed move cycle, the winner plus your own move tells you the rival’s move. Spectators learn neither move.
- Stakes move through the ERC-7984 token as encrypted amounts. The contract keeps what actually arrived (a short wallet transfers 0, it does not revert) and only ever puts the smaller of the two stakes at risk, so a wallet that could not fund its stake cannot win the other player’s money.
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

Runs the FHEVM mock tests: all nine move pairings, event bonuses, sealed moves, out-of-range moves, best-of-three scoring, forfeits, abandoned matches, invite-only seats and confidential stakes (win, draw, forfeit, refund, unfunded wallet and rematch).
