import { STAKE_CHOICES, type StakeChoice } from "./stake";
import type { ChangeEvent, ReactNode } from "react";
import {
  actionMeta,
  processingLabel,
  type Action,
  type MatchView,
  type ProcessingState,
  type RoundResult,
} from "./game";

export type IconName =
  | "arrow"
  | "back"
  | "bolt"
  | "check"
  | "chevron"
  | "clock"
  | "copy"
  | "eye"
  | "key"
  | "link"
  | "lock"
  | "plus"
  | "radio"
  | "refresh"
  | "scan"
  | "shield"
  | "spark"
  | "sound"
  | "soundOff"
  | "target"
  | "users"
  | "vault"
  | "wallet"
  | "warning"
  | "x";

export function Icon({
  name,
  size = 20,
  strokeWidth = 1.7,
  className = "",
}: {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: `icon ${className}`,
    "aria-hidden": true,
  };

  const paths: Record<IconName, ReactNode> = {
    arrow: <><path d="M4 12h15" /><path d="m13 6 6 6-6 6" /><path d="M4 6v12" /></>,
    back: <><path d="m15 18-6-6 6-6" /><path d="M9 12h11" /></>,
    bolt: <path d="m13 2-9 12h7l-1 8 9-12h-7l1-8Z" />,
    check: <path d="m5 12 4 4L19 6" />,
    chevron: <path d="m9 18 6-6-6-6" />,
    clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7v5l3 2" /></>,
    copy: <><rect x="9" y="9" width="10" height="10" rx="1.5" /><path d="M5 15H4.5A1.5 1.5 0 0 1 3 13.5v-9A1.5 1.5 0 0 1 4.5 3h9A1.5 1.5 0 0 1 15 4.5V5" /></>,
    eye: <><path d="M2.5 12s3.2-5 9.5-5 9.5 5 9.5 5-3.2 5-9.5 5-9.5-5-9.5-5Z" /><circle cx="12" cy="12" r="2.2" /></>,
    key: <><circle cx="8" cy="15" r="3.5" /><path d="m10.5 12.5 7-7M15 7l2 2m0-4 2 2" /></>,
    link: <><path d="m10 13.5 4-4" /><path d="M7.5 17.5H6a4 4 0 0 1 0-8h2" /><path d="M16.5 6.5H18a4 4 0 0 1 0 8h-2" /></>,
    lock: <><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v2" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    radio: <><circle cx="12" cy="12" r="2" /><path d="M7.8 7.8a6 6 0 0 0 0 8.4M16.2 7.8a6 6 0 0 1 0 8.4M4.9 4.9a10 10 0 0 0 0 14.2M19.1 4.9a10 10 0 0 1 0 14.2" /></>,
    refresh: <><path d="M20 11a8 8 0 0 0-14.6-4L4 9" /><path d="M4 4v5h5M4 13a8 8 0 0 0 14.6 4L20 15" /><path d="M20 20v-5h-5" /></>,
    scan: <><path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3" /><path d="M7 12h10" /></>,
    shield: <path d="M12 3 5 6v5c0 4.5 2.8 8 7 10 4.2-2 7-5.5 7-10V6l-7-3Z" />,
    spark: <><path d="m12 2 1.6 7.4L21 12l-7.4 1.6L12 21l-1.6-7.4L3 12l7.4-2.6L12 2Z" /><path d="m19 3 .5 2.5L22 6l-2.5.5L19 9l-.5-2.5L16 6l2.5-.5L19 3Z" /></>,
    sound: <><path d="M4 10v4h3l4 3V7l-4 3H4Z" /><path d="M15 9.5a4 4 0 0 1 0 5M17.5 7a7.5 7.5 0 0 1 0 10" /></>,
    soundOff: <><path d="M4 10v4h3l4 3V7l-4 3H4Z" /><path d="m16 10 5 5M21 10l-5 5" /></>,
    target: <><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="1" /></>,
    users: <><path d="M16 20v-1.2a4.3 4.3 0 0 0-4.3-4.3H7.3A4.3 4.3 0 0 0 3 18.8V20" /><circle cx="9.5" cy="7.5" r="3.5" /><path d="M16 3.7a3.5 3.5 0 0 1 0 6.8M21 20v-1.2a4.3 4.3 0 0 0-3.2-4.1" /></>,
    vault: <><rect x="3" y="5" width="18" height="15" rx="2" /><circle cx="12" cy="12.5" r="3" /><path d="M12 10.5v2l1.5 1M7 5v15M17 5v15" /></>,
    wallet: <><path d="M4 6.5A2.5 2.5 0 0 1 6.5 4H19a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H6.5A2.5 2.5 0 0 1 4 17.5v-11Z" /><path d="M4 7h14a2 2 0 0 1 2 2v2h-5a2 2 0 0 0 0 4h5" /><path d="M16.5 13h.01" /></>,
    warning: <><path d="m12 3 9 17H3L12 3Z" /><path d="M12 9v5M12 17h.01" /></>,
    x: <><path d="m6 6 12 12M18 6 6 18" /></>,
  };

  return <svg {...common}>{paths[name]}</svg>;
}

