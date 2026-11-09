const { expect } = require("chai");
const hre = require("hardhat");

describe("ShadowHeist", function () {
  it("creates a match and seats a second player", async function () {
    const [host, challenger] = await hre.ethers.getSigners();
    const ShadowHeist = await hre.ethers.getContractFactory("ShadowHeist");
    const game = await ShadowHeist.deploy();
    await game.waitForDeployment();

    await expect(game.createMatch())
      .to.emit(game, "MatchCreated")
      .withArgs(0n, host.address);

    await expect(game.connect(challenger).joinMatch(0n))
      .to.emit(game, "PlayerJoined")
      .withArgs(0n, challenger.address);

    const state = await game.getMatch(0n);
    expect(state.playerOne).to.equal(host.address);
    expect(state.playerTwo).to.equal(challenger.address);
    expect(state.round).to.equal(1n);
    expect(state.roundResolved).to.equal(false);
  });
});
