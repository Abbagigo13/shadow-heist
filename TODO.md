# Shadow Heist delivery checklist

- [x] Build a polished game lobby with a concise rules overview and clear create/join game actions for a two-player match.
- [x] Build a waiting-for-opponent state with match status, player slots, a mock opponent-join action, and an easy path back to the lobby.
- [x] Build a playable round screen where the player secretly selects Steal, Guard, or Scout using accessible, clearly labeled controls.
- [x] Add local mock match state that drives player readiness, locked choices, opponent actions, round resolution, and reset/rematch behavior.
- [x] Add compact round resolution that reveals both actions, communicates the outcome clearly, and supports a complete demonstration in under two minutes.
- [x] Add visible mock transaction and processing states for submitting a choice, waiting for both players, resolving the round, and decrypting the result.
- [x] Keep modular integration boundaries for Sepolia wallet connection, FHEVM encryption, smart-contract reads and writes, transaction tracking, and result decryption.
- [x] Support responsive mobile and desktop layouts with keyboard navigation, focus states, sufficient contrast, and reduced-motion-friendly interactions.
- [x] Apply a dark heist-game visual identity with suspenseful feedback, restrained animation, and polished empty, loading, error, and disabled states.
- [x] Wire the deployed ShadowHeist contract into create-match, join-match, encrypted action submission, live match polling, on-chain resolution, and public result decryption when a wallet and contract address are configured.
- [x] Support WalletConnect and injected wallets as the provider source for both ethers transactions and Zama FHEVM browser encryption.
- [ ] Validate a complete two-wallet Sepolia round using the deployed contract address `0xFb430BbC236b2FAcDB11c81d79eE551DFad14AF7` and record any contract/UI edge cases found during that run.
