import type { ContractTransactionReceipt } from "ethers";
import { encryptAction, publiclyDecrypt } from "./fhevm";
import {
  ACTION_TIMEOUT_SECONDS,
  getShadowHeistContract,
  SHADOW_HEIST_ADDRESS,
  type WalletSession,
} from "./chain";
import type { Action, ProcessingState } from "./game";

export type LiveMatchState = {
  playerOne: string;
  playerTwo: string;
  mode: number;
  maxRounds: number;
  round: number;
  scoreOne: number;
  scoreTwo: number;
  playerOneSubmitted: boolean;
  playerTwoSubmitted: boolean;
  roundResolved: boolean;
  finished: boolean;
  cancelled: boolean;
  lastActionAt: number;
  /** Set when the match ended by timeout. The forfeit winner wins regardless of score. */
  forfeitWinner: string | null;
};

export type LiveRoundResult = {
  playerAction: number;
  opponentAction: number;
  outcome: number;
  pointsYou: number;
  pointsOpponent: number;
  eventCode: number;
};

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

function requireAddress() {
  if (!SHADOW_HEIST_ADDRESS) {
    throw new Error("VITE_SHADOW_HEIST_ADDRESS is not configured yet.");
  }
  return SHADOW_HEIST_ADDRESS;
}

function transactionHash(receipt: ContractTransactionReceipt | null) {
  if (!receipt) throw new Error("The transaction was not mined.");
  return receipt.hash;
}

function findEvent(contract: ReturnType<typeof getShadowHeistContract>, receipt: ContractTransactionReceipt, name: string) {
  return receipt.logs
    .map((log: { topics: readonly string[]; data: string }) => {
      try {
        return contract.interface.parseLog({ topics: [...log.topics], data: log.data });
      } catch {
        return null;
      }
    })
    .find((parsed: ReturnType<typeof contract.interface.parseLog> | null) => parsed?.name === name);
}

export async function createLiveMatch(wallet: WalletSession, mode = 2, maxRounds = 3, challengeId = 0n) {
  const contract = getShadowHeistContract(wallet.signer);
  const transaction = await contract.createMatch(mode, maxRounds, challengeId);
  const receipt = await transaction.wait();
  if (!receipt) throw new Error("Match creation was not confirmed.");

  const event = findEvent(contract, receipt, "MatchCreated");
  if (!event) throw new Error("MatchCreated was not found in the transaction receipt.");
  return {
    matchId: event.args[0] as bigint,
    txHash: transactionHash(receipt),
  };
}

export async function joinLiveMatch(wallet: WalletSession, matchId: bigint) {
  const contract = getShadowHeistContract(wallet.signer);
  const transaction = await contract.joinMatch(matchId);
  const receipt = await transaction.wait();
  return { txHash: transactionHash(receipt) };
}

export async function submitLiveAction(
  wallet: WalletSession,
  matchId: bigint,
  action: Action,
  onProgress?: (state: ProcessingState) => void,
) {
  const contractAddress = requireAddress();
  onProgress?.("encrypting");
  const encrypted = await encryptAction(contractAddress, wallet.address, action, wallet.eip1193Provider);
  onProgress?.("submitting");
  const contract = getShadowHeistContract(wallet.signer);
  const transaction = await contract.submitAction(
    matchId,
    encrypted.encryptedValues[0],
    encrypted.inputProof,
  );
  const receipt = await transaction.wait();
  onProgress?.("waiting");
  return { txHash: transactionHash(receipt) };
}

export async function resolveLiveRound(wallet: WalletSession, matchId: bigint) {
  const contract = getShadowHeistContract(wallet.signer);
  const transaction = await contract.resolveRound(matchId);
  const receipt = await transaction.wait();
  return { txHash: transactionHash(receipt) };
}

export async function startNextLiveRound(wallet: WalletSession, matchId: bigint) {
  const contract = getShadowHeistContract(wallet.signer);
  const transaction = await contract.startNextRound(matchId);
  const receipt = await transaction.wait();
  return { txHash: transactionHash(receipt) };
}

export async function rematchLiveMatch(wallet: WalletSession, matchId: bigint) {
  const contract = getShadowHeistContract(wallet.signer);
  const transaction = await contract.rematch(matchId);
  const receipt = await transaction.wait();
  if (!receipt) throw new Error("Rematch was not confirmed.");
  const event = findEvent(contract, receipt, "RematchCreated");
  if (!event) throw new Error("RematchCreated was not found in the transaction receipt.");
  return { matchId: event.args[1] as bigint, txHash: transactionHash(receipt) };
}

