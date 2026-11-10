import { BrowserProvider, Contract, type Eip1193Provider, type JsonRpcSigner } from "ethers";
import type { EIP1193Provider as ViemEip1193Provider } from "viem";

export const SEPOLIA_CHAIN_ID = 11155111;
export const SHADOW_HEIST_ADDRESS = (import.meta.env.VITE_SHADOW_HEIST_ADDRESS ?? "") as string;
export const WALLETCONNECT_PROJECT_ID = (import.meta.env.VITE_WALLETCONNECT_PROJECT_ID ?? "") as string;

export const shadowHeistAbi = [
  "function createMatch(uint8 mode, uint8 maxRounds, uint256 challengeId) returns (uint256 matchId)",
  "function joinMatch(uint256 matchId)",
  "function submitAction(uint256 matchId, bytes encryptedAction, bytes inputProof)",
  "function resolveRound(uint256 matchId)",
  "function startNextRound(uint256 matchId)",
  "function rematch(uint256 previousMatchId) returns (uint256 matchId)",
  "function forfeitTimeout(uint256 matchId)",
  "function registerProfile()",
  "function getMatch(uint256 matchId) view returns (address playerOne, address playerTwo, uint8 mode, uint8 maxRounds, uint8 round, uint256 challengeId, uint64 createdAt, uint64 lastActionAt, bool playerOneSubmitted, bool playerTwoSubmitted, bool roundResolved, bool finished, bool cancelled)",
  "function getEncryptedRoundResult(uint256 matchId, uint8 round) view returns (bytes32 actionOne, bytes32 actionTwo, bytes32 outcome, bytes32 pointsOne, bytes32 pointsTwo, bytes32 eventCode, bool resolved)",
  "function getEncryptedScore(uint256 matchId) view returns (bytes32 scoreOne, bytes32 scoreTwo)",
  "event MatchCreated(uint256 indexed matchId, address indexed playerOne, uint8 mode, uint8 maxRounds, uint256 challengeId)",
  "event PlayerJoined(uint256 indexed matchId, address indexed playerTwo)",
  "event ActionSubmitted(uint256 indexed matchId, uint8 indexed round, address indexed player)",
  "event RoundReady(uint256 indexed matchId, uint8 indexed round)",
  "event RoundResolved(uint256 indexed matchId, uint8 indexed round, uint8 eventCount)",
  "event NextRoundStarted(uint256 indexed matchId, uint8 indexed round)",
  "event MatchFinished(uint256 indexed matchId, uint8 indexed roundsPlayed)",
  "event RematchCreated(uint256 indexed previousMatchId, uint256 indexed matchId)",
] as const;

export type WalletSource = "injected" | "walletconnect";

export type WalletSession = {
  provider: BrowserProvider;
  signer: JsonRpcSigner;
  address: string;
  chainId: number;
  source: WalletSource;
  eip1193Provider: ViemEip1193Provider;
  walletConnectProvider?: WalletConnectProvider;
};

type WalletConnectProvider = Eip1193Provider & {
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  session?: unknown;
};

let walletConnectProvider: WalletConnectProvider | null = null;

function getEthereum(): Eip1193Provider {
  if (!window.ethereum) {
    throw new Error("No injected wallet found. Choose WalletConnect to use a mobile wallet.");
  }
  return window.ethereum;
}

function ensureProjectId() {
  if (!WALLETCONNECT_PROJECT_ID) {
    throw new Error("WalletConnect needs VITE_WALLETCONNECT_PROJECT_ID in the project environment.");
  }
}

async function createWalletSession(
  eip1193Provider: Eip1193Provider,
  source: WalletSource,
  connector?: WalletConnectProvider,
): Promise<WalletSession> {
  const provider = new BrowserProvider(eip1193Provider);
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
    source,
    eip1193Provider: eip1193Provider as unknown as ViemEip1193Provider,
    walletConnectProvider: connector,
  };
}

export async function connectSepoliaWallet(): Promise<WalletSession> {
  const ethereum = getEthereum();
  await ethereum.request({ method: "eth_requestAccounts" });
  return createWalletSession(ethereum, "injected");
}

export async function connectWalletConnect(): Promise<WalletSession> {
  ensureProjectId();

  const { EthereumProvider } = await import("@walletconnect/ethereum-provider");

  walletConnectProvider ??= await EthereumProvider.init({
    projectId: WALLETCONNECT_PROJECT_ID,
    optionalChains: [SEPOLIA_CHAIN_ID],
    showQrModal: true,
    metadata: {
      name: "Shadow Heist",
      description: "Confidential two-player strategy on Zama FHEVM",
      url: window.location.origin,
      icons: [`${window.location.origin}/shadow-heist-logo.svg`],
    },
  });

  if (!walletConnectProvider.session) {
    await walletConnectProvider.connect();
  }

  return createWalletSession(walletConnectProvider, "walletconnect", walletConnectProvider);
}

export async function disconnectWallet(session: WalletSession) {
  if (session.source === "walletconnect" && session.walletConnectProvider?.session) {
    await session.walletConnectProvider.disconnect();
  }
}

export function getShadowHeistContract(signerOrProvider: JsonRpcSigner | BrowserProvider) {
  if (!SHADOW_HEIST_ADDRESS) {
    throw new Error("VITE_SHADOW_HEIST_ADDRESS is not configured yet.");
  }
  return new Contract(SHADOW_HEIST_ADDRESS, shadowHeistAbi, signerOrProvider);
}
