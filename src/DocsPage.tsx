import { useEffect, useState, type ReactNode } from "react";
import { heistEvents } from "./game";
import { SHADOW_HEIST_ADDRESS } from "./chain";

const STAKE_TOKEN_ADDRESS = "0x4E7B06D78965594eB5EF5414c357ca21E1554491";
const EXPLORER = "https://sepolia.etherscan.io/address/";

const sections = [
  { id: "overview", label: "Overview" },
  { id: "how-to-play", label: "How to play" },
  { id: "try-it", label: "Try it" },
  { id: "stakes", label: "Invites and stakes" },
  { id: "trust", label: "Privacy, trust and limits" },
  { id: "reference", label: "Reference" },
  { id: "faq", label: "FAQ" },
] as const;

const steps = [
  ["Connect a wallet", "Press Connect wallet and pick a browser extension or scan the WalletConnect QR code. The app adds Sepolia to your wallet and switches to it. No wallet? Demo mode works without one."],
  ["Create a vault", "Press Create a vault. You become player one. Optionally name a rival wallet (invite only) and pick a stake. The vault gets a numeric match ID."],
  ["Invite your rival", "Press Share invite or copy the match ID. Your rival opens the link, connects, and joins with the code. The waiting screen updates when they are seated."],
  ["Enter the vault", "When both seats are filled, press Enter the vault. A match is best of three rounds."],
  ["Pick a move and seal it", "Choose Steal, Guard or Scout, then press Seal my move. Your move is encrypted in your browser before it leaves your device. You have 20 seconds per round; if the timer runs out the app seals Scout for you."],
  ["Wait for the reveal", "Once both moves are sealed, either player resolves the round. The contract compares the two encrypted moves and publishes only who won, the points and the random event."],
  ["Open the next round", "After a round, press Open next round. Repeat until round three finishes."],
  ["Finish and collect", "A match-complete card shows the final score. In a staked vault, press Send payout. Then start a linked rematch or go back to the lobby."],
] as const;

