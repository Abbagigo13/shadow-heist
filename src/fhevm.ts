import { ZamaSDK } from "@zama-fhe/sdk";
import { createConfig } from "@zama-fhe/sdk/ethers";
import { sepolia } from "@zama-fhe/sdk/chains";
import { web } from "@zama-fhe/sdk/web";
import type { EIP1193Provider } from "viem";
import type { Action } from "./game";

let sdkPromise: Promise<ZamaSDK> | undefined;
let sdkProvider: EIP1193Provider | undefined;

function actionValue(action: Action): bigint {
  if (action === "steal") return 1n;
  if (action === "guard") return 2n;
  return 3n;
}

export async function getZamaSdk(provider?: EIP1193Provider): Promise<ZamaSDK> {
  const ethereum = provider ?? window.ethereum;
  if (!ethereum) {
    throw new Error("A wallet is required to initialize FHEVM for Sepolia.");
  }

  const zamaEthereum = ethereum as unknown as EIP1193Provider;

  if (!sdkPromise || sdkProvider !== zamaEthereum) {
    sdkProvider = zamaEthereum;
    sdkPromise = Promise.resolve(
    new ZamaSDK(
      createConfig({
        chains: [sepolia],
        ethereum: zamaEthereum,
        relayers: { [sepolia.id]: web() },
      }),
    ),
    );
  }

  return sdkPromise;
}

export async function encryptAction(
  contractAddress: string,
  userAddress: string,
  action: Action,
  provider?: EIP1193Provider,
) {
  const sdk = await getZamaSdk(provider);
  return sdk.encrypt({
    values: [{ value: actionValue(action), type: "euint8" }],
    contractAddress: contractAddress as `0x${string}`,
    userAddress: userAddress as `0x${string}`,
  });
}

export async function publiclyDecrypt(handles: string[], provider?: EIP1193Provider) {
  const sdk = await getZamaSdk(provider);
  return sdk.decryption.decryptPublicValues(handles as `0x${string}`[]);
}