export function SiteHeader({
  connected,
  address,
  connectionBusy,
  view,
  onConnect,
  onLogoClick,
  soundMuted,
  onToggleSound,
}: {
  connected: boolean;
  address?: string;
  connectionBusy: boolean;
  view: MatchView;
  onConnect: () => void;
  onLogoClick: () => void;
  soundMuted: boolean;
  onToggleSound: () => void;
}) {
  return (
    <header className="topbar">
      <button className="brand-button" onClick={onLogoClick} aria-label="Return to Shadow Heist lobby">
        <span className="brand-mark"><Icon name="vault" size={18} /></span>
        <span className="brand-wordmark">SHADOW<span>/</span>HEIST</span>
      </button>
      <div className="topbar-center" aria-label="Current mode">
        <span className="topbar-pulse" />
        <span>{view === "game" ? "LIVE ROUND" : "CONFIDENTIAL ARCADE"}</span>
      </div>
      <div className="topbar-actions">
        <span className="network-chip"><span className="status-dot" /> SEPOLIA NETWORK</span>
        <button className="sound-button" onClick={onToggleSound} aria-label={soundMuted ? "Turn sound on" : "Mute sound"} aria-pressed={!soundMuted}>
          <Icon name={soundMuted ? "soundOff" : "sound"} size={15} />
          <span>{soundMuted ? "SOUND OFF" : "SOUND ON"}</span>
        </button>
        <button className={`wallet-button ${connected ? "wallet-connected" : ""}`} onClick={onConnect} disabled={connectionBusy}>
          <Icon name="wallet" size={15} />
          {connectionBusy ? "Connecting…" : connected && address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "Connect wallet"}
        </button>
      </div>
    </header>
  );
}

function SectionKicker({ children, icon }: { children: ReactNode; icon?: IconName }) {
  return <div className="section-kicker">{icon && <Icon name={icon} size={14} />}<span>{children}</span></div>;
}

function SignalRow({ icon, title, copy }: { icon: IconName; title: string; copy: string }) {
  return (
    <div className="signal-row">
      <span className="signal-icon"><Icon name={icon} size={18} /></span>
      <span><strong>{title}</strong><small>{copy}</small></span>
      <Icon name="chevron" size={16} className="signal-chevron" />
    </div>
  );
}

