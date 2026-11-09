import type { DeployFunction } from "hardhat-deploy/types";

const deployShadowHeist: DeployFunction = async function (hre) {
  const { deploy } = hre.deployments;
  const { deployer } = await hre.getNamedAccounts();

  await deploy("ShadowHeist", {
    from: deployer,
    log: true,
    args: [],
  });
};

export default deployShadowHeist;
deployShadowHeist.tags = ["ShadowHeist"];
