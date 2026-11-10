# Shadow Heist: Season 5 review

Reviewed against the Zama Developer Program Season 5 (Confidential Gaming) judging criteria: gameplay and UX, confidentiality design, fairness, functionality on Sepolia, demo quality, code quality. Submissions close December 14, 2026 (23:59 AOE).

Reviewed: `contracts/ShadowHeistV2.sol`, `src/*`, tests, docs, and the deployed contract at `the first V2 deployment (since replaced)` on Sepolia.

## Must fix before submitting

### 1. The deployed contract has never been played (Functionality)
`nextMatchId()` and `getPlayerCount()` both return 0 on Sepolia. No match has ever been created, and `TODO.md` still has the two-wallet Sepolia run unchecked. Judges ask "can a full round be played and verified?", so run a full best-of-three with two wallets, keep the transaction links, and put them in the README and video.

### 2. An invalid move cannot lose (Fairness, contract bug)
`submitAction` accepts any `euint8`. A player who calls the contract directly can encrypt `0` or `255`. In `resolveRound`, an invalid move matches none of the three comparisons, so it can never lose (it always draws or wins by forfeit). The UI only sends 1, 2 or 3, but a contract-level cheat breaks the "fair" claim.

Fix: after `FHE.fromExternal`, clamp the move with an encrypted select, for example:
```solidity
ebool valid = FHE.and(FHE.ge(action, 1), FHE.le(action, 3));
action = FHE.select(valid, action, FHE.asEuint8(SCOUT));
```

### 3. A forfeiting player can still win the match (Fairness, contract bug)
`forfeitTimeout` awards 1 point to the player who submitted and ends the match. In best-of-three, a player leading 2 to 0 who stops responding in round 3 still has the higher score. The decrypted score, not the forfeit, decides the winner. Fix by recording a `forfeitedBy` or `winner` address on the match and emitting it in `MatchTimedOut`, and have the UI show that as the result.

### 4. Redeploying is required for 2 and 3
The deployed contract is immutable. After fixing the contract, redeploy ShadowHeistV2, update `VITE_SHADOW_HEIST_ADDRESS` in Vercel and `.env.example`, and redo the two-wallet run on the new address.

## Strongly recommended

### 5. Test coverage is thin (Code quality)
`test/ShadowHeistV2.cjs` has 3 tests, all lifecycle checks. Nothing tests submit, resolve, scoring, events, timeouts or rematch with real encrypted inputs. The Zama Hardhat plugin supports this locally. Add tests for: all 9 move pairings, each event code, an invalid move (after fix 2), a forfeit, and a full best-of-three.

### 6. Confidentiality story (Confidentiality design)
`resolveRound` makes both moves publicly decryptable after every round. Judges will ask whether a commit-reveal hash would do the same thing. Two ways to answer:
- Pitch the real difference: with FHE there is no reveal step, so a losing player cannot refuse to reveal, and the contract computes the winner without anyone opening their move.
- Stronger: do not make the moves public. Make only `outcome`, points and the event public, so players cannot be profiled by their move history. Players can still decrypt their own move (`FHE.allow` is already set).

### 7. No final result screen (Gameplay and UX)
After a best-of-three, the app only shows a toast saying to choose rematch. Show a final screen with the match winner, total score and transaction links. The scores are already summed client-side from per-round points.

### 8. Anyone can take the second seat (Gameplay and fairness)
Match IDs are sequential and `joinMatch` is open, so a stranger can join before your friend does. Add an optional invited-opponent address to `createMatch`.

### 9. No stuck-match recovery in the UI
The contract has `cancelMatch` and `forfeitTimeout`, but the UI uses neither, and `cancelMatch` is missing from the frontend ABI in `src/chain.ts`. If nobody submits a move, the match is stuck forever. Add a "Cancel vault" button for the host before anyone joins, and a "Claim forfeit" button after 30 minutes.

## Nice to have
- Prizes: the season pays in cUSDT (ERC-7984). A small confidential stake or prize pool would fit the theme and impress judges, but it is a large change. Only do it if time allows.
- Stale text: `README.md` ("injected wallets and WalletConnect") and `CHAIN_INTEGRATION.md` still describe the browser-wallet path that was removed. The join toast says "Choose your entry point".
- `_touchProfile` emits `ProfileRegistered` twice on explicit registration.
- 62 Dependabot alerts (25 high) on the repo. Run `pnpm update`, check that the build still passes, then push.
- The submission also needs: a 3-minute real-person video, an X post, and clear docs.

## Suggested order
1. Fix the contract (items 2 and 3), add tests (item 5).
2. Redeploy to Sepolia and update the address (item 4).
3. Run a full two-wallet best-of-three (item 1) and record transaction links.
4. Add the final result screen and the cancel and forfeit buttons (items 7 and 9).
5. Update the README, record the video, post on X.
