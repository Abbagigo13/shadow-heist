import { BrowserProvider, Contract, type Eip1193Provider, type JsonRpcSigner } from "ethers";
import type { EIP1193Provider as ViemEip1193Provider } from "viem";
import { WalletError } from "./errors";

export const SEPOLIA_CHAIN_ID = 11155111;
/** Mirrors ShadowHeistV2.ACTION_TIMEOUT (30 minutes). */
export const ACTION_TIMEOUT_SECONDS = 30 * 60;
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
  "function cancelMatch(uint256 matchId)",
  "function abandonStaleMatch(uint256 matchId)",
  "function forfeitWinner(uint256 matchId) view returns (address)",
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
  "event MatchCancelled(uint256 indexed matchId)",
  "event MatchTimedOut(uint256 indexed matchId, uint8 indexed round, address indexed winner)",
] as const;

export type WalletSession = {
  provider: BrowserProvider;
  signer: JsonRpcSigner;
  address: string;
  chainId: number;
  eip1193Provider: ViemEip1193Provider;
  walletConnectProvider: WalletConnectProvider;
};

export type WalletConnectProvider = Eip1193Provider & {
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  session?: unknown;
  on: (event: string, listener: (...args: unknown[]) => void) => void;
  removeListener: (event: string, listener: (...args: unknown[]) => void) => void;
};

const SEPOLIA_CHAIN_HEX = `0x${SEPOLIA_CHAIN_ID.toString(16)}`;
const SEPOLIA_RPC_URL = "https://ethereum-sepolia-rpc.publicnode.com";

const SEPOLIA_PARAMS = {
  chainId: SEPOLIA_CHAIN_HEX,
  chainName: "Sepolia",
  nativeCurrency: { name: "Sepolia Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: [SEPOLIA_RPC_URL],
  blockExplorerUrls: ["https://sepolia.etherscan.io"],
};

let walletConnectProvider: WalletConnectProvider | null = null;

function errorCode(error: unknown): number | undefined {
  if (!error || typeof error !== "object") return undefined;
  const { code, error: inner } = error as { code?: unknown; error?: unknown };
  if (typeof code === "number") return code;
  return inner ? errorCode(inner) : undefined;
}

function errorMessage(error: unknown): string {
  if (typeof error === "string") return error.toLowerCase();
  if (!error || typeof error !== "object") return "";
  const { message } = error as { message?: unknown };
  return typeof message === "string" ? message.toLowerCase() : "";
}

function isRejected(error: unknown) {
  const message = errorMessage(error);
  return errorCode(error) === 4001 || /user (rejected|denied|cancel)|rejected the request|request rejected/.test(message);
}

/** Turns anything a wallet or WalletConnect throws into a clear message for the player. */
function toWalletError(error: unknown): Error {
  if (error instanceof WalletError) return error;
  const message = errorMessage(error);

  if (errorCode(error) === -32002 || /already pending|already processing/.test(message)) {
    return new WalletError("request-pending", "Your wallet already has a request waiting. Open your wallet, approve or reject it, then try again.");
  }
  if (/closed modal|connection request reset|proposal expired|modal closed/.test(message)) {
    return new WalletError("modal-closed", "WalletConnect was closed before connecting. Press Connect wallet and scan the QR code again.");
  }
  if (isRejected(error)) {
    return new WalletError("rejected", "Wallet approval was cancelled. Nothing was submitted.");
  }
  return error instanceof Error ? error : new Error("Wallet connection failed.");
}

function ensureProjectId() {
  if (!WALLETCONNECT_PROJECT_ID) {
    throw new WalletError(
      "missing-project-id",
      "WalletConnect is not set up for this build. Add VITE_WALLETCONNECT_PROJECT_ID to the environment and redeploy.",
    );
  }
}

async function readChainId(provider: WalletConnectProvider) {
  return Number(await provider.request({ method: "eth_chainId" }));
}

async function waitForSepolia(provider: WalletConnectProvider, timeoutMs = 4000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if ((await readChainId(provider)) === SEPOLIA_CHAIN_ID) return true;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return (await readChainId(provider)) === SEPOLIA_CHAIN_ID;
}

/** Switches the wallet to Sepolia, adding the network first when the wallet does not know it. */
async function ensureSepolia(provider: WalletConnectProvider) {
  if ((await readChainId(provider)) === SEPOLIA_CHAIN_ID) return;

  try {
    await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: SEPOLIA_CHAIN_HEX }] });
  } catch (switchError) {
    if (errorCode(switchError) === -32002) throw toWalletError(switchError);
    if (isRejected(switchError)) {
      throw new WalletError("switch-rejected", "Switching to Sepolia was declined. Approve the network switch in your wallet to play.");
    }

    // 4902 = chain not added. Some wallets report it only through the message text.
    const unknownChain = errorCode(switchError) === 4902 || /unrecognized chain|not been added|unknown chain|chain not added|not supported/.test(errorMessage(switchError));
    if (!unknownChain) throw toWalletError(switchError);

    try {
      await provider.request({ method: "wallet_addEthereumChain", params: [SEPOLIA_PARAMS] });
    } catch (addError) {
      if (errorCode(addError) === -32002) throw toWalletError(addError);
      if (isRejected(addError)) {
        throw new WalletError("switch-rejected", "Adding Sepolia was declined. Approve it in your wallet to play.");
      }
      throw new WalletError(
        "switch-unsupported",
        "Your wallet could not add Sepolia. Add it manually (chain ID 11155111), then reconnect.",
      );
    }
  }

  if (!(await waitForSepolia(provider))) {
    throw new WalletError("wrong-network", "Your wallet is still on another network. Switch to Sepolia in your wallet, then reconnect.");
  }
}

