import { Contract } from "ethers";
import type { Address } from "viem";
import { getShadowHeistContract, SHADOW_HEIST_ADDRESS, type WalletSession } from "./chain";
import { getZamaSdk } from "./fhevm";
import { WalletError } from "./errors";

/** cUSDT uses 6 decimals. Stakes are picked in whole tokens and sent as base units. */
export const STAKE_DECIMALS = 6;
export const STAKE_CHOICES = [0, 1, 5, 10] as const;
export type StakeChoice = (typeof STAKE_CHOICES)[number];

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const OPERATOR_LIFETIME_SECONDS = 30 * 24 * 60 * 60;

const mintableAbi = ["function mint(address to, uint256 amount)"] as const;

export function toBaseUnits(wholeTokens: number): bigint {
  return BigInt(wholeTokens) * 10n ** BigInt(STAKE_DECIMALS);
}

export function formatStake(baseUnits: bigint): string {
  if (baseUnits === 0n) return "Free";
  const whole = baseUnits / 10n ** BigInt(STAKE_DECIMALS);
  const fraction = baseUnits % 10n ** BigInt(STAKE_DECIMALS);
  const text = fraction === 0n ? whole.toString() : `${whole}.${fraction.toString().padStart(STAKE_DECIMALS, "0").replace(/0+$/, "")}`;
  return `${text} cUSDT`;
}

/** The confidential token the deployed contract takes stakes in, or null when stakes are off. */
export async function readStakeToken(wallet: WalletSession): Promise<Address | null> {
  if (!SHADOW_HEIST_ADDRESS) return null;
  const contract = getShadowHeistContract(wallet.provider);
  const token = (await contract.stakeToken()) as string;
  return token === ZERO_ADDRESS ? null : (token as Address);
}

async function wrappedToken(wallet: WalletSession, token: Address) {
  const sdk = await getZamaSdk(wallet.eip1193Provider);
  return sdk.createWrappedToken(token);
}

/**
 * Mints public test tokens and shields them into confidential tokens. The test underlying token has
 * a public mint, so this works for any wallet on the Sepolia mock wrapper.
 */
export async function getTestTokens(wallet: WalletSession, token: Address, wholeTokens: number) {
  const wrapped = await wrappedToken(wallet, token);
  const underlying = (await wrapped.underlying()) as string;
  const amount = toBaseUnits(wholeTokens);

  const mintable = new Contract(underlying, mintableAbi, wallet.signer);
  const mintTx = await mintable.mint(wallet.address, amount);
  await mintTx.wait();
  await wrapped.shield(amount);
}

/**
 * Makes sure this wallet can fund `stake`: the contract is an approved operator on the token and
 * the confidential balance covers it. Stakes that cannot be funded move nothing, so this check keeps
 * a player from believing they are staked when they are not.
 */
export async function ensureStakeReady(wallet: WalletSession, token: Address, stake: bigint) {
  if (!SHADOW_HEIST_ADDRESS) throw new Error("VITE_SHADOW_HEIST_ADDRESS is not configured yet.");
  const wrapped = await wrappedToken(wallet, token);
  const game = SHADOW_HEIST_ADDRESS as Address;

  if (!(await wrapped.isOperator(wallet.address as Address, game))) {
    await wrapped.setOperator(game, Math.floor(Date.now() / 1000) + OPERATOR_LIFETIME_SECONDS);
  }

  const balance = await wrapped.balanceOf(wallet.address as Address);
  if (balance < stake) {
    throw new WalletError(
      "rejected",
      `You need ${formatStake(stake)} in confidential balance to play this vault. Use "Get test cUSDT" first.`,
    );
  }
}

export async function readConfidentialBalance(wallet: WalletSession, token: Address) {
  const wrapped = await wrappedToken(wallet, token);
  return wrapped.balanceOf(wallet.address as Address);
}
