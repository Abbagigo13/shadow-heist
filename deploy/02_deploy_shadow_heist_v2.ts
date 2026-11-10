import type { DeployFunction } from "hardhat-deploy/types";

const deployShadowHeistV2: DeployFunction = async function (hre) {
  const { deploy } = hre.deployments;
  const { deployer } = await hre.getNamedAccounts();

  // Confidential USDT (Mock) on Sepolia from the Zama testnet registry. Override with STAKE_TOKEN,
  // or set STAKE_TOKEN=0x0000000000000000000000000000000000000000 to turn stakes off.
  const SEPOLIA_CUSDT_MOCK = "0x4E7B06D78965594eB5EF5414c357ca21E1554491";
  const stakeToken = process.env.STAKE_TOKEN ?? (hre.network.name === "sepolia" ? SEPOLIA_CUSDT_MOCK : "0x0000000000000000000000000000000000000000");

  await deploy("ShadowHeistV2", {
    from: deployer,
    log: true,
    args: [stakeToken],
  });
};

export default deployShadowHeistV2;
deployShadowHeistV2.tags = ["ShadowHeistV2"];
