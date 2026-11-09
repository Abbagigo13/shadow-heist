import type { ContractTransactionReceipt } from "ethers";
import { encryptAction, publiclyDecrypt } from "./fhevm";
import {
  getShadowHeistContract,
  SHADOW_HEIST_ADDRESS,
  type WalletSession,
} from "./chain";
import type { Action } from "./game";

export type LiveMatchState = {
  playerOne: string;
  playerTwo: string;
  round: number;
  scoreOne: number;
  scoreTwo: number;
  playerOneSubmitted: boolean;
  playerTwoSubmitted: boolean;
  roundResolved: boolean;
};

export type LiveRoundResult = {
  playerAction: number;
  opponentAction: number;
  outcome: number;
  pointsYou: number;
  pointsOpponent: number;
  eventCode: number;
};

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

export async function createLiveMatch(wallet: WalletSession) {
  const contract = getShadowHeistContract(wallet.signer);
  const transaction = await contract.createMatch();
  const receipt = await transaction.wait();
  if (!receipt) throw new Error("Match creation was not confirmed.");

  const event = receipt.logs
    .map((log: { topics: readonly string[]; data: string }) => {
      try {
        return contract.interface.parseLog({ topics: [...log.topics], data: log.data });
      } catch {
        return null;
      }
    })
    .find((parsed: ReturnType<typeof contract.interface.parseLog> | null) => parsed?.name === "MatchCreated");

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
) {
  const contractAddress = requireAddress();
  const encrypted = await encryptAction(contractAddress, wallet.address, action);
  const contract = getShadowHeistContract(wallet.signer);
  const transaction = await contract.submitAction(
    matchId,
    encrypted.encryptedValues[0],
    encrypted.inputProof,
  );
  const receipt = await transaction.wait();
  return { txHash: transactionHash(receipt) };
}

export async function resolveLiveRound(wallet: WalletSession, matchId: bigint) {
  const contract = getShadowHeistContract(wallet.signer);
  const transaction = await contract.resolveRound(matchId);
  const receipt = await transaction.wait();
  return { txHash: transactionHash(receipt) };
}

export async function readLiveMatch(wallet: WalletSession, matchId: bigint): Promise<LiveMatchState> {
  const contract = getShadowHeistContract(wallet.provider);
  const state = await contract.getMatch(matchId);
  return {
    playerOne: state.playerOne,
    playerTwo: state.playerTwo,
    round: Number(state.round),
    scoreOne: Number(state.scoreOne),
    scoreTwo: Number(state.scoreTwo),
    playerOneSubmitted: state.playerOneSubmitted,
    playerTwoSubmitted: state.playerTwoSubmitted,
    roundResolved: state.roundResolved,
  };
}

export async function decryptLiveRound(wallet: WalletSession, matchId: bigint): Promise<LiveRoundResult> {
  const contractAddress = requireAddress();
  const contract = getShadowHeistContract(wallet.provider);
  const handles = await contract.getEncryptedResult(matchId);
  const encryptedHandles = [
    handles.actionOne,
    handles.actionTwo,
    handles.outcome,
    handles.pointsOne,
    handles.pointsTwo,
    handles.eventCode,
  ] as string[];
  const decrypted = await publiclyDecrypt(encryptedHandles);
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
