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
): RoundResult {
  const playerWins =
    (playerAction === "steal" && opponentAction === "scout") ||
    (playerAction === "guard" && opponentAction === "steal") ||
    (playerAction === "scout" && opponentAction === "guard");
  const isDraw = playerAction === opponentAction;
  const winner: Outcome = isDraw ? "draw" : playerWins ? "you" : "opponent";
  const eventTitle = round % 2 === 0 ? "Dead drop bonus" : "Silent alarm";
  const eventDescription =
    round % 2 === 0
      ? "A hidden courier left an extra cache in the west wing."
      : "The building went dark. Only the cleanest move gets paid.";

  return {
    playerAction,
    opponentAction,
    winner,
    pointsYou: winner === "you" ? (round % 2 === 0 ? 2 : 1) : 0,
    pointsOpponent: winner === "opponent" ? 1 : 0,
    eventTitle,
    eventDescription,
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