export function LandingView({ onEnter }: { onEnter: () => void }) {
  return (
    <section className="landing-page" aria-labelledby="landing-title">
      <div className="landing-copy">
        <div className="hero-stamp"><Icon name="spark" size={13} /> ZAMA / CONFIDENTIAL GAMING</div>
        <h1 id="landing-title">The vault is<br /><em>public.</em></h1>
        <p className="landing-tagline">Your move isn’t.</p>
        <p className="hero-copy">Shadow Heist is a two-player strategy game where every choice travels sealed. Outsmart the rival, trust the cipher, and take the vault.</p>
        <button className="primary-button landing-cta" onClick={onEnter}><span className="button-icon"><Icon name="key" size={18} /></span><span><strong>Enter the vault</strong><small>Play the confidential demo</small></span><Icon name="arrow" size={17} className="button-arrow" /></button>
        <div className="landing-proof"><span><span className="status-dot status-dot-bright" /> FHEVM POWERED</span><span>BEST OF THREE</span><span>SEPOLIA READY</span></div>
      </div>
      <div className="landing-banner" aria-label="Shadow Heist confidential vault signal">
        <svg className="landing-banner-svg" viewBox="0 0 720 520" role="img" aria-labelledby="vault-banner-title vault-banner-desc">
          <title id="vault-banner-title">Encrypted vault signal</title>
          <desc id="vault-banner-desc">A glowing vault dial surrounded by encrypted strategy lines.</desc>
          <defs><radialGradient id="vaultGlow"><stop offset="0" stopColor="#c9f27c" stopOpacity=".22" /><stop offset="1" stopColor="#c9f27c" stopOpacity="0" /></radialGradient><linearGradient id="vaultLine" x1="0" x2="1"><stop stopColor="#87d9ca" stopOpacity="0" /><stop offset=".5" stopColor="#c9f27c" /><stop offset="1" stopColor="#87d9ca" stopOpacity="0" /></linearGradient></defs>
          <rect width="720" height="520" fill="#111712" />
          <circle cx="360" cy="255" r="235" fill="url(#vaultGlow)" />
          <g fill="none" stroke="#c9f27c" strokeOpacity=".14"><circle cx="360" cy="255" r="190" /><circle cx="360" cy="255" r="145" /><circle cx="360" cy="255" r="102" /></g>
          <g fill="none" stroke="#87d9ca" strokeOpacity=".28" strokeDasharray="2 11"><circle cx="360" cy="255" r="215" /><circle cx="360" cy="255" r="170" /></g>
          <g stroke="url(#vaultLine)" strokeWidth="1"><path d="M60 128h180l40 40h160l45-45h175" /><path d="M45 382h160l38-38h130l45 42h260" /><path d="M74 255h102M544 255h105" /></g>
          <g fill="#c9f27c"><circle cx="60" cy="128" r="3" /><circle cx="660" cy="382" r="3" /><circle cx="176" cy="255" r="3" /><circle cx="544" cy="255" r="3" /></g>
          <g transform="translate(360 255)" fill="none" stroke="#c9f27c"><circle r="76" strokeOpacity=".8" strokeWidth="2" /><circle r="58" strokeOpacity=".35" /><path d="M-76 0h152M0-76v152" strokeOpacity=".2" /><path d="M-38-22v-12a38 38 0 0 1 76 0v12" strokeWidth="4" /><rect x="-48" y="-22" width="96" height="69" rx="8" fill="#152015" strokeWidth="2" /><circle cy="8" r="18" strokeWidth="3" /><path d="M0 8v12l9 6" strokeWidth="3" /></g>
          <g fill="#87908a" fontFamily="monospace" fontSize="11" letterSpacing="2"><text x="44" y="52">ENCRYPTED / 02</text><text x="535" y="52">NO TELLS / 03</text><text x="42" y="478">ROUND 01 — INPUT SEALED</text><text x="544" y="478">FHEVM</text></g>
        </svg>
        <div className="landing-banner-label"><span className="status-dot status-dot-bright" /> OBSERVER VIEW <span>MOVE DATA: HIDDEN</span></div>
      </div>
    </section>
  );
}