const faqs = [
  ["Do I need an account or email?", "No. You only need a wallet. Demo mode needs nothing at all."],
  ["Can anyone see my move?", "No. Your move is encrypted in your browser and the contract never publishes it. The contract publishes who won each round, the points and the event. Only you can decrypt your own move."],
  ["Does my rival see my move?", "Not directly. But this is a closed cycle of three moves, so once a round is decided, the winner plus your own move leaves exactly one possible rival move. That is why the reveal screen can show both moves to you. Someone watching from outside learns neither move."],
  ["How is this different from hiding a move with a hash?", "With a hash you must reveal your move later, and a losing player can refuse to reveal. Here nobody reveals anything: the contract computes the winner on encrypted data, so no one can stall the result by withholding a move."],
  ["How is the random event chosen?", "The contract draws it on-chain with Zama's encrypted random numbers after both moves are locked, so neither player can steer it. The result is public after the round, so anyone can check it."],
  ["What if my rival stops playing?", "If one player has sealed a move and the other stays silent for 30 minutes, a Claim the win button appears. The contract ends the match in your favour, whatever the score was. If you made a staked vault and nobody joined, press Cancel this vault to get your stake back."],
  ["What happens if my 20-second timer runs out?", "The app seals Scout for you. In a live vault that sends a transaction, so keep your wallet open."],
  ["Why did my wallet ask me to switch network?", "Shadow Heist runs on Sepolia only. The app asks your wallet to add and switch to Sepolia. Approve it, or add Sepolia manually (chain ID 11155111)."],
  ["Why does staking ask for several approvals?", "A stake moves confidential cUSDT. The first time, your wallet approves the game contract as an operator on the token (valid for 30 days), and the app reads your encrypted balance, which needs a signature. The contract only takes the stake you chose."],
  ["I don't have any cUSDT. What do I do?", "On the lobby screen press Get 10 test cUSDT. It mints free test tokens and shields them into confidential cUSDT. They have no real value."],
  ["Can the other player see how much I staked or won?", "The stake size you pick is part of the vault and is public. Balances, transfers and payouts are encrypted, so nobody can read your balance or what you were paid."],
  ["What if one player can't afford the stake?", "The token moves nothing if a wallet is short. The contract only puts the smaller of the two stakes that actually arrived at risk, so a player who staked nothing cannot win the other player's money."],
  ["Who can send the payout?", "Anyone in the match. It can only be sent once, and it always goes to the two players."],
  ["Is this on mainnet?", "No. Shadow Heist runs on Sepolia testnet with test tokens that have no cash value."],
] as const;

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="docs-section" aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`}>{title}</h2>
      {children}
    </section>
  );
}

export function DocsPage({ onBack }: { onBack: () => void }) {
  const [active, setActive] = useState<string>(sections[0].id);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: "-20% 0px -65% 0px" },
    );
    sections.forEach(({ id }) => {
      const node = document.getElementById(id);
      if (node) observer.observe(node);
    });
    return () => observer.disconnect();
  }, []);

  function jump(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setActive(id);
  }

  return (
    <div className="docs-layout">
      <div className="subpage-heading">
        <button className="back-button" onClick={onBack}>← Back to the game</button>
        <div className="subpage-meta"><span className="status-dot" /> Docs / how to play</div>
      </div>
      <div className="hero-stamp">DOCS</div>
      <h1 className="docs-title">Shadow Heist,<br /><em>end to end.</em></h1>
      <p className="hero-copy docs-lede">How to play, what stays secret, what the contract guarantees, and where it still trusts someone. Everything runs on Sepolia testnet.</p>

      <div className="docs-body">
        <nav className="docs-toc" aria-label="On this page">
          <span className="docs-toc-label">ON THIS PAGE</span>
          {sections.map((section) => (
            <button key={section.id} className={active === section.id ? "is-active" : ""} aria-current={active === section.id ? "true" : undefined} onClick={() => jump(section.id)}>{section.label}</button>
          ))}
        </nav>

        <div className="docs-content">
          <Section id="overview" title="Overview">
            <p>Shadow Heist is a two-player strategy game where every move travels sealed. Players secretly pick Steal, Guard or Scout. The smart contract compares the two moves while they are still encrypted, using Zama&apos;s fully homomorphic encryption (FHE) on Sepolia, and publishes only the result.</p>
            <div className="docs-cards">
              <div><h3>Players</h3><p>Two wallets per vault. Best of three rounds, scored with points and a random heist event each round.</p></div>
              <div><h3>Stakes</h3><p>Optional. Each player can put in confidential cUSDT. The winner takes the pot.</p></div>
              <div><h3>Why it exists</h3><p>On a normal chain the second player can watch the first move and counter it. Encryption makes sealed moves possible without trusting a referee.</p></div>
            </div>
          </Section>

          <Section id="how-to-play" title="How to play">
            <ol className="docs-steps">
              {steps.map(([title, body], index) => (
                <li key={title}><span className="docs-step-number">{index + 1}</span><div><strong>{title}</strong><p>{body}</p></div></li>
              ))}
            </ol>
            <h3>The move cycle</h3>
            <table className="docs-table">
              <thead><tr><th>Move</th><th>Beats</th><th>Loses to</th></tr></thead>
              <tbody>
                <tr><td>Steal</td><td>Scout</td><td>Guard</td></tr>
                <tr><td>Guard</td><td>Steal</td><td>Scout</td></tr>
                <tr><td>Scout</td><td>Guard</td><td>Steal</td></tr>
              </tbody>
            </table>
            <p>Equal moves draw and nobody scores. The winner of the match is the player with the higher total after round three.</p>
            <h3>Heist events</h3>
            <p>Each round the contract draws a random event. It changes what a win is worth.</p>
            <table className="docs-table">
              <thead><tr><th>Event</th><th>What a win scores</th></tr></thead>
              <tbody>
                {heistEvents.map((event) => (
                  <tr key={event.code}><td>{event.title}</td><td>{event.winnerPoints} point{event.winnerPoints === 1 ? "" : "s"}{event.scoutBonus > 0 ? `, plus ${event.scoutBonus} if you won with Scout` : ""}</td></tr>
                ))}
              </tbody>
            </table>
          </Section>

          <Section id="try-it" title="Try it">
            <h3>Demo mode (no wallet)</h3>
            <p>Open the game, press Create a vault, then Simulate rival joining and Enter the vault. A scripted rival plays against you. Nothing touches a chain.</p>
            <h3>Live mode (two wallets on Sepolia)</h3>
            <ol className="docs-list">
              <li>Get a little Sepolia ETH for gas in each wallet from any Sepolia faucet.</li>
              <li>Connect wallet one, then create a vault. Share the match ID with wallet two, on another browser profile or a phone.</li>
              <li>Connect wallet two and join with the match ID. Play three rounds.</li>
              <li>For a staked game, press Get 10 test cUSDT on each wallet first and choose a stake when creating.</li>
            </ol>
            <p>Each action is a real transaction. Rounds can take a few seconds to confirm and decrypt.</p>
          </Section>

          <Section id="stakes" title="Invites and stakes">
            <h3>Invite-only vaults</h3>
            <p>Enter a rival wallet address when you create the vault. Only that wallet can take the second seat. Leave it empty to let anyone with the match ID join.</p>
            <h3>Confidential stakes</h3>
            <ul className="docs-list">
              <li>Pick Free, 1, 5 or 10 cUSDT. Each player stakes the same amount.</li>
              <li>The winner takes the whole pot. A draw returns both stakes.</li>
              <li>If a player goes silent and you claim the win, you take the pot even if you were behind on points.</li>
              <li>If you cancel a vault before anyone joins, your stake is refunded.</li>
              <li>After the match press Send payout. It is a separate transaction and can be sent once.</li>
              <li>In a staked rematch, your rival has to join and pay for themselves. Nobody&apos;s stake is taken without their own transaction.</li>
            </ul>
          </Section>

          <Section id="trust" title="Privacy, trust and limits">
            <h3>What stays secret</h3>
            <ul className="docs-list">
              <li>Your move, before and after the round. It is never made public.</li>
              <li>Your cUSDT balance, and the amounts of transfers and payouts.</li>
            </ul>
            <h3>What is public</h3>
            <ul className="docs-list">
              <li>Wallet addresses, transaction timing, and the vault&apos;s settings, including the stake size.</li>
              <li>Each round&apos;s outcome, points and random event, and the running scores.</li>
            </ul>
            <h3>What you are trusting</h3>
            <ul className="docs-list">
              <li>The Zama Protocol to run the encrypted computation and decryption correctly.</li>
              <li>This is a hackathon build. The contract has tests but has not had an independent audit.</li>
              <li>The stake token on Sepolia is a mock with a public mint. Do not treat it as money.</li>
              <li>Your browser remembers your own move for the reveal screen during that tab session. If you reload in a different tab, the reveal keeps both moves sealed.</li>
            </ul>
          </Section>

          <Section id="reference" title="Reference">
            <table className="docs-table">
              <tbody>
                <tr><td>Network</td><td>Sepolia testnet (chain ID 11155111)</td></tr>
                <tr><td>Game contract</td><td>{SHADOW_HEIST_ADDRESS ? <a href={`${EXPLORER}${SHADOW_HEIST_ADDRESS}`} target="_blank" rel="noreferrer">{SHADOW_HEIST_ADDRESS}</a> : "Not configured in this build"}</td></tr>
                <tr><td>Stake token</td><td><a href={`${EXPLORER}${STAKE_TOKEN_ADDRESS}`} target="_blank" rel="noreferrer">Confidential USDT (Mock)</a>, 6 decimals</td></tr>
                <tr><td>Rounds</td><td>Best of three</td></tr>
                <tr><td>Round timer</td><td>20 seconds in the app</td></tr>
                <tr><td>Forfeit window</td><td>30 minutes of silence, enforced by the contract</td></tr>
              </tbody>
            </table>
            <h3>Contract functions</h3>
            <table className="docs-table">
              <thead><tr><th>Function</th><th>What it does</th></tr></thead>
              <tbody>
                <tr><td>createMatch / createMatchWith</td><td>Opens a vault, optionally invite-only and staked</td></tr>
                <tr><td>joinMatch</td><td>Takes the second seat (and pays the stake)</td></tr>
                <tr><td>submitAction</td><td>Sends your encrypted move. Values outside 1 to 3 are treated as Scout</td></tr>
                <tr><td>resolveRound</td><td>Compares both encrypted moves and publishes the result</td></tr>
                <tr><td>startNextRound</td><td>Opens the next round</td></tr>
                <tr><td>forfeitTimeout</td><td>Ends the match for the player who moved when the rival stays silent</td></tr>
                <tr><td>cancelMatch</td><td>Host closes a vault before a rival joins</td></tr>
                <tr><td>abandonStaleMatch</td><td>Closes a seated match where nobody moved for 30 minutes</td></tr>
                <tr><td>settle</td><td>Pays out or refunds a staked match, once</td></tr>
                <tr><td>rematch</td><td>Opens a linked vault against the same rival</td></tr>
              </tbody>
            </table>
          </Section>

          <Section id="faq" title="FAQ">
            <div className="docs-faq">
              {faqs.map(([question, answer]) => (
                <details key={question}>
                  <summary>{question}</summary>
                  <p>{answer}</p>
                </details>
              ))}
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}
