import { ZamaSDK } from "@zama-fhe/sdk";
import { createConfig } from "@zama-fhe/sdk/ethers";
import { sepolia } from "@zama-fhe/sdk/chains";
import { web } from "@zama-fhe/sdk/web";
import type { Action } from "./game";

let sdkPromise: Promise<ZamaSDK> | undefined;

function actionValue(action: Action): bigint {
  if (action === "steal") return 1n;
  if (action === "guard") return 2n;
  return 3n;
}

export async function getZamaSdk(): Promise<ZamaSDK> {
  const ethereum = window.ethereum;
  if (!ethereum) {
    throw new Error("A wallet is required to initialize FHEVM for Sepolia.");
  }

  sdkPromise ??= Promise.resolve(
    new ZamaSDK(
      createConfig({
        chains: [sepolia],
        ethereum,
        relayers: { [sepolia.id]: web() },
      }),
    ),
  );

  return sdkPromise;
}

export async function encryptAction(
  contractAddress: string,
  userAddress: string,
  action: Action,
) {
  const sdk = await getZamaSdk();
  return sdk.encrypt({
    values: [{ value: actionValue(action), type: "euint8" }],
    contractAddress: contractAddress as `0x${string}`,
    userAddress: userAddress as `0x${string}`,
  });
}

export async function publiclyDecrypt(handles: string[]) {
  const sdk = await getZamaSdk();
  return sdk.decryption.decryptPublicValues(handles as `0x${string}`[]);
}