export function LobbyView({
  connected,
  liveReady,
  joinOpen,
  joinCode,
  onJoinCodeChange,
  stakeEnabled,
  stakeChoice,
  onStakeChange,
  rivalInput,
  onRivalChange,
  onGetTestTokens,
  busy,
  onCreate,
  onOpenJoin,
  onJoin,
}: {
  connected: boolean;
  liveReady: boolean;
  joinOpen: boolean;
  joinCode: string;
  onJoinCodeChange: (value: string) => void;
  stakeEnabled: boolean;
  stakeChoice: StakeChoice;
  onStakeChange: (value: StakeChoice) => void;
  rivalInput: string;
  onRivalChange: (value: string) => void;
  onGetTestTokens: () => void;
  busy: boolean;
  onCreate: () => void;
  onOpenJoin: () => void;
  onJoin: () => void;
}) {
  return (
    <div className="lobby-layout">
      <section className="lobby-hero">
        <div className="hero-stamp"><Icon name="spark" size={13} /> SEASON 05 / SPECIAL BOUNTY</div>
        <h1>The vault is public.<br /><em>Your move isn’t.</em></h1>
        <p className="hero-copy">A two-player strategy game where every choice travels sealed. Read the room, risk the vault, and never show your hand.</p>
        <div className="hero-rule" />
        <div className="signal-list">
          <SignalRow icon="lock" title="Sealed choices" copy="Your action stays encrypted until the round is over." />
          <SignalRow icon="radio" title="Fair by design" copy="Random events are generated in the game, not in the UI." />
          <SignalRow icon="scan" title="Zero tells" copy="Public transactions reveal timing, never strategy." />
        </div>
        <div className="hero-footnote"><span className="footnote-line" /> Built for the confidential gaming bounty</div>
      </section>

      <section className="lobby-panel">
        <div className="panel-orbit orbit-one" />
        <div className="panel-orbit orbit-two" />
        <div className="lobby-panel-inner">
          <div className="panel-topline">
            <SectionKicker icon="key">Entry point</SectionKicker>
            <span className="panel-index">01—03</span>
          </div>
          <h2>Choose your<br /><span>infiltration.</span></h2>
          <p className="panel-copy">Create a private match or enter a live vault with a code. The first move is yours.</p>
          {liveReady && (
            <div className="vault-options">
              <label htmlFor="rival-wallet">RIVAL WALLET <span>(optional, invite only)</span></label>
              <input id="rival-wallet" value={rivalInput} onChange={(event: ChangeEvent<HTMLInputElement>) => onRivalChange(event.target.value)} placeholder="0x… leave empty to let anyone join" spellCheck={false} />
              {stakeEnabled && (
                <>
                  <label>STAKE <span>(confidential cUSDT, each player)</span></label>
                  <div className="stake-choices" role="radiogroup" aria-label="Stake per player">
                    {STAKE_CHOICES.map((choice) => (
                      <button key={choice} type="button" role="radio" aria-checked={stakeChoice === choice} className={`stake-chip ${stakeChoice === choice ? "is-selected" : ""}`} onClick={() => onStakeChange(choice)}>{choice === 0 ? "Free" : `${choice} cUSDT`}</button>
                    ))}
                  </div>
                  <button type="button" className="text-button" onClick={onGetTestTokens} disabled={busy}>Get 10 test cUSDT</button>
                </>
              )}
            </div>
          )}
          <div className="action-stack">
            <button className="primary-button" onClick={onCreate}>
              <span className="button-icon"><Icon name="plus" size={18} /></span>
              <span><strong>Create a vault</strong><small>Open a new two-player match</small></span>
              <Icon name="chevron" size={17} className="button-arrow" />
            </button>
            <button className={`secondary-button ${joinOpen ? "secondary-active" : ""}`} onClick={onOpenJoin}>
              <span className="button-icon"><Icon name="link" size={17} /></span>
              <span><strong>Join with a code</strong><small>Slip into an existing match</small></span>
              <Icon name={joinOpen ? "x" : "chevron"} size={17} className="button-arrow" />
            </button>
          </div>
          {joinOpen && (
            <div className="join-drawer">
              <label htmlFor="match-code">MATCH CODE</label>
              <div className="join-input-row">
                <input
                  id="match-code"
                  value={joinCode}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => onJoinCodeChange(event.target.value)}
                  placeholder="SHD-4K7J"
                  autoFocus
                  onKeyDown={(event) => event.key === "Enter" && onJoin()}
                />
                <button className="square-button" onClick={onJoin} aria-label="Join match"><Icon name="arrow" size={18} /></button>
              </div>
              <p>Try any code in the mocknet build. A rival will be waiting.</p>
            </div>
          )}
          <div className="panel-divider"><span /> <span>HOW IT WORKS</span> <span /></div>
          <div className="mini-steps">
            <div><span>01</span><p>Pick a move</p></div>
            <div><span>02</span><p>Seal it</p></div>
            <div><span>03</span><p>Take the vault</p></div>
          </div>
          <div className="wallet-note">
            <span className={`wallet-orb ${connected ? "is-on" : ""}`}><Icon name={connected ? "check" : "lock"} size={14} /></span>
            <span>{liveReady ? "Wallet connected · live Sepolia ready" : connected ? "Wallet connected · demo mode" : "Connect your wallet when you’re ready"}</span>
            <Icon name="chevron" size={14} className="note-chevron" />
          </div>
        </div>
      </section>
    </div>
  );
}

function ProgressSteps({ opponentJoined, inGame = false }: { opponentJoined: boolean; inGame?: boolean }) {
  return (
    <div className="progress-steps">
      <div className="progress-step is-done"><span>01</span><strong>Share the code</strong><Icon name="check" size={13} /></div>
      <div className={`progress-step ${opponentJoined ? "is-done" : "is-current"}`}><span>02</span><strong>Seat the rival</strong>{opponentJoined ? <Icon name="check" size={13} /> : <span className="step-pulse" />}</div>
      <div className={`progress-step ${inGame ? "is-current" : ""}`}><span>03</span><strong>Play the round</strong>{inGame && <span className="step-pulse" />}</div>
    </div>
  );
}

