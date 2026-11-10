# Shadow Heist V2 contract plan

## Goal

Create one extensible confidential-game contract for the planned roadmap, deploy it once to Sepolia, and make future feature work primarily frontend-driven. The existing deployed `ShadowHeist` contract remains untouched while V2 is implemented and tested.

## Contract capabilities

- Two-player confidential matches with encrypted Steal, Guard, and Scout actions.
- Match modes for single-round games and best-of-three games, with configurable round limits.
- Multiple rounds per match, persistent public scores, encrypted per-round results, and explicit match completion.
- Versioned random event codes with a contract-side event table so frontend event copy can evolve without changing scoring semantics.
- Rematch creation linked to a previous match.
- Player profiles and aggregate statistics: games, wins, losses, draws, points, streak, best streak, and action counts. Individual moves remain encrypted and are never stored as clear profile data.
- Daily challenge registration with a public challenge identifier and event modifier, leaving presentation and challenge discovery to the frontend/indexer.
- On-chain player directory events and paginated profile reads so an indexer or frontend can build leaderboards without requiring contract storage sorting.
- Cancellation for unfilled matches and timeouts for abandoned rounds.
- Read methods and events designed for a frontend adapter: match metadata, current state, per-round encrypted result handles, profile stats, daily challenge data, and rematch relationships.

## Privacy and trust boundaries

Player actions stay encrypted until round resolution. Only outcome, points, and event code are made publicly decryptable after resolution. Public scores and aggregate statistics are intentionally visible. No clear action is written to storage or emitted in events. There is no custody, wager, or token-transfer logic in V2.

## Compatibility strategy

V2 is a new contract surface rather than an in-place mutation of the deployed contract. The frontend keeps the current adapter until V2 has passed compile, local FHEVM tests, and a two-wallet Sepolia validation. After deployment, `src/liveGame.ts` and the ABI/address configuration will switch as one checkpoint.

## Upgrade boundary

Frontend-only additions such as event copy, animations, profiles screens, filters, sharing, sound, and leaderboard presentation should not require redeployment. A redeploy may still be required for a genuinely new trust rule, new encrypted value, new scoring primitive, or security fix. The V2 contract intentionally exposes versioned modes and read APIs to reduce that need.

## Project structure

- `contracts/ShadowHeist.sol`: current deployed compatibility contract; do not modify during V2 work.
- `contracts/ShadowHeistV2.sol`: extensible multi-round contract.
- `test/ShadowHeistV2.cjs`: local contract behavior and privacy-boundary tests.
- `deploy/02_deploy_shadow_heist_v2.ts`: separate V2 deployment script.
- `CHAIN_INTEGRATION.md`: V2 deployment and frontend cutover notes.
