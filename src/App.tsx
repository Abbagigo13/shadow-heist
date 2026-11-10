import { useEffect, useRef, useState } from "react";
import {
  calculateResult,
  getHeistEvent,
  heistEvents,
  opponentSequence,
  type Action,
  type MatchView,
  type ProcessingState,
  type RoundResult,
} from "./game";
import {
  connectWalletConnect,
  disconnectWallet,
  refreshWalletSession,
  restoreWalletSession,
  SHADOW_HEIST_ADDRESS,
  watchWallet,
  type WalletSession,
} from "./chain";
import {
  canClaimForfeit,
  cancelLiveMatch,
  claimLiveForfeit,
  createLiveMatch,
  decryptLiveRound,
  decryptLiveScore,
  joinLiveMatch,
  readLiveMatch,
  rematchLiveMatch,
  type LiveMatchState,
  resolveLiveRound,
  submitLiveAction,
  startNextLiveRound,
  waitForLiveMatchState,
} from "./liveGame";
import {
  GameView,
  type MatchOutcome,
  LandingView,
  LobbyView,
  SiteHeader,
  Toast,
  WaitingView,
} from "./components";
import { isSoundMuted, playSound, setSoundMuted } from "./sound";
import { friendlyError, type RecoveryAction } from "./errors";