export function WaitingView({
  matchCode,
  opponentJoined,
  liveMode,
  stakeLabel,
  inviteOnly,
  onBack,
  onSimulateOpponent,
  onRefresh,
  onEnter,
  onCopyInvite,
  onCancel,
}: {
  matchCode: string;
  opponentJoined: boolean;
  liveMode: boolean;
  stakeLabel: string | null;
  inviteOnly: boolean;
  onBack: () => void;
  onSimulateOpponent: () => void;
  onRefresh: () => void;
  onEnter: () => void;
  onCopyInvite: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="waiting-layout">
      <div className="subpage-heading">
        <button className="back-button" onClick={onBack}><Icon name="back" size={16} /> Lobby</button>
        <div className="subpage-meta"><span className="status-dot" /> Match lobby / {matchCode}</div>
      </div>
      <div className="waiting-content">
        <section className="waiting-main">
          <div className="hero-stamp"><Icon name="radio" size={13} /> VAULT CREATED / ENCRYPTION STANDBY</div>
          <h1>Leave the door<br /><em>open.</em></h1>
          <p className="hero-copy">Share the code below. Once both seats are locked, neither player can see the other’s move until the vault resolves.</p>
          <div className="match-code-card">
            <div><span className="match-code-label">YOUR MATCH CODE</span><strong>{matchCode}</strong></div>
            <div className="invite-actions"><button className="copy-code-button" onClick={() => navigator.clipboard?.writeText(matchCode)}><Icon name="copy" size={15} /> Copy code</button><button className="copy-code-button invite-button" onClick={onCopyInvite}><Icon name="link" size={15} /> Share invite</button></div>
          </div>
          {(stakeLabel || inviteOnly) && <div className="vault-badges">{stakeLabel && <span className="vault-badge"><Icon name="lock" size={12} /> Stake {stakeLabel} each, paid out in encrypted cUSDT</span>}{inviteOnly && <span className="vault-badge"><Icon name="key" size={12} /> Invite only</span>}</div>}
          <div className="waiting-actions">
            {!opponentJoined ? (
              <button className="primary-button compact-button" onClick={liveMode ? onRefresh : onSimulateOpponent}><span className="button-icon"><Icon name="users" size={17} /></span><span><strong>{liveMode ? "Refresh vault status" : "Simulate rival joining"}</strong><small>{liveMode ? "Read the live match on Sepolia" : "Mock the second wallet for this demo"}</small></span><Icon name="chevron" size={17} className="button-arrow" /></button>
            ) : (
              <button className="primary-button compact-button" onClick={onEnter}><span className="button-icon"><Icon name="vault" size={17} /></span><span><strong>Enter the vault</strong><small>Both seats are ready to play</small></span><Icon name="arrow" size={17} className="button-arrow" /></button>
            )}
          </div>
          {liveMode && !opponentJoined && <button className="text-button" onClick={onCancel}>Cancel this vault</button>}
          <ProgressSteps opponentJoined={opponentJoined} />
        </section>
        <aside className="waiting-aside">
          <div className="status-card">
            <div className="status-card-top"><SectionKicker icon="users">Seat status</SectionKicker><span className={`live-badge ${opponentJoined ? "ready" : ""}`}><span className="status-dot" /> {opponentJoined ? "READY" : "OPEN"}</span></div>
            <div className="seat-row"><span className="seat-avatar your-seat">YOU</span><div><strong>Player one</strong><small>{liveMode ? "Connected wallet · on-chain" : "0x73…4A1C · host"}</small></div><span className="seat-check"><Icon name="check" size={14} /></span></div>
            <div className="seat-line"><span /></div>
            <div className={`seat-row ${opponentJoined ? "seat-joined" : ""}`}><span className="seat-avatar opponent-seat">{opponentJoined ? "R" : "?"}</span><div><strong>{opponentJoined ? "Rival wallet" : "Waiting for rival"}</strong><small>{opponentJoined ? "0xB8…91DF · challenger" : "Share the code to unlock"}</small></div>{opponentJoined ? <span className="seat-check"><Icon name="check" size={14} /></span> : <span className="seat-waiting"><span className="status-dot" /></span>}</div>
          </div>
          <div className="confidential-note"><Icon name="lock" size={16} /><div><strong>Why sealed?</strong><p>If choices were public, the second player could always counter-pick. Confidential state makes the game fair.</p></div></div>
        </aside>
      </div>
    </div>
  );
}

function Scoreboard({ round, yourScore, opponentScore }: { round: number; yourScore: number; opponentScore: number }) {
  return (
    <div className="scoreboard">
      <div className="score-team"><span className="team-chip team-you">YOU</span><strong>{yourScore.toString().padStart(2, "0")}</strong></div>
      <div className="score-middle"><span>ROUND</span><strong>{round.toString().padStart(2, "0")}</strong><span className="score-divider" /></div>
      <div className="score-team score-team-opponent"><strong>{opponentScore.toString().padStart(2, "0")}</strong><span className="team-chip team-rival">RIVAL</span></div>
    </div>
  );
}

