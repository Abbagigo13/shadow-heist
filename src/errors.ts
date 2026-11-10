export type RecoveryAction = {
  label: string;
  run: () => void;
};

export type WalletErrorCode =
  | "missing-project-id"
  | "rejected"
  | "request-pending"
  | "modal-closed"
  | "switch-rejected"
  | "switch-unsupported"
  | "wrong-network"
  | "init-failed";

/** An error whose message is already safe and clear to show a player. */
export class WalletError extends Error {
  code: WalletErrorCode;

  constructor(code: WalletErrorCode, message: string) {
    super(message);
    this.name = "WalletError";
    this.code = code;
  }
}

function errorText(error: unknown) {
  if (typeof error === "string") return error;
  if (!error || typeof error !== "object") return "";
  const candidate = error as { message?: unknown; code?: unknown; reason?: unknown };
  return [candidate.message, candidate.reason, candidate.code].filter(Boolean).join(" ");
}

export function friendlyError(error: unknown, fallback: string) {
  if (error instanceof WalletError) return error.message;

  const text = errorText(error);
  const normalized = text.toLowerCase();

  if (normalized.includes("4001") || normalized.includes("user rejected") || normalized.includes("user denied") || normalized.includes("action_rejected")) {
    return "Wallet approval was cancelled. Nothing was submitted.";
  }
  if (normalized.includes("sepolia") || normalized.includes("chain") || normalized.includes("network") || normalized.includes("wrong network")) {
    return "Wrong network. Switch your wallet to Sepolia and try again.";
  }
  if (normalized.includes("project_id") || normalized.includes("project id") || normalized.includes("walletconnect needs")) {
    return "WalletConnect is not configured for this build. Use a browser wallet or add the WalletConnect project ID.";
  }
  if (normalized.includes("insufficient funds") || normalized.includes("fee data") || normalized.includes("underpriced")) {
    return "This wallet cannot pay the Sepolia gas fee. Add Sepolia ETH, then retry.";
  }
  if (normalized.includes("match is closed") || normalized.includes("round is closed")) {
    return "This vault is closed. The match already ended or was cancelled.";
  }
  if (normalized.includes("timeout not reached")) {
    return "The rival still has time to move. You can claim a forfeit after 30 minutes of silence.";
  }
  if (normalized.includes("match does not exist")) {
    return "That vault does not exist on Sepolia. Check the invite link or match ID.";
  }
  if (normalized.includes("match is full") || normalized.includes("cannot join twice")) {
    return "That vault is already full. Ask the host for a fresh invite.";
  }
  if (normalized.includes("already submitted") || normalized.includes("round already resolved")) {
    return "This move is already recorded on-chain. Refresh the vault before trying again.";
  }
  if (normalized.includes("timed out") || normalized.includes("timeout")) {
    return "Sepolia is taking too long to respond. Check the vault status and retry.";
  }
  if (normalized.includes("not mined") || normalized.includes("reverted") || normalized.includes("execution reverted")) {
    return "The transaction failed on Sepolia. Check the wallet message and retry if the vault is still open.";
  }

  return text && text.length < 180 ? text : fallback;
}
