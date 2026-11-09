import { useEffect, useRef, useState } from "react";
import {
  calculateResult,
  opponentSequence,
  type Action,
  type MatchView,
  type ProcessingState,
  type RoundResult,
} from "./game";
import {
  GameView,
  LobbyView,
  SiteHeader,
  Toast,
  WaitingView,
} from "./components";

function makeMatchCode() {
  return `SHD-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

function App() {
  const [view, setView] = useState<MatchView>("lobby");
  const [connected, setConnected] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [matchCode, setMatchCode] = useState("SHD-4K7J");
  const [opponentJoined, setOpponentJoined] = useState(false);
  const [selectedAction, setSelectedAction] = useState<Action | null>(null);
  const [processing, setProcessing] = useState<ProcessingState>("idle");
  const [round, setRound] = useState(1);
  const [yourScore, setYourScore] = useState(2);
  const [opponentScore, setOpponentScore] = useState(1);
  const [result, setResult] = useState<RoundResult | null>(null);
  const [toastMessage, setToastMessage] = useState("");
  const timers = useRef<number[]>([]);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => setToastMessage(""), 3400);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  useEffect(() => {
    return () => timers.current.forEach((timer) => window.clearTimeout(timer));
  }, []);

  function clearRoundTimers() {
    timers.current.forEach((timer) => window.clearTimeout(timer));
    timers.current = [];
  }

  function handleCreateMatch() {
    setConnected(true);
    setMatchCode(makeMatchCode());
    setOpponentJoined(false);
    setJoinOpen(false);
    setView("waiting");
    setToastMessage("Vault created. Share the match code with your rival.");
  }

  function handleJoinMatch() {
    const normalized = joinCode.trim().toUpperCase();
    setConnected(true);
    setMatchCode(normalized || "SHD-4K7J");
    setOpponentJoined(true);
    setJoinOpen(false);
    setView("waiting");
    setToastMessage("You slipped in. Your rival is already watching the door.");
  }

  function handleSimulateOpponent() {
    setOpponentJoined(true);
    setToastMessage("Rival detected. Both seats are locked in.");
  }

  function handleEnterGame() {
    setView("game");
    setSelectedAction(null);
    setProcessing("idle");
    setResult(null);
  }

  function handleBackToLobby() {
    clearRoundTimers();
    setView("lobby");
    setJoinOpen(false);
    setJoinCode("");
    setOpponentJoined(false);
    setSelectedAction(null);
    setProcessing("idle");
    setResult(null);
  }

  function handleSubmitAction() {
    if (!selectedAction || processing !== "idle") return;

    const opponentAction = opponentSequence[(round - 1) % opponentSequence.length];
    const nextResult = calculateResult(selectedAction, opponentAction, round);
    clearRoundTimers();
    setProcessing("encrypting");

    timers.current = [
      window.setTimeout(() => setProcessing("submitting"), 650),
      window.setTimeout(() => setProcessing("waiting"), 1250),
      window.setTimeout(() => setProcessing("resolving"), 1900),
      window.setTimeout(() => setProcessing("decrypting"), 2550),
      window.setTimeout(() => {
        setProcessing("resolved");
        setResult(nextResult);
        setYourScore((score) => score + nextResult.pointsYou);
        setOpponentScore((score) => score + nextResult.pointsOpponent);
      }, 3250),
    ];
  }

  function handleNextRound() {
    clearRoundTimers();
    setRound((currentRound) => currentRound + 1);
    setSelectedAction(null);
    setProcessing("idle");
    setResult(null);
    setToastMessage("New round opened. The vault has already shifted.");
  }

  function handleRematch() {
    clearRoundTimers();
    setRound(1);
    setYourScore(0);
    setOpponentScore(0);
    setSelectedAction(null);
    setProcessing("idle");
    setResult(null);
    setView("waiting");
    setOpponentJoined(false);
    setToastMessage("Fresh vault, fresh tells. Waiting for a rival.");
  }

  return (
    <div className="app-shell">
      <div className="ambient-glow ambient-glow-left" />
      <div className="ambient-glow ambient-glow-right" />
      <div className="grain" aria-hidden="true" />
      <SiteHeader
        connected={connected}
        view={view}
        onConnect={() => setConnected((current) => !current)}
        onLogoClick={handleBackToLobby}
      />

      <main className="page-frame">
        {view === "lobby" && (
          <LobbyView
            connected={connected}
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
            onBack={handleBackToLobby}
            onSimulateOpponent={handleSimulateOpponent}
            onEnter={handleEnterGame}
          />
        )}
        {view === "game" && (
          <GameView
            round={round}
            yourScore={yourScore}
            opponentScore={opponentScore}
            selectedAction={selectedAction}
            processing={processing}
            result={result}
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
        <span>MOCKNET BUILD 0.1</span>
        <span className="footer-spacer" />
        <span className="footer-lock"><span className="status-dot" /> FHE READY · SIMULATED</span>
      </footer>

      {toastMessage && <Toast message={toastMessage} onDismiss={() => setToastMessage("")} />}
    </div>
  );
}

export default App;
