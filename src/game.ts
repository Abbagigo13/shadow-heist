export type Action = "steal" | "guard" | "scout";

export type MatchView = "lobby" | "waiting" | "game";
export type ProcessingState =
  | "idle"
  | "encrypting"
  | "submitting"
  | "waiting"
  | "resolving"
  | "decrypting"
  | "resolved";

export type Outcome = "you" | "opponent" | "draw";

export type RoundResult = {
  playerAction: Action;
  opponentAction: Action;
  winner: Outcome;
  pointsYou: number;
  pointsOpponent: number;
  eventTitle: string;
  eventDescription: string;
};

export type HeistEvent = {
  code: number;
  title: string;
  description: string;
  winnerPoints: number;
  scoutBonus: number;
};

export const heistEvents: HeistEvent[] = [
  {
    code: 0,
    title: "Silent alarm",
    description: "The building went dark. Only the cleanest move gets paid.",
    winnerPoints: 1,
    scoutBonus: 0,
  },
  {
    code: 1,
    title: "Dead drop bonus",
    description: "A hidden courier left an extra cache in the west wing.",
    winnerPoints: 2,
    scoutBonus: 0,
  },
  {
    code: 2,
    title: "Blackout protocol",
    description: "The cameras blinked out. The winner gets paid before the grid returns.",
    winnerPoints: 2,
    scoutBonus: 0,
  },
  {
    code: 3,
    title: "Inside contact",
    description: "A trusted voice opened a side door. Scout gets an extra point this round.",
    winnerPoints: 1,
    scoutBonus: 1,
  },
];

export function getHeistEvent(code: number): HeistEvent {
  return heistEvents.find((event) => event.code === code) ?? heistEvents[0];
}

export const actionMeta: Record<
  Action,
  { label: string; eyebrow: string; description: string; detail: string; glyph: string }
> = {
  steal: {
    label: "Steal",
    eyebrow: "High risk",
    description: "Take the vault before the alarms wake up.",
    detail: "+2 against Scout · punished by Guard",
    glyph: "arrow",
  },
  guard: {
    label: "Guard",
    eyebrow: "Counter play",
    description: "Lock down your stash and catch a thief.",
    detail: "+1 against Steal · loses to Scout",
    glyph: "shield",
  },
  scout: {
    label: "Scout",
    eyebrow: "Quiet edge",
    description: "Read the room and slip past a guard.",
    detail: "+1 against Guard · loses to Steal",
    glyph: "eye",
  },
};

export const opponentSequence: Action[] = ["guard", "scout", "steal", "guard", "scout"];

export function calculateResult(
  playerAction: Action,
  opponentAction: Action,
  round: number,
  eventCode = (round - 1) % heistEvents.length,
): RoundResult {
  const playerWins =
    (playerAction === "steal" && opponentAction === "scout") ||
    (playerAction === "guard" && opponentAction === "steal") ||
    (playerAction === "scout" && opponentAction === "guard");
  const isDraw = playerAction === opponentAction;
  const winner: Outcome = isDraw ? "draw" : playerWins ? "you" : "opponent";
  const event = getHeistEvent(eventCode);
  const winningAction = winner === "you" ? playerAction : opponentAction;
  const winnerPoints = event.winnerPoints + (winningAction === "scout" ? event.scoutBonus : 0);

  return {
    playerAction,
    opponentAction,
    winner,
    pointsYou: winner === "you" ? winnerPoints : 0,
    pointsOpponent: winner === "opponent" ? winnerPoints : 0,
    eventTitle: event.title,
    eventDescription: event.description,
  };
}

export function processingLabel(state: ProcessingState): string {
  switch (state) {
    case "encrypting":
      return "Encrypting your move";
    case "submitting":
      return "Submitting sealed choice";
    case "waiting":
      return "Waiting on the rival";
    case "resolving":
      return "Resolving the vault";
    case "decrypting":
      return "Decrypting the result";
    case "resolved":
      return "Round complete";
    default:
      return "Ready when you are";
  }
}