export function ActionCard({ action, selected, disabled, onSelect }: { action: Action; selected: boolean; disabled: boolean; onSelect: () => void }) {
  const meta = actionMeta[action];
  return (
    <button className={`action-card action-${action} ${selected ? "is-selected" : ""}`} onClick={onSelect} disabled={disabled} aria-pressed={selected}>
      <div className="action-card-top"><span className="action-number">0{action === "steal" ? 1 : action === "guard" ? 2 : 3}</span><span className="action-glyph"><Icon name={meta.glyph as IconName} size={23} /></span></div>
      <div className="action-card-copy"><span className="action-eyebrow">{meta.eyebrow}</span><h3>{meta.label}</h3><p>{meta.description}</p></div>
      <div className="action-card-foot"><span>{meta.detail}</span><span className={`select-indicator ${selected ? "selected" : ""}`}>{selected && <Icon name="check" size={13} />}</span></div>
    </button>
  );
}

function ProcessingPanel({ state, liveMode }: { state: ProcessingState; liveMode: boolean }) {
  const stages: { state: ProcessingState; label: string }[] = [
    { state: "encrypting", label: "Seal" },
    { state: "submitting", label: "Submit" },
    { state: "waiting", label: "Wait" },
    { state: "resolving", label: "Resolve" },
    { state: "decrypting", label: "Reveal" },
  ];
  const activeIndex = stages.findIndex((stage) => stage.state === state);
  const progress = state === "resolved" ? stages.length : Math.max(activeIndex + 1, 0);

  return (
    <div className={`processing-panel ${state !== "idle" ? "is-processing" : ""}`}>
      <div className="processing-header"><span className="processing-orb"><Icon name={state === "idle" ? "lock" : state === "resolved" ? "check" : "bolt"} size={16} /></span><span><strong>{processingLabel(state)}</strong><small>{state === "idle" ? "Nothing leaves the vault in plain text." : liveMode ? "Sepolia transaction lifecycle" : "Mock transaction lifecycle"}</small></span><span className="processing-count">{state === "idle" ? "—" : `${Math.min(progress, stages.length).toString().padStart(2, "0")}/05`}</span></div>
      {state !== "idle" && <div className="processing-track"><span style={{ width: `${(progress / stages.length) * 100}%` }} /></div>}
      <div className="processing-stages">{stages.map((stage, index) => <span key={stage.state} className={`${index < progress ? "is-done" : ""} ${stage.state === state ? "is-current" : ""}`}><i />{stage.label}</span>)}</div>
    </div>
  );
}

export type MatchOutcome = {
  kind: "win" | "loss" | "draw" | "forfeit-win" | "forfeit-loss";
  yourScore: number;
  opponentScore: number;
};

function MatchFinal({ outcome, stakeLabel, payoutSent, onSettle, onRematch, onBack }: { outcome: MatchOutcome; stakeLabel: string | null; payoutSent: boolean; onSettle: () => void; onRematch: () => void; onBack: () => void }) {
  const copy = {
    win: { title: "Vault cracked. You win the match.", note: "Your encrypted score beat the rival's once the final round opened." },
    loss: { title: "The rival took the match.", note: "Their encrypted score finished ahead once the final round opened." },
    draw: { title: "Dead even. The vault stays shut.", note: "Both scores finished level." },
    "forfeit-win": { title: "Rival timed out. The win is yours.", note: "They stopped moving, so the contract awarded you the match whatever the score said." },
    "forfeit-loss": { title: "You timed out. The rival takes the match.", note: "A forfeit ends the match for the player who stopped moving." },
  }[outcome.kind];
  const tone = outcome.kind === "win" || outcome.kind === "forfeit-win" ? "outcome-you" : outcome.kind === "draw" ? "outcome-draw" : "outcome-opponent";
  return (
    <div className={`resolution-card match-final ${tone} reveal-stage-4`} role="status">
      <div className="resolution-top"><span className="resolution-kicker"><Icon name="vault" size={13} /> MATCH COMPLETE</span></div>
      <div className="resolution-head is-visible"><div><h2>{copy.title}</h2><p>{copy.note}</p></div><div className="resolution-points"><strong>{outcome.yourScore}–{outcome.opponentScore}</strong><span>final score</span></div></div>
      {stakeLabel && <div className="payout-row"><Icon name="lock" size={14} /><span>{payoutSent ? "Payout sent. Amounts are encrypted, so check your cUSDT balance." : `Stake ${stakeLabel} each. The winner takes the pot; a draw returns both stakes.`}</span>{!payoutSent && <button className="primary-button compact-button" onClick={onSettle}><strong>Send payout</strong></button>}</div>}
      <div className="resolution-actions"><button className="primary-button compact-button" onClick={onRematch}><span className="button-icon"><Icon name="refresh" size={16} /></span><span><strong>Create linked rematch</strong><small>Same rival, fresh vault</small></span><Icon name="arrow" size={16} className="button-arrow" /></button><button className="text-button" onClick={onBack}>Back to lobby</button></div>
    </div>
  );
}