async function createWalletSession(connector: WalletConnectProvider): Promise<WalletSession> {
  await ensureSepolia(connector);

  // Build the ethers provider only after the switch so it never sees a stale network.
  const provider = new BrowserProvider(connector);
  const signer = await provider.getSigner();
  return {
    provider,
    signer,
    address: await signer.getAddress(),
    chainId: SEPOLIA_CHAIN_ID,
    eip1193Provider: connector as unknown as ViemEip1193Provider,
    walletConnectProvider: connector,
  };
}

async function getWalletConnectProvider(): Promise<WalletConnectProvider> {
  ensureProjectId();
  if (walletConnectProvider) return walletConnectProvider;

  try {
    const { EthereumProvider } = await import("@walletconnect/ethereum-provider");
    walletConnectProvider = (await EthereumProvider.init({
      projectId: WALLETCONNECT_PROJECT_ID,
      optionalChains: [SEPOLIA_CHAIN_ID],
      optionalMethods: ["wallet_switchEthereumChain", "wallet_addEthereumChain"],
      rpcMap: { [SEPOLIA_CHAIN_ID]: SEPOLIA_RPC_URL },
      showQrModal: true,
      metadata: {
        name: "Shadow Heist",
        description: "Confidential two-player strategy on Zama FHEVM",
        url: window.location.origin,
        icons: [`${window.location.origin}/shadow-heist-logo.svg`],
      },
    })) as unknown as WalletConnectProvider;
    return walletConnectProvider;
  } catch (error) {
    walletConnectProvider = null;
    throw new WalletError("init-failed", `WalletConnect could not start: ${error instanceof Error ? error.message : "unknown error"}. Refresh and try again.`);
  }
}

/** Opens the WalletConnect QR modal, then makes sure the wallet is on Sepolia. */
export async function connectWalletConnect(): Promise<WalletSession> {
  const connector = await getWalletConnectProvider();
  try {
    if (!connector.session) await connector.connect();
    return await createWalletSession(connector);
  } catch (error) {
    throw toWalletError(error);
  }
}

/** Re-opens a saved WalletConnect session after a page refresh. Returns null when there is none. */
export async function restoreWalletSession(): Promise<WalletSession | null> {
  if (!WALLETCONNECT_PROJECT_ID) return null;
  try {
    const connector = await getWalletConnectProvider();
    if (!connector.session) return null;
    return await createWalletSession(connector);
  } catch {
    return null;
  }
}

/** Calls `onLost` when the wallet disconnects or leaves Sepolia, and `onAccountChange` when the account changes. */
export function watchWallet(
  session: WalletSession,
  handlers: { onLost: (reason: "disconnected" | "wrong-network") => void; onAccountChange: () => void },
) {
  const connector = session.walletConnectProvider;
  const onDisconnect = () => handlers.onLost("disconnected");
  const onChain = (chainId: unknown) => {
    if (Number(chainId) !== SEPOLIA_CHAIN_ID) handlers.onLost("wrong-network");
  };
  const onAccounts = (accounts: unknown) => {
    if (Array.isArray(accounts) && accounts.length === 0) handlers.onLost("disconnected");
    else handlers.onAccountChange();
  };

  connector.on("disconnect", onDisconnect);
  connector.on("chainChanged", onChain);
  connector.on("accountsChanged", onAccounts);
  return () => {
    connector.removeListener("disconnect", onDisconnect);
    connector.removeListener("chainChanged", onChain);
    connector.removeListener("accountsChanged", onAccounts);
  };
}

export async function disconnectWallet(session: WalletSession) {
  if (session.walletConnectProvider.session) {
    await session.walletConnectProvider.disconnect();
  }
}

/** Rebuilds the session for the account the wallet is now using. */
export async function refreshWalletSession(session: WalletSession): Promise<WalletSession> {
  return createWalletSession(session.walletConnectProvider);
}

export function getShadowHeistContract(signerOrProvider: JsonRpcSigner | BrowserProvider) {
  if (!SHADOW_HEIST_ADDRESS) {
    throw new Error("VITE_SHADOW_HEIST_ADDRESS is not configured yet.");
  }
  return new Contract(SHADOW_HEIST_ADDRESS, shadowHeistAbi, signerOrProvider);
}
