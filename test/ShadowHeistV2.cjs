const { expect } = require("chai");
const hre = require("hardhat");

describe("ShadowHeistV2", function () {
  async function deploy() {
    const ShadowHeistV2 = await hre.ethers.getContractFactory("ShadowHeistV2");
    const game = await ShadowHeistV2.deploy();
    await game.waitForDeployment();
    return game;
  }

  it("creates a best-of-three match and exposes its lifecycle metadata", async function () {
    const [host, challenger] = await hre.ethers.getSigners();
    const game = await deploy();

    await expect(game.createMatch(2, 3, 0))
      .to.emit(game, "MatchCreated")
      .withArgs(0n, host.address, 2, 3, 0n);
    await expect(game.connect(challenger).joinMatch(0n))
      .to.emit(game, "PlayerJoined")
      .withArgs(0n, challenger.address);

    const state = await game.getMatch(0n);
    expect(state.playerOne).to.equal(host.address);
    expect(state.playerTwo).to.equal(challenger.address);
    expect(state.mode).to.equal(2n);
    expect(state.maxRounds).to.equal(3n);
    expect(state.round).to.equal(1n);
    expect(state.finished).to.equal(false);
  });

  it("registers public player-directory entries and daily challenge configuration", async function () {
    const [admin, player] = await hre.ethers.getSigners();
    const game = await deploy();

    await expect(game.connect(player).registerProfile()).to.emit(game, "ProfileRegistered").withArgs(player.address);
    expect(await game.getPlayerCount()).to.equal(1n);
    expect(await game.playerAt(0)).to.equal(player.address);

    await expect(game.setDailyChallenge(20261110n, 3, true))
      .to.emit(game, "DailyChallengeUpdated")
      .withArgs(20261110n, 3, true);
    const challenge = await game.getDailyChallenge(20261110n);
    expect(challenge.eventCode).to.equal(3n);
    expect(challenge.active).to.equal(true);
    expect(await game.admin()).to.equal(admin.address);
  });

  it("guards rematches until the previous match is finished", async function () {
    const [, challenger] = await hre.ethers.getSigners();
    const game = await deploy();

    await game.createMatch(1, 1, 0);
    await game.connect(challenger).joinMatch(0n);
    await expect(game.rematch(0n)).to.be.revertedWith("match not finished");
  });
});