export async function readLiveMatch(wallet: WalletSession, matchId: bigint): Promise<LiveMatchState> {
  const contract = getShadowHeistContract(wallet.provider);
  const state = await contract.getMatch(matchId);
  const forfeitWinner = state.finished ? (await contract.forfeitWinner(matchId)) as string : ZERO_ADDRESS;
  return {
    playerOne: state.playerOne,
    playerTwo: state.playerTwo,
    mode: Number(state.mode),
    maxRounds: Number(state.maxRounds),
    round: Number(state.round),
    scoreOne: 0,
    scoreTwo: 0,
    playerOneSubmitted: state.playerOneSubmitted,
    playerTwoSubmitted: state.playerTwoSubmitted,
    roundResolved: state.roundResolved,
    finished: state.finished,
    cancelled: state.cancelled,
    lastActionAt: Number(state.lastActionAt),
    forfeitWinner: forfeitWinner === ZERO_ADDRESS ? null : forfeitWinner,
  };
}

/** True when exactly one player moved and the other has been silent past the on-chain timeout. */
export function canClaimForfeit(state: LiveMatchState, nowSeconds = Math.floor(Date.now() / 1000)) {
  return (
    !state.finished &&
    !state.cancelled &&
    !state.roundResolved &&
    state.playerOneSubmitted !== state.playerTwoSubmitted &&
    nowSeconds > state.lastActionAt + ACTION_TIMEOUT_SECONDS
  );
}

export async function claimLiveForfeit(wallet: WalletSession, matchId: bigint) {
  const contract = getShadowHeistContract(wallet.signer);
  const transaction = await contract.forfeitTimeout(matchId);
  const receipt = await transaction.wait();
  return { txHash: transactionHash(receipt) };
}

export async function cancelLiveMatch(wallet: WalletSession, matchId: bigint) {
  const contract = getShadowHeistContract(wallet.signer);
  const transaction = await contract.cancelMatch(matchId);
  const receipt = await transaction.wait();
  return { txHash: transactionHash(receipt) };
}

/** Reads the final encrypted score, which the contract makes publicly decryptable after each round. */
export async function decryptLiveScore(wallet: WalletSession, matchId: bigint) {
  const contract = getShadowHeistContract(wallet.provider);
  const score = await contract.getEncryptedScore(matchId);
  const handles = [score.scoreOne, score.scoreTwo] as string[];
  const decrypted = await publiclyDecrypt(handles, wallet.eip1193Provider);
  const clear = handles.map((handle) => Number(decrypted.clearValues[handle as `0x${string}`]));
  return { scoreOne: clear[0] ?? 0, scoreTwo: clear[1] ?? 0 };
}

export async function decryptLiveRound(wallet: WalletSession, matchId: bigint, round: number): Promise<LiveRoundResult> {
  const contractAddress = requireAddress();
  const contract = getShadowHeistContract(wallet.provider);
  const handles = await contract.getEncryptedRoundResult(matchId, round);
  if (!handles.resolved) throw new Error("This round has not been resolved yet.");

  const encryptedHandles = [
    handles.actionOne,
    handles.actionTwo,
    handles.outcome,
    handles.pointsOne,
    handles.pointsTwo,
    handles.eventCode,
  ] as string[];
  const decrypted = await publiclyDecrypt(encryptedHandles, wallet.eip1193Provider);
  const clear = encryptedHandles.map((handle) => Number(decrypted.clearValues[handle as `0x${string}`]));

  return {
    playerAction: clear[0] ?? 0,
    opponentAction: clear[1] ?? 0,
    outcome: clear[2] ?? 0,
    pointsYou: clear[3] ?? 0,
    pointsOpponent: clear[4] ?? 0,
    eventCode: clear[5] ?? 0,
  };
}

export async function waitForLiveMatchState(
  wallet: WalletSession,
  matchId: bigint,
  predicate: (state: LiveMatchState) => boolean,
  options: { timeoutMs?: number; intervalMs?: number } = {},
) {
  const timeoutMs = options.timeoutMs ?? 120_000;
  const intervalMs = options.intervalMs ?? 2_500;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const state = await readLiveMatch(wallet, matchId);
    if (predicate(state)) return state;
    await new Promise((resolve) => window.setTimeout(resolve, intervalMs));
  }

  throw new Error("Timed out while waiting for the other player on Sepolia.");
}