function RoundResolution({ result, revealStage, matchOver, onNextRound, onRematch }: { result: RoundResult; revealStage: number; matchOver: boolean; onNextRound: () => void; onRematch: () => void }) {
  const outcomeCopy = result.winner === "you" ? "You took the vault." : result.winner === "opponent" ? "The rival got there first." : "The vault stayed quiet.";
  const revealLabel = revealStage === 0 ? "Reading encrypted handles" : revealStage === 1 ? "Your move is clear" : revealStage === 2 ? "Rival move is clear" : revealStage === 3 ? "Random event decoded" : "Round resolved";
  const actionCopy = (action: Action, visible: boolean) => visible ? <><ActionGlyph action={action} /> {actionMeta[action].label}</> : <><Icon name="lock" size={13} /> SEALED</>;
  return (
    <div className={`resolution-card outcome-${result.winner} reveal-stage-${revealStage}`}>
      <div className="resolution-top"><span className="resolution-kicker"><Icon name={revealStage === 4 ? "spark" : "lock"} size={13} /> {revealLabel}</span><span className={`resolution-event ${revealStage >= 3 ? "is-visible" : ""}`}><Icon name="bolt" size={12} /> {revealStage >= 3 ? result.eventTitle : "RANDOM EVENT / HIDDEN"}</span></div>
      <div className={`resolution-head ${revealStage >= 4 ? "is-visible" : "is-hidden"}`}><div><h2>{outcomeCopy}</h2><p>{result.eventDescription}</p></div><div className="resolution-points"><strong>{result.winner === "you" ? `+${result.pointsYou}` : result.winner === "opponent" ? `-${result.pointsOpponent}` : "±0"}</strong><span>points</span></div></div>
      <div className="revealed-actions"><div className={revealStage >= 1 ? "is-revealed" : "is-sealed"}><span>YOUR MOVE</span><strong>{actionCopy(result.playerAction, revealStage >= 1 && result.movesKnown !== false)}</strong></div><span className="versus">VS</span><div className={`revealed-rival ${revealStage >= 2 ? "is-revealed" : "is-sealed"}`}><span>RIVAL MOVE</span><strong>{actionCopy(result.opponentAction, revealStage >= 2 && result.movesKnown !== false)}</strong></div></div>
      {revealStage >= 3 && <div className="event-reveal"><Icon name="spark" size={14} /><span><strong>{result.eventTitle}</strong><small>{result.eventDescription}</small></span></div>}
      {revealStage >= 4 && !matchOver && <div className="resolution-actions"><button className="primary-button compact-button" onClick={onNextRound}><span className="button-icon"><Icon name="refresh" size={16} /></span><span><strong>Open next round</strong><small>Keep the vault sealed</small></span><Icon name="arrow" size={16} className="button-arrow" /></button><button className="text-button" onClick={onRematch}>Create linked rematch</button></div>}
    </div>
  );
}

function ActionGlyph({ action }: { action: Action }) {
  return <span className={`inline-action-icon inline-${action}`}><Icon name={actionMeta[action].glyph as IconName} size={13} /></span>;
}