function makeMatchCode() {
  return `SHD-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

const ROUND_TIME_SECONDS = 20;

function App() {
  const [view, setView] = useState<MatchView>("lobby");
  const [showLanding, setShowLanding] = useState(true);
  const [wallet, setWallet] = useState<WalletSession | null>(null);
  const [connectionBusy, setConnectionBusy] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [matchCode, setMatchCode] = useState("SHD-4K7J");
  const [liveMode, setLiveMode] = useState(false);
  const [liveMatchId, setLiveMatchId] = useState<bigint | null>(null);
  const [opponentJoined, setOpponentJoined] = useState(false);
  const [selectedAction, setSelectedAction] = useState<Action | null>(null);
  const [countdownSeconds, setCountdownSeconds] = useState(ROUND_TIME_SECONDS);
  const [revealStage, setRevealStage] = useState(0);
  const [processing, setProcessing] = useState<ProcessingState>("idle");
  const [round, setRound] = useState(1);
  const [yourScore, setYourScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [matchOutcome, setMatchOutcome] = useState<MatchOutcome | null>(null);
  const [forfeitClaimable, setForfeitClaimable] = useState(false);
  const [result, setResult] = useState<RoundResult | null>(null);
  const [toastMessage, setToastMessage] = useState("");
  const [recoveryAction, setRecoveryAction] = useState<RecoveryAction | null>(null);
  const [soundMuted, setSoundMutedState] = useState(() => {
    try {
      return window.localStorage.getItem("shadow-heist:sound-muted") === "1";
    } catch {
      return false;
    }
  });
  const timers = useRef<number[]>([]);
  const selectedActionRef = useRef<Action | null>(null);

  selectedActionRef.current = selectedAction;
  const yourScoreRef = useRef(0);
  const opponentScoreRef = useRef(0);
  yourScoreRef.current = yourScore;
  opponentScoreRef.current = opponentScore;

  useEffect(() => {
    setSoundMuted(soundMuted);
  }, [soundMuted]);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => setToastMessage(""), 3400);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  useEffect(() => {
    const sharedMatch = new URLSearchParams(window.location.search).get("match");
    if (!sharedMatch) return;
    setShowLanding(false);
    setJoinCode(sharedMatch);
    setJoinOpen(true);
    setToastMessage(`Invite loaded for match ${sharedMatch}. Connect your wallet to join.`);
    window.history.replaceState({}, "", window.location.pathname);
  }, []);

  useEffect(() => {
    return () => timers.current.forEach((timer) => window.clearTimeout(timer));
  }, []);

  function clearRoundTimers() {
    timers.current.forEach((timer) => window.clearTimeout(timer));
    timers.current = [];
  }

  function resetMatchProgress() {
    setRound(1);
    setYourScore(0);
    setOpponentScore(0);
    setMatchOutcome(null);
    setForfeitClaimable(false);
  }

  function notifyError(error: unknown, fallback: string, recovery?: RecoveryAction) {
    setRecoveryAction(recovery ?? null);
    setToastMessage(friendlyError(error, fallback));
    playSound("error");
  }

  async function handleCreateMatch() {
    setJoinOpen(false);
    setRecoveryAction(null);

    if (wallet && SHADOW_HEIST_ADDRESS) {
      setConnectionBusy(true);
      try {
        setToastMessage("Creating the vault on Sepolia…");
        playSound("vault");
        const created = await createLiveMatch(wallet, 2, 3, 0n);
        setLiveMode(true);
        setLiveMatchId(created.matchId);
        setMatchCode(created.matchId.toString());
        setOpponentJoined(false);
        resetMatchProgress();
        setView("waiting");
        setToastMessage(`Vault #${created.matchId.toString()} created. Share the match ID.`);
      } catch (error) {
        notifyError(error, "Live vault creation failed.", { label: "Retry", run: () => void handleCreateMatch() });
      } finally {
        setConnectionBusy(false);
      }
      return;
    }

    setLiveMode(false);
    setLiveMatchId(null);
    setMatchCode(makeMatchCode());
    setOpponentJoined(false);
    resetMatchProgress();
    setView("waiting");
    playSound("vault");
    setToastMessage(wallet ? "Contract address missing; opened demo mode." : "Vault created in demo mode. Share the match code with your rival.");
  }

  async function handleJoinMatch() {
    const normalized = joinCode.trim().toUpperCase();
    setRecoveryAction(null);

    if (wallet && SHADOW_HEIST_ADDRESS) {
      const numericMatchId = normalized.replace(/^#/, "");
      if (!/^\d+$/.test(numericMatchId)) {
        setToastMessage("Live matches use the numeric on-chain match ID.");
        return;
      }

      setConnectionBusy(true);
      try {
        const matchId = BigInt(numericMatchId);
        setToastMessage(`Joining vault #${numericMatchId} on Sepolia…`);
        playSound("opponent");
        await joinLiveMatch(wallet, matchId);
        const state = await readLiveMatch(wallet, matchId);
        setLiveMode(true);
        setLiveMatchId(matchId);
        setMatchCode(numericMatchId);
        setOpponentJoined(state.playerTwo !== "0x0000000000000000000000000000000000000000");
        resetMatchProgress();
        setJoinOpen(false);
        setView("waiting");
        setToastMessage(`Joined vault #${numericMatchId}. Waiting for the host to play.`);
      } catch (error) {
        notifyError(error, "Live vault join failed.", { label: "Retry", run: () => void handleJoinMatch() });
      } finally {
        setConnectionBusy(false);
      }
      return;
    }

    setMatchCode(normalized || "SHD-4K7J");
    resetMatchProgress();
    setLiveMode(false);
    setLiveMatchId(null);
    setOpponentJoined(true);
    setJoinOpen(false);
    setView("waiting");
    playSound("opponent");
    setToastMessage("You slipped in. Your rival is already watching the door.");
  }

  async function handleWalletConnect() {
    setRecoveryAction(null);
    if (wallet) {
      try {
        await disconnectWallet(wallet);
        setWallet(null);
        setToastMessage("Wallet disconnected. Demo mode is still available.");
      } catch (error) {
        setToastMessage(error instanceof Error ? error.message : "Wallet disconnect failed.");
      }
      return;
    }

    setConnectionBusy(true);
    try {
      const session = await connectWalletConnect();
      setWallet(session);
      playSound("connect");
      setToastMessage("Wallet connected on Sepolia.");
    } catch (error) {
      notifyError(error, "Wallet connection failed.", { label: "Retry", run: () => void handleWalletConnect() });
    } finally {
      setConnectionBusy(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    void restoreWalletSession().then((session) => {
      if (session && !cancelled) setWallet(session);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!wallet) return;
    return watchWallet(wallet, {
      onLost: (reason) => {
        setWallet(null);
        setToastMessage(
          reason === "wrong-network"
            ? "Your wallet left Sepolia. Reconnect to keep playing."
            : "Wallet disconnected. Demo mode is still available.",
        );
      },
      onAccountChange: () => {
        void refreshWalletSession(wallet)
          .then((next) => {
            setWallet(next);
            setToastMessage("Wallet account changed.");
          })
          .catch(() => setWallet(null));
      },
    });
  }, [wallet]);

  async function refreshLiveMatch() {
    if (!wallet || !liveMode || liveMatchId === null) return;
    try {
      const state = await readLiveMatch(wallet, liveMatchId);
      setOpponentJoined(state.playerTwo !== "0x0000000000000000000000000000000000000000");
      setRound(state.round);
    } catch (error) {
      notifyError(error, "Could not read the live vault.", { label: "Retry", run: () => void refreshLiveMatch() });
    }
  }

  useEffect(() => {
    if (!liveMode || !wallet || liveMatchId === null || view !== "waiting") return;
    void refreshLiveMatch();
    const interval = window.setInterval(() => void refreshLiveMatch(), 4_500);
    return () => window.clearInterval(interval);
  }, [liveMode, wallet, liveMatchId, view]);

  useEffect(() => {
    if (view !== "game" || processing !== "idle" || result) return;

    setCountdownSeconds(ROUND_TIME_SECONDS);
    const interval = window.setInterval(() => {
      setCountdownSeconds((seconds) => {
        const next = Math.max(seconds - 1, 0);
        if (next > 0) playSound("tick");
        return next;
      });
    }, 1000);
    const expiry = window.setTimeout(() => {
      playSound("error");
      void handleSubmitAction(selectedActionRef.current ?? "scout");
    }, ROUND_TIME_SECONDS * 1000);

    return () => {
      window.clearInterval(interval);
      window.clearTimeout(expiry);
    };
  }, [view, round, processing, result]);

  useEffect(() => {
    if (!result) {
      setRevealStage(0);
      return;
    }

    setRevealStage(0);
    const revealTimers = [
      window.setTimeout(() => setRevealStage(1), 420),
      window.setTimeout(() => setRevealStage(2), 980),
      window.setTimeout(() => setRevealStage(3), 1_540),
      window.setTimeout(() => setRevealStage(4), 2_180),
    ];
    return () => revealTimers.forEach((timer) => window.clearTimeout(timer));
  }, [result]);

  function handleSimulateOpponent() {
    setOpponentJoined(true);
    playSound("opponent");
    setToastMessage("Rival detected. Both seats are locked in.");
  }

  async function handleCopyInvite() {
    const inviteUrl = `${window.location.origin}${window.location.pathname}?match=${encodeURIComponent(matchCode)}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Join Shadow Heist",
          text: `Join my confidential vault: ${matchCode}`,
          url: inviteUrl,
        });
      } else {
        await navigator.clipboard?.writeText(inviteUrl);
        setToastMessage("Invite link copied. Send it to your rival.");
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setToastMessage("Could not share the invite link. Copy the match code instead.");
    }
  }

  function handleEnterGame() {
    setView("game");
    setCountdownSeconds(ROUND_TIME_SECONDS);
    setSelectedAction(null);
    setProcessing("idle");
    setResult(null);
  }

  function handleBackToLobby() {
    clearRoundTimers();
    setShowLanding(false);
    setView("lobby");
    setLiveMode(false);
    setLiveMatchId(null);
    setJoinOpen(false);
    setJoinCode("");
    setOpponentJoined(false);
    setSelectedAction(null);
    setProcessing("idle");
    setResult(null);
    resetMatchProgress();
  }

  /** Waits for the rival, resolves the round, and reveals it. Safe to call again after an error. */
  async function continueLiveRound(activeWallet: WalletSession, matchId: bigint) {
    setForfeitClaimable(false);
    try {
      setProcessing("waiting");
      const readyState = await waitForLiveMatchState(
        activeWallet,
        matchId,
        (state) => state.roundResolved || state.finished || state.cancelled || (state.playerOneSubmitted && state.playerTwoSubmitted) || canClaimForfeit(state),
        { timeoutMs: 10 * 60_000 },
      );

      if (readyState.cancelled) throw new Error("match is closed");
      if (!readyState.roundResolved && !(readyState.playerOneSubmitted && readyState.playerTwoSubmitted)) {
        if (readyState.finished) {
          await finishMatch(activeWallet, matchId, readyState);
          return;
        }
        setForfeitClaimable(true);
        setToastMessage("Your rival has not moved for 30 minutes. You can claim the win.");
        return;
      }

      setProcessing("resolving");
      if (!readyState.roundResolved) {
        try {
          await resolveLiveRound(activeWallet, matchId);
        } catch (error) {
          const latestState = await readLiveMatch(activeWallet, matchId);
          if (!latestState.roundResolved) throw error;
        }
      }

      const resolvedState = await waitForLiveMatchState(activeWallet, matchId, (state) => state.roundResolved);
      setProcessing("decrypting");
      const decrypted = await decryptLiveRound(activeWallet, matchId, resolvedState.round);
      const isPlayerOne = activeWallet.address.toLowerCase() === resolvedState.playerOne.toLowerCase();
      const playerAction = isPlayerOne ? decrypted.playerAction : decrypted.opponentAction;
      const opponentAction = isPlayerOne ? decrypted.opponentAction : decrypted.playerAction;
      const pointsYou = isPlayerOne ? decrypted.pointsYou : decrypted.pointsOpponent;
      const pointsOpponent = isPlayerOne ? decrypted.pointsOpponent : decrypted.pointsYou;
      const winner = decrypted.outcome === 0
        ? "draw"
        : (decrypted.outcome === 1) === isPlayerOne ? "you" : "opponent";
      const liveResult: RoundResult = {
        playerAction: playerAction === 1 ? "steal" : playerAction === 2 ? "guard" : "scout",
        opponentAction: opponentAction === 1 ? "steal" : opponentAction === 2 ? "guard" : "scout",
        winner,
        pointsYou,
        pointsOpponent,
        eventTitle: getHeistEvent(decrypted.eventCode).title,
        eventDescription: getHeistEvent(decrypted.eventCode).description,
      };
      setRound(resolvedState.round);
      setYourScore((score) => score + liveResult.pointsYou);
      setOpponentScore((score) => score + liveResult.pointsOpponent);
      setResult(liveResult);
      setProcessing("resolved");
      playSound(liveResult.winner === "you" ? "win" : liveResult.winner === "opponent" ? "lose" : "draw");
      if (resolvedState.finished) await finishMatch(activeWallet, matchId, resolvedState);
    } catch (error) {
      notifyError(error, "Live round failed.", { label: "Keep going", run: () => void continueLiveRound(activeWallet, matchId) });
    }
  }

  /** Reads the final encrypted score and decides the match result. A forfeit win beats the score. */
  async function finishMatch(activeWallet: WalletSession, matchId: bigint, state: LiveMatchState) {
    const me = activeWallet.address.toLowerCase();
    const isPlayerOne = me === state.playerOne.toLowerCase();
    const score = await decryptLiveScore(activeWallet, matchId);
    const you = isPlayerOne ? score.scoreOne : score.scoreTwo;
    const rival = isPlayerOne ? score.scoreTwo : score.scoreOne;
    setYourScore(you);
    setOpponentScore(rival);
    setProcessing("resolved");
    if (state.forfeitWinner) {
      setMatchOutcome({ kind: state.forfeitWinner.toLowerCase() === me ? "forfeit-win" : "forfeit-loss", yourScore: you, opponentScore: rival });
    } else {
      setMatchOutcome({ kind: you > rival ? "win" : you < rival ? "loss" : "draw", yourScore: you, opponentScore: rival });
    }
  }

  async function handleClaimForfeit() {
    if (!wallet || liveMatchId === null) return;
    setRecoveryAction(null);
    setConnectionBusy(true);
    try {
      setToastMessage("Claiming the win on Sepolia…");
      await claimLiveForfeit(wallet, liveMatchId);
      const state = await readLiveMatch(wallet, liveMatchId);
      setForfeitClaimable(false);
      await finishMatch(wallet, liveMatchId, state);
      playSound("win");
    } catch (error) {
      notifyError(error, "Could not claim the forfeit.", { label: "Retry", run: () => void handleClaimForfeit() });
    } finally {
      setConnectionBusy(false);
    }
  }

  async function handleCancelVault() {
    if (!wallet || liveMatchId === null) return;
    setRecoveryAction(null);
    setConnectionBusy(true);
    try {
      await cancelLiveMatch(wallet, liveMatchId);
      handleBackToLobby();
      setToastMessage("Vault cancelled. No one can join it now.");
    } catch (error) {
      notifyError(error, "Could not cancel the vault.", { label: "Retry", run: () => void handleCancelVault() });
    } finally {
      setConnectionBusy(false);
    }
  }

  async function handleSubmitAction(actionOverride?: Action) {
    const actionToSubmit = actionOverride ?? selectedAction;
    if (!actionToSubmit || processing !== "idle") return;
    setRecoveryAction(null);

    if (liveMode && wallet && liveMatchId !== null) {
      try {
        playSound("seal");
        await submitLiveAction(wallet, liveMatchId, actionToSubmit, setProcessing);
      } catch (error) {
        setProcessing("idle");
        notifyError(error, "Live round failed.", { label: "Retry move", run: () => void handleSubmitAction(actionToSubmit) });
        return;
      }
      await continueLiveRound(wallet, liveMatchId);
      return;
    }

    const opponentAction = opponentSequence[(round - 1) % opponentSequence.length];
    const demoEventCode = Math.floor(Math.random() * heistEvents.length);
    const nextResult = calculateResult(actionToSubmit, opponentAction, round, demoEventCode);
    clearRoundTimers();
    playSound("seal");
    setProcessing("encrypting");

    timers.current = [
      window.setTimeout(() => setProcessing("submitting"), 650),
      window.setTimeout(() => setProcessing("waiting"), 1250),
      window.setTimeout(() => setProcessing("resolving"), 1900),
      window.setTimeout(() => setProcessing("decrypting"), 2550),
      window.setTimeout(() => {
        setProcessing("resolved");
        setResult(nextResult);
        const nextYou = yourScoreRef.current + nextResult.pointsYou;
        const nextRival = opponentScoreRef.current + nextResult.pointsOpponent;
        setYourScore(nextYou);
        setOpponentScore(nextRival);
        if (round >= 3) {
          setMatchOutcome({ kind: nextYou > nextRival ? "win" : nextYou < nextRival ? "loss" : "draw", yourScore: nextYou, opponentScore: nextRival });
        }
        playSound(nextResult.winner === "you" ? "win" : nextResult.winner === "opponent" ? "lose" : "draw");
      }, 3250),
    ];
  }

  async function handleNextRound() {
    if (matchOutcome) {
      setToastMessage("The match is over. Choose rematch to open another vault.");
      return;
    }
    if (liveMode) {
      if (!wallet || liveMatchId === null) return;
      try {
        const state = await readLiveMatch(wallet, liveMatchId);
        if (state.finished) {
          setToastMessage("Best-of-three complete. Choose rematch to open another vault.");
          return;
        }
        setConnectionBusy(true);
        setToastMessage("Opening the next encrypted round…");
        await startNextLiveRound(wallet, liveMatchId);
        clearRoundTimers();
        setRound((currentRound) => currentRound + 1);
        setCountdownSeconds(ROUND_TIME_SECONDS);
        setSelectedAction(null);
        setProcessing("idle");
        setResult(null);
      } catch (error) {
        notifyError(error, "Could not open the next live round.", { label: "Retry round", run: () => void handleNextRound() });
      } finally {
        setConnectionBusy(false);
      }
      return;
    }
    clearRoundTimers();
    setRound((currentRound) => currentRound + 1);
    setCountdownSeconds(ROUND_TIME_SECONDS);
    setSelectedAction(null);
    setProcessing("idle");
    setResult(null);
    setToastMessage("New round opened. The vault has already shifted.");
  }

  async function handleRematch() {
    if (liveMode) {
      if (!wallet || liveMatchId === null) return;
      try {
        setConnectionBusy(true);
        setToastMessage("Creating a linked rematch vault on Sepolia…");
        const rematch = await rematchLiveMatch(wallet, liveMatchId);
        setLiveMatchId(rematch.matchId);
        setMatchCode(rematch.matchId.toString());
        resetMatchProgress();
        setResult(null);
        setProcessing("idle");
        setOpponentJoined(true);
        setView("waiting");
        setToastMessage(`Rematch vault #${rematch.matchId.toString()} created.`);
      } catch (error) {
        notifyError(error, "Could not create the rematch vault.", { label: "Retry rematch", run: () => void handleRematch() });
      } finally {
        setConnectionBusy(false);
      }
      return;
    }
    clearRoundTimers();
    resetMatchProgress();
    setSelectedAction(null);
    setProcessing("idle");
    setResult(null);
    setView("waiting");
    setOpponentJoined(false);
    setToastMessage("Fresh vault, fresh tells. Waiting for a rival.");
  }

  function handleToggleSound() {
    const nextMuted = !soundMuted;
    setSoundMutedState(nextMuted);
    setSoundMuted(nextMuted);
    try {
      window.localStorage.setItem("shadow-heist:sound-muted", nextMuted ? "1" : "0");
    } catch {
      // Keep the preference for this session when storage is unavailable.
    }
    if (!nextMuted && !isSoundMuted()) playSound("connect");
  }

  return (
    <div className="app-shell">
      <div className="ambient-glow ambient-glow-left" />
      <div className="ambient-glow ambient-glow-right" />
      <div className="grain" aria-hidden="true" />
      <SiteHeader
        connected={Boolean(wallet)}
        address={wallet?.address}
        connectionBusy={connectionBusy}
        view={view}
        onConnect={() => void handleWalletConnect()}
        onLogoClick={handleBackToLobby}
        soundMuted={soundMuted}
        onToggleSound={handleToggleSound}
      />

      <main className="page-frame">
        {view === "lobby" && showLanding && <LandingView onEnter={() => setShowLanding(false)} />}
        {view === "lobby" && !showLanding && (
          <LobbyView
            connected={Boolean(wallet)}
            liveReady={Boolean(wallet && SHADOW_HEIST_ADDRESS)}
            joinOpen={joinOpen}
            joinCode={joinCode}
            onJoinCodeChange={setJoinCode}
            onCreate={handleCreateMatch}
            onOpenJoin={() => setJoinOpen((open) => !open)}
            onJoin={handleJoinMatch}
          />
        )}
        {view === "waiting" && (
          <WaitingView
            matchCode={matchCode}
            opponentJoined={opponentJoined}
            liveMode={liveMode}
            onBack={handleBackToLobby}
            onSimulateOpponent={handleSimulateOpponent}
            onRefresh={() => void refreshLiveMatch()}
            onEnter={handleEnterGame}
            onCopyInvite={() => void handleCopyInvite()}
            onCancel={() => void handleCancelVault()}
          />
        )}
        {view === "game" && (
          <GameView
            matchCode={matchCode}
            liveMode={liveMode}
            round={round}
            countdownSeconds={countdownSeconds}
            revealStage={revealStage}
            yourScore={yourScore}
            opponentScore={opponentScore}
            selectedAction={selectedAction}
            processing={processing}
            result={result}
            matchOutcome={matchOutcome}
            forfeitClaimable={forfeitClaimable}
            onClaimForfeit={() => void handleClaimForfeit()}
            onSelectAction={setSelectedAction}
            onSubmit={handleSubmitAction}
            onNextRound={handleNextRound}
            onRematch={handleRematch}
            onBack={handleBackToLobby}
          />
        )}
      </main>

      <footer className="site-footer">
        <span>SHADOW HEIST / CONFIDENTIAL GAMING</span>
        <span className="footer-dot" />
        <span>{liveMode ? "SEPOLIA BUILD 0.2" : "MOCKNET BUILD 0.1"}</span>
        <span className="footer-spacer" />
        <span className="footer-lock"><span className="status-dot" /> {liveMode ? "FHE READY · LIVE" : "FHE READY · SIMULATED"}</span>
      </footer>

      {toastMessage && <Toast message={toastMessage} error={Boolean(recoveryAction)} actionLabel={recoveryAction?.label} onAction={() => { const action = recoveryAction; setRecoveryAction(null); action?.run(); }} onDismiss={() => { setToastMessage(""); setRecoveryAction(null); }} />}
    </div>
  );
}

export default App;
