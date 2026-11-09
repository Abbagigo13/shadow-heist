import { BrowserProvider, Contract, type JsonRpcSigner } from "ethers";

export const SEPOLIA_CHAIN_ID = 11155111;
export const SHADOW_HEIST_ADDRESS = (import.meta.env.VITE_SHADOW_HEIST_ADDRESS ?? "") as string;

export const shadowHeistAbi = [
  "function createMatch() returns (uint256 matchId)",
  "function joinMatch(uint256 matchId)",
  "function submitAction(uint256 matchId, bytes encryptedAction, bytes inputProof)",
  "function resolveRound(uint256 matchId)",
  "function getMatch(uint256 matchId) view returns (address playerOne, address playerTwo, uint8 round, uint8 scoreOne, uint8 scoreTwo, bool playerOneSubmitted, bool playerTwoSubmitted, bool roundResolved)",
  "function getEncryptedResult(uint256 matchId) view returns (bytes32 actionOne, bytes32 actionTwo, bytes32 outcome, bytes32 pointsOne, bytes32 pointsTwo, bytes32 eventCode)",
  "event MatchCreated(uint256 indexed matchId, address indexed playerOne)",
  "event PlayerJoined(uint256 indexed matchId, address indexed playerTwo)",
  "event ActionSubmitted(uint256 indexed matchId, address indexed player)",
  "event RoundReady(uint256 indexed matchId)",
] as const;

export type WalletSession = {
  provider: BrowserProvider;
  signer: JsonRpcSigner;
  address: string;
  chainId: number;
};

function getEthereum() {
  if (!window.ethereum) {
    throw new Error("No injected wallet found. Install MetaMask or another EIP-1193 wallet.");
  }
  return window.ethereum;
}

export async function connectSepoliaWallet(): Promise<WalletSession> {
  const provider = new BrowserProvider(getEthereum());
  await provider.send("eth_requestAccounts", []);
  const network = await provider.getNetwork();
  const chainId = Number(network.chainId);

  if (chainId !== SEPOLIA_CHAIN_ID) {
    throw new Error("Shadow Heist is currently configured for Sepolia. Switch networks in your wallet.");
  }

  const signer = await provider.getSigner();
  return {
    provider,
    signer,
    address: await signer.getAddress(),
    chainId,
  };
}

export function getShadowHeistContract(signerOrProvider: JsonRpcSigner | BrowserProvider) {
  if (!SHADOW_HEIST_ADDRESS) {
    throw new Error("VITE_SHADOW_HEIST_ADDRESS is not configured yet.");
  }
  return new Contract(SHADOW_HEIST_ADDRESS, shadowHeistAbi, signerOrProvider);
}
