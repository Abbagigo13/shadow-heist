import type { DeployFunction } from "hardhat-deploy/types";

const deployShadowHeistV2: DeployFunction = async function (hre) {
  const { deploy } = hre.deployments;
  const { deployer } = await hre.getNamedAccounts();

  await deploy("ShadowHeistV2", {
    from: deployer,
    log: true,
    args: [],
  });
};

export default deployShadowHeistV2;
deployShadowHeistV2.tags = ["ShadowHeistV2"];