export function GameView({
  matchCode,
  liveMode,
  round,
  countdownSeconds,
  revealStage,
  yourScore,
  opponentScore,
  selectedAction,
  processing,
  result,
  matchOutcome,
  stakeLabel,
  payoutSent,
  onSettle,
  forfeitClaimable,
  onClaimForfeit,
  onSelectAction,
  onSubmit,
  onNextRound,
  onRematch,
  onBack,
}: {
  matchCode: string;
  liveMode: boolean;
  round: number;
  countdownSeconds: number;
  revealStage: number;
  yourScore: number;
  opponentScore: number;
  selectedAction: Action | null;
  processing: ProcessingState;
  result: RoundResult | null;
  matchOutcome: MatchOutcome | null;
  stakeLabel: string | null;
  payoutSent: boolean;
  onSettle: () => void;
  forfeitClaimable: boolean;
  onClaimForfeit: () => void;
  onSelectAction: (action: Action) => void;
  onSubmit: () => void;
  onNextRound: () => void;
  onRematch: () => void;
  onBack: () => void;
}) {
  const locked = processing !== "idle";
  return (
    <div className="game-layout">
      <div className="subpage-heading"><button className="back-button" onClick={onBack}><Icon name="back" size={16} /> Exit match</button><div className="subpage-meta"><span className="status-dot status-dot-bright" /> {liveMode ? "SEPOLIA / FHEVM V2" : "DEMO / FHEVM SIMULATION"}</div></div>
      <div className="game-topline"><div><div className="hero-stamp"><Icon name="radio" size={13} /> MATCH IN PROGRESS / VAULT {matchCode}</div><h1>Make your<br /><em>move.</em></h1><div className="round-mission"><span className="status-dot status-dot-bright" /> ROUND {round.toString().padStart(2, "0")} OF 03 <span className="mission-divider" /> BOTH MOVES HIDDEN</div></div><Scoreboard round={round} yourScore={yourScore} opponentScore={opponentScore} /></div>
      <div className="game-content">
        <section className="move-section"><div className="move-section-heading"><div><SectionKicker icon="target">Your angle</SectionKicker><h2>Pick one. Seal it.</h2></div><div className="round-tools"><span className={`countdown-badge ${countdownSeconds <= 5 ? "is-urgent" : ""}`} aria-live="polite"><span className="countdown-ring" /><Icon name="clock" size={14} /> {countdownSeconds}s</span><span className="move-lock-note"><Icon name="lock" size={14} /> Hidden from rival</span></div></div><div className="action-grid"><ActionCard action="steal" selected={selectedAction === "steal"} disabled={locked} onSelect={() => onSelectAction("steal")} /><ActionCard action="guard" selected={selectedAction === "guard"} disabled={locked} onSelect={() => onSelectAction("guard")} /><ActionCard action="scout" selected={selectedAction === "scout"} disabled={locked} onSelect={() => onSelectAction("scout")} /></div><div className={`submit-row ${locked ? "is-sealed" : ""}`}><div className="submit-hint">{selectedAction ? <><span className="status-dot status-dot-bright" /> {locked ? "Move sealed · rival cannot see it" : `${actionMeta[selectedAction].label} selected · ready to seal`}</> : countdownSeconds <= 5 ? <><span className="status-dot status-dot-bright" /> Vault closing · choose now</> : <><span className="status-dot" /> Choose an action to continue</>}</div><button className="seal-button" onClick={onSubmit} disabled={!selectedAction || locked}>{locked ? <><Icon name="lock" size={16} /> Move sealed</> : <><Icon name="key" size={16} /> Seal my move</>}</button></div>{forfeitClaimable && !matchOutcome && <div className="forfeit-card" role="alert"><Icon name="clock" size={16} /><span><strong>Your rival went silent.</strong><small>They have not moved for 30 minutes. Claim the match.</small></span><button className="primary-button compact-button" onClick={onClaimForfeit}><strong>Claim the win</strong></button></div>}{result && <RoundResolution result={result} revealStage={revealStage} matchOver={Boolean(matchOutcome)} onNextRound={onNextRound} onRematch={onRematch} />}{matchOutcome && (!result || revealStage >= 4) && <MatchFinal outcome={matchOutcome} stakeLabel={stakeLabel} payoutSent={payoutSent} onSettle={onSettle} onRematch={onRematch} onBack={onBack} />}</section>
        <aside className="game-aside"><ProcessingPanel state={processing} liveMode={liveMode} /><div className="intel-card"><div className="intel-top"><SectionKicker icon="scan">Live intel</SectionKicker><span className="encrypted-label"><Icon name="lock" size={12} /> ENCRYPTED</span></div><div className="intel-visual"><div className="intel-lines"><span /><span /><span /><span /></div><div className="intel-core"><Icon name="vault" size={27} /></div><div className="intel-rings" /></div><h3>The rival’s move is sealed.</h3><p>Public observers can see a transaction. They cannot see the choice inside it.</p><div className="intel-footer"><span><span className="status-dot" /> Observer view</span><span>NO TELLS</span></div></div><div className="rules-mini"><span className="rules-mini-title">COUNTER CYCLE</span><div><span className="rule-pill pill-steal">STEAL</span><Icon name="chevron" size={13} /><span className="rule-pill pill-scout">SCOUT</span><Icon name="chevron" size={13} /><span className="rule-pill pill-guard">GUARD</span><Icon name="chevron" size={13} /></div><small>Every move has a counter. Never assume the obvious play.</small></div></aside>
      </div>
    </div>
  );
}

export function Toast({ message, error = false, actionLabel, onAction, onDismiss }: { message: string; error?: boolean; actionLabel?: string; onAction?: () => void; onDismiss: () => void }) {
  return <div className={`toast ${error ? "toast-error" : ""}`} role={error ? "alert" : "status"}><span className="toast-icon"><Icon name={error ? "warning" : "check"} size={14} /></span><span className="toast-message">{message}</span>{actionLabel && onAction && <button className="toast-action" onClick={onAction}>{actionLabel}</button>}<button aria-label="Dismiss notification" onClick={onDismiss}><Icon name="x" size={14} /></button></div>;
}
