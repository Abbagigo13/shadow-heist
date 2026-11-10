const { expect } = require("chai");
const hre = require("hardhat");
const { FhevmType } = require("@fhevm/hardhat-plugin");

const STEAL = 1;
const GUARD = 2;
const SCOUT = 3;
const TIMEOUT = 30 * 60;

describe("ShadowHeistV2", function () {
  async function deploy() {
    const Token = await hre.ethers.getContractFactory("MockConfidentialToken");
    const token = await Token.deploy();
    await token.waitForDeployment();
    const ShadowHeistV2 = await hre.ethers.getContractFactory("ShadowHeistV2");
    const game = await ShadowHeistV2.deploy(await token.getAddress());
    await game.waitForDeployment();
    game.mockToken = token;
    return game;
  }

  async function fund(game, player, amount) {
    const token = game.mockToken;
    await token.mint(player.address, amount);
    await token.connect(player).setOperator(await game.getAddress(), 2n ** 40n);
  }

  async function balanceOf(game, player) {
    const token = game.mockToken;
    const handle = await token.confidentialBalanceOf(player.address);
    return hre.fhevm.userDecryptEuint(FhevmType.euint64, handle, await token.getAddress(), player);
  }

  async function stakedMatch(game, host, challenger, stake, invited = hre.ethers.ZeroAddress) {
    await game.connect(host).createMatchWith(1, 1, 0, invited, stake);
    const matchId = (await game.nextMatchId()) - 1n;
    await game.connect(challenger).joinMatch(matchId);
    return matchId;
  }

  async function seatedMatch(game, host, challenger, mode = 1, rounds = 1, challengeId = 0n) {
    await game.connect(host)["createMatch(uint8,uint8,uint256)"](mode, rounds, challengeId);
    const matchId = (await game.nextMatchId()) - 1n;
    await game.connect(challenger).joinMatch(matchId);
    return matchId;
  }

  async function submit(game, player, matchId, value) {
    const address = await game.getAddress();
    const input = hre.fhevm.createEncryptedInput(address, player.address);
    input.add8(value);
    const encrypted = await input.encrypt();
    return game.connect(player).submitAction(matchId, encrypted.handles[0], encrypted.inputProof);
  }

  async function playRound(game, one, two, matchId, moveOne, moveTwo) {
    await submit(game, one, matchId, moveOne);
    await submit(game, two, matchId, moveTwo);
    await game.connect(one).resolveRound(matchId);
  }

  // Moves are never public. Pass the two players to read their own sealed moves.
  async function readRound(game, matchId, round, players) {
    const result = await game.getEncryptedRoundResult(matchId, round);
    const open = (handle) => hre.fhevm.publicDecryptEuint(FhevmType.euint8, handle);
    const address = await game.getAddress();
    const own = async (handle, player) => Number(await hre.fhevm.userDecryptEuint(FhevmType.euint8, handle, address, player));
    return {
      actionOne: players ? await own(result.actionOne, players[0]) : undefined,
      actionTwo: players ? await own(result.actionTwo, players[1]) : undefined,
      outcome: Number(await open(result.outcome)),
      pointsOne: Number(await open(result.pointsOne)),
      pointsTwo: Number(await open(result.pointsTwo)),
      eventCode: Number(await open(result.eventCode)),
    };
  }

  async function readScore(game, matchId) {
    const score = await game.getEncryptedScore(matchId);
    return {
      one: Number(await hre.fhevm.publicDecryptEuint(FhevmType.euint8, score.scoreOne)),
      two: Number(await hre.fhevm.publicDecryptEuint(FhevmType.euint8, score.scoreTwo)),
    };
  }

  before(function () {
    if (!hre.fhevm.isMock) this.skip();
  });

  describe("lifecycle", function () {
    it("creates a best-of-three match and exposes its lifecycle metadata", async function () {
      const [host, challenger] = await hre.ethers.getSigners();
      const game = await deploy();

      await expect(game["createMatch(uint8,uint8,uint256)"](2, 3, 0))
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

    it("rejects unsupported modes and round counts", async function () {
      const game = await deploy();
      await expect(game["createMatch(uint8,uint8,uint256)"](9, 3, 0)).to.be.revertedWith("unsupported mode");
      await expect(game["createMatch(uint8,uint8,uint256)"](1, 3, 0)).to.be.revertedWith("single match has one round");
      await expect(game["createMatch(uint8,uint8,uint256)"](2, 5, 0)).to.be.revertedWith("best of three has three rounds");
    });

    it("lets only a stranger take the open seat, once", async function () {
      const [host, challenger, stranger] = await hre.ethers.getSigners();
      const game = await deploy();
      await game["createMatch(uint8,uint8,uint256)"](1, 1, 0);
      await expect(game.connect(host).joinMatch(0n)).to.be.revertedWith("host cannot join twice");
      await game.connect(challenger).joinMatch(0n);
      await expect(game.connect(stranger).joinMatch(0n)).to.be.revertedWith("match is full");
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
      await expect(game.connect(player).setDailyChallenge(1n, 1, true)).to.be.revertedWith("admin only");
    });

    it("emits ProfileRegistered once for a new player", async function () {
      const [, player] = await hre.ethers.getSigners();
      const game = await deploy();
      const tx = await game.connect(player).registerProfile();
      const receipt = await tx.wait();
      const registered = receipt.logs.filter((log) => log.fragment?.name === "ProfileRegistered");
      expect(registered.length).to.equal(1);
    });

    it("guards rematches until the previous match is finished", async function () {
      const [, challenger] = await hre.ethers.getSigners();
      const game = await deploy();

      await game["createMatch(uint8,uint8,uint256)"](1, 1, 0);
      await game.connect(challenger).joinMatch(0n);
      await expect(game.rematch(0n)).to.be.revertedWith("match not finished");
    });

    it("lets the host cancel only before a rival joins", async function () {
      const [host, challenger] = await hre.ethers.getSigners();
      const game = await deploy();
      await game["createMatch(uint8,uint8,uint256)"](1, 1, 0);
      await expect(game.connect(challenger).cancelMatch(0n)).to.be.revertedWith("host only");
      await expect(game.connect(host).cancelMatch(0n)).to.emit(game, "MatchCancelled").withArgs(0n);
      await expect(game.connect(challenger).joinMatch(0n)).to.be.revertedWith("match is closed");
    });
  });

  describe("encrypted rounds", function () {
    const pairings = [
      [STEAL, STEAL, 0],
      [STEAL, GUARD, 2],
      [STEAL, SCOUT, 1],
      [GUARD, STEAL, 1],
      [GUARD, GUARD, 0],
      [GUARD, SCOUT, 2],
      [SCOUT, STEAL, 2],
      [SCOUT, GUARD, 1],
      [SCOUT, SCOUT, 0],
    ];

    for (const [moveOne, moveTwo, outcome] of pairings) {
      it(`resolves move ${moveOne} vs ${moveTwo} as outcome ${outcome}`, async function () {
        const [, one, two] = await hre.ethers.getSigners();
        const game = await deploy();
        const matchId = await seatedMatch(game, one, two);

        await playRound(game, one, two, matchId, moveOne, moveTwo);

        const round = await readRound(game, matchId, 1, [one, two]);
        expect(round.actionOne).to.equal(moveOne);
        expect(round.actionTwo).to.equal(moveTwo);
        expect(round.outcome).to.equal(outcome);
        expect(round.pointsOne > 0).to.equal(outcome === 1);
        expect(round.pointsTwo > 0).to.equal(outcome === 2);
        expect((await game.getMatch(matchId)).finished).to.equal(true);
      });
    }

    it("keeps a submitted move private until the round resolves", async function () {
      const [, one, two] = await hre.ethers.getSigners();
      const game = await deploy();
      const matchId = await seatedMatch(game, one, two);

      await submit(game, one, matchId, STEAL);
      const result = await game.getEncryptedRoundResult(matchId, 1);
      expect(result.resolved).to.equal(false);
      await expect(hre.fhevm.publicDecryptEuint(FhevmType.euint8, result.actionOne)).to.be.rejected;
    });

    it("lets a player decrypt their own sealed move", async function () {
      const [, one, two] = await hre.ethers.getSigners();
      const game = await deploy();
      const matchId = await seatedMatch(game, one, two);

      await submit(game, one, matchId, GUARD);
      const result = await game.getEncryptedRoundResult(matchId, 1);
      const clear = await hre.fhevm.userDecryptEuint(FhevmType.euint8, result.actionOne, await game.getAddress(), one);
      expect(Number(clear)).to.equal(GUARD);
    });

    it("rejects double submits, outsiders and early resolution", async function () {
      const [, one, two, outsider] = await hre.ethers.getSigners();
      const game = await deploy();
      const matchId = await seatedMatch(game, one, two);

      await submit(game, one, matchId, STEAL);
      await expect(submit(game, one, matchId, GUARD)).to.be.revertedWith("player already submitted");
      await expect(submit(game, outsider, matchId, GUARD)).to.be.revertedWith("not a player");
      await expect(game.connect(one).resolveRound(matchId)).to.be.revertedWith("both actions required");
    });

    it("treats an out-of-range move as Scout so it can never be a move that cannot lose", async function () {
      const [, one, two] = await hre.ethers.getSigners();
      const game = await deploy();

      // Player one cheats with 0, player two plays Guard. Scout (the clamp) loses to Steal and beats Guard.
      let matchId = await seatedMatch(game, one, two);
      await playRound(game, one, two, matchId, 0, GUARD);
      let round = await readRound(game, matchId, 1, [one, two]);
      expect(round.actionOne).to.equal(SCOUT);
      expect(round.outcome).to.equal(1);

      // Player one cheats with 255 and loses to Steal, which the old contract would have drawn.
      matchId = await seatedMatch(game, one, two);
      await playRound(game, one, two, matchId, 255, STEAL);
      round = await readRound(game, matchId, 1, [one, two]);
      expect(round.actionOne).to.equal(SCOUT);
      expect(round.outcome).to.equal(2);
    });

    it("applies event bonuses from an active daily challenge", async function () {
      const [, one, two] = await hre.ethers.getSigners();
      const game = await deploy();

      // Event 1 doubles the base reward.
      await game.setDailyChallenge(7n, 1, true);
      let matchId = await seatedMatch(game, one, two, 1, 1, 7n);
      await playRound(game, one, two, matchId, STEAL, SCOUT);
      let round = await readRound(game, matchId, 1);
      expect(round.eventCode).to.equal(1);
      expect(round.pointsOne).to.equal(2);

      // Event 3 gives a winning Scout one extra point.
      await game.setDailyChallenge(8n, 3, true);
      matchId = await seatedMatch(game, one, two, 1, 1, 8n);
      await playRound(game, one, two, matchId, SCOUT, GUARD);
      round = await readRound(game, matchId, 1);
      expect(round.eventCode).to.equal(3);
      expect(round.pointsOne).to.equal(2);

      // Event 0 is the plain reward.
      await game.setDailyChallenge(9n, 0, true);
      matchId = await seatedMatch(game, one, two, 1, 1, 9n);
      await playRound(game, one, two, matchId, GUARD, STEAL);
      round = await readRound(game, matchId, 1);
      expect(round.eventCode).to.equal(0);
      expect(round.pointsOne).to.equal(1);
    });

    it("draws a random event in range when no challenge is active", async function () {
      const [, one, two] = await hre.ethers.getSigners();
      const game = await deploy();
      const matchId = await seatedMatch(game, one, two);
      await playRound(game, one, two, matchId, STEAL, SCOUT);
      const round = await readRound(game, matchId, 1);
      expect(round.eventCode).to.be.lessThan(4);
    });

    it("plays a best-of-three, accumulates the encrypted score and finishes", async function () {
      const [, one, two] = await hre.ethers.getSigners();
      const game = await deploy();
      const matchId = await seatedMatch(game, one, two, 2, 3);

      await playRound(game, one, two, matchId, STEAL, SCOUT);
      expect((await game.getMatch(matchId)).finished).to.equal(false);
      await expect(game.connect(one).startNextRound(matchId)).to.emit(game, "NextRoundStarted").withArgs(matchId, 2);

      await playRound(game, one, two, matchId, GUARD, STEAL);
      await game.connect(two).startNextRound(matchId);

      await expect(
        (async () => {
          await submit(game, one, matchId, SCOUT);
          await submit(game, two, matchId, STEAL);
          return game.connect(two).resolveRound(matchId);
        })(),
      ).to.emit(game, "MatchFinished").withArgs(matchId, 3);

      const score = await readScore(game, matchId);
      const r1 = await readRound(game, matchId, 1);
      const r2 = await readRound(game, matchId, 2);
      const r3 = await readRound(game, matchId, 3);
      expect(score.one).to.equal(r1.pointsOne + r2.pointsOne + r3.pointsOne);
      expect(score.two).to.equal(r1.pointsTwo + r2.pointsTwo + r3.pointsTwo);
      expect([r1.outcome, r2.outcome, r3.outcome]).to.deep.equal([1, 1, 2]);
      expect((await game.getMatch(matchId)).finished).to.equal(true);

      await expect(game.connect(one).startNextRound(matchId)).to.be.revertedWith("match is closed");
      await expect(game.connect(one).rematch(matchId)).to.emit(game, "RematchCreated");
    });
  });

  describe("timeouts", function () {
    it("does not allow a forfeit claim before the timeout", async function () {
      const [, one, two] = await hre.ethers.getSigners();
      const game = await deploy();
      const matchId = await seatedMatch(game, one, two);
      await submit(game, one, matchId, STEAL);
      await expect(game.connect(one).forfeitTimeout(matchId)).to.be.revertedWith("timeout not reached");
    });

    it("awards the match to the player who moved, whatever the score says", async function () {
      const [, one, two] = await hre.ethers.getSigners();
      const game = await deploy();
      const matchId = await seatedMatch(game, one, two, 2, 3);

      // Player two leads 2 to 0 after two rounds.
      await playRound(game, one, two, matchId, STEAL, GUARD);
      await game.connect(one).startNextRound(matchId);
      await playRound(game, one, two, matchId, STEAL, GUARD);
      await game.connect(one).startNextRound(matchId);

      // Round 3: player one moves, player two (the leader) walks away.
      await submit(game, one, matchId, STEAL);
      await hre.network.provider.send("evm_increaseTime", [TIMEOUT + 1]);
      await hre.network.provider.send("evm_mine");

      await expect(game.connect(one).forfeitTimeout(matchId))
        .to.emit(game, "MatchTimedOut")
        .withArgs(matchId, 3, one.address);

      expect(await game.forfeitWinner(matchId)).to.equal(one.address);
      expect((await game.getMatch(matchId)).finished).to.equal(true);
      // The forfeit winner is the match winner even though player two has the higher score.
      const score = await readScore(game, matchId);
      expect(score.two).to.be.greaterThan(score.one);
    });

    it("lets a seated pair abandon a stale match that nobody played", async function () {
      const [, one, two] = await hre.ethers.getSigners();
      const game = await deploy();
      const matchId = await seatedMatch(game, one, two);

      await expect(game.connect(one).abandonStaleMatch(matchId)).to.be.revertedWith("timeout not reached");
      await hre.network.provider.send("evm_increaseTime", [TIMEOUT + 1]);
      await hre.network.provider.send("evm_mine");
      await expect(game.connect(one).abandonStaleMatch(matchId)).to.emit(game, "MatchCancelled").withArgs(matchId);
      expect((await game.getMatch(matchId)).cancelled).to.equal(true);
    });

    it("refuses to abandon a match once a player has moved", async function () {
      const [, one, two] = await hre.ethers.getSigners();
      const game = await deploy();
      const matchId = await seatedMatch(game, one, two);
      await submit(game, one, matchId, STEAL);
      await hre.network.provider.send("evm_increaseTime", [TIMEOUT + 1]);
      await hre.network.provider.send("evm_mine");
      await expect(game.connect(one).abandonStaleMatch(matchId)).to.be.revertedWith("a player already moved");
    });
  });

  describe("sealed moves", function () {
    it("never publishes the moves, even after the round resolves", async function () {
      const [, one, two] = await hre.ethers.getSigners();
      const game = await deploy();
      const matchId = await seatedMatch(game, one, two);
      await playRound(game, one, two, matchId, STEAL, SCOUT);

      const result = await game.getEncryptedRoundResult(matchId, 1);
      await expect(hre.fhevm.publicDecryptEuint(FhevmType.euint8, result.actionOne)).to.be.rejected;
      await expect(hre.fhevm.publicDecryptEuint(FhevmType.euint8, result.actionTwo)).to.be.rejected;
      // The outcome is public, the moves are not.
      expect(Number(await hre.fhevm.publicDecryptEuint(FhevmType.euint8, result.outcome))).to.equal(1);
    });

    it("does not let a player read the rival's sealed move", async function () {
      const [, one, two] = await hre.ethers.getSigners();
      const game = await deploy();
      const matchId = await seatedMatch(game, one, two);
      await playRound(game, one, two, matchId, STEAL, SCOUT);
      const result = await game.getEncryptedRoundResult(matchId, 1);
      await expect(
        hre.fhevm.userDecryptEuint(FhevmType.euint8, result.actionTwo, await game.getAddress(), one),
      ).to.be.rejected;
    });
  });

  describe("invite-only seats", function () {
    it("only lets the invited wallet take the second seat", async function () {
      const [, host, friend, stranger] = await hre.ethers.getSigners();
      const game = await deploy();
      await game.connect(host).createMatchWith(1, 1, 0, friend.address, 0);
      await expect(game.connect(stranger).joinMatch(0n)).to.be.revertedWith("invite only");
      await expect(game.connect(friend).joinMatch(0n)).to.emit(game, "PlayerJoined").withArgs(0n, friend.address);
      const info = await game.getStakeInfo(0n);
      expect(info.invited).to.equal(friend.address);
    });

    it("rejects inviting yourself", async function () {
      const [, host] = await hre.ethers.getSigners();
      const game = await deploy();
      await expect(game.connect(host).createMatchWith(1, 1, 0, host.address, 0)).to.be.revertedWith("cannot invite yourself");
    });
  });

  describe("confidential stakes", function () {
    it("pays the winner the whole pot", async function () {
      const [, one, two] = await hre.ethers.getSigners();
      const game = await deploy();
      await fund(game, one, 1000n);
      await fund(game, two, 1000n);
      const matchId = await stakedMatch(game, one, two, 100n);

      expect(await balanceOf(game, one)).to.equal(900n);
      expect(await balanceOf(game, two)).to.equal(900n);

      await playRound(game, one, two, matchId, STEAL, SCOUT); // player one wins
      await expect(game.settle(matchId)).to.emit(game, "StakeSettled").withArgs(matchId);

      expect(await balanceOf(game, one)).to.equal(1100n);
      expect(await balanceOf(game, two)).to.equal(900n);
      await expect(game.settle(matchId)).to.be.revertedWith("already settled");
    });

    it("returns each stake on a draw", async function () {
      const [, one, two] = await hre.ethers.getSigners();
      const game = await deploy();
      await fund(game, one, 500n);
      await fund(game, two, 500n);
      const matchId = await stakedMatch(game, one, two, 50n);
      await playRound(game, one, two, matchId, GUARD, GUARD);
      await game.settle(matchId);
      expect(await balanceOf(game, one)).to.equal(500n);
      expect(await balanceOf(game, two)).to.equal(500n);
    });

    it("pays the forfeit winner even when the loser has the higher score", async function () {
      const [, one, two] = await hre.ethers.getSigners();
      const game = await deploy();
      await fund(game, one, 300n);
      await fund(game, two, 300n);
      await game.connect(one).createMatchWith(2, 3, 0, hre.ethers.ZeroAddress, 100n);
      const matchId = (await game.nextMatchId()) - 1n;
      await game.connect(two).joinMatch(matchId);

      await playRound(game, one, two, matchId, STEAL, GUARD); // player two leads
      await game.connect(one).startNextRound(matchId);
      await submit(game, one, matchId, STEAL);
      await hre.network.provider.send("evm_increaseTime", [TIMEOUT + 1]);
      await hre.network.provider.send("evm_mine");
      await game.connect(one).forfeitTimeout(matchId);

      await game.settle(matchId);
      expect(await balanceOf(game, one)).to.equal(400n);
      expect(await balanceOf(game, two)).to.equal(200n);
    });

    it("refunds the host when a staked vault is cancelled before anyone joins", async function () {
      const [, one] = await hre.ethers.getSigners();
      const game = await deploy();
      await fund(game, one, 200n);
      await game.connect(one).createMatchWith(1, 1, 0, hre.ethers.ZeroAddress, 80n);
      expect(await balanceOf(game, one)).to.equal(120n);
      await game.connect(one).cancelMatch(0n);
      await game.settle(0n);
      expect(await balanceOf(game, one)).to.equal(200n);
    });

    it("refunds both players when a seated match is abandoned", async function () {
      const [, one, two] = await hre.ethers.getSigners();
      const game = await deploy();
      await fund(game, one, 200n);
      await fund(game, two, 200n);
      const matchId = await stakedMatch(game, one, two, 60n);
      await hre.network.provider.send("evm_increaseTime", [TIMEOUT + 1]);
      await hre.network.provider.send("evm_mine");
      await game.connect(one).abandonStaleMatch(matchId);
      await game.settle(matchId);
      expect(await balanceOf(game, one)).to.equal(200n);
      expect(await balanceOf(game, two)).to.equal(200n);
    });

    it("never lets a wallet that could not fund its stake win the other player's money", async function () {
      const [, one, two] = await hre.ethers.getSigners();
      const game = await deploy();
      await fund(game, one, 1000n); // player two is operator-approved but has nothing
      await game.mockToken.connect(two).setOperator(await game.getAddress(), 2n ** 40n);
      const matchId = await stakedMatch(game, one, two, 100n);

      await playRound(game, one, two, matchId, GUARD, STEAL); // player one wins
      await game.settle(matchId);
      // Player two put in 0, so the pot is 0 and player one gets their own 100 back.
      expect(await balanceOf(game, one)).to.equal(1000n);
      expect(await balanceOf(game, two)).to.equal(0n);

      const matchId2 = await stakedMatch(game, one, two, 100n);
      await playRound(game, one, two, matchId2, STEAL, GUARD); // player two wins but staked 0
      await game.settle(matchId2);
      expect(await balanceOf(game, one)).to.equal(1000n);
      expect(await balanceOf(game, two)).to.equal(0n);
    });

    it("makes a rematch rival join and pay for themselves", async function () {
      const [, one, two] = await hre.ethers.getSigners();
      const game = await deploy();
      await fund(game, one, 500n);
      await fund(game, two, 500n);
      const matchId = await stakedMatch(game, one, two, 100n);
      await playRound(game, one, two, matchId, STEAL, SCOUT);
      await game.settle(matchId);

      await game.connect(two).rematch(matchId);
      const rematchId = (await game.nextMatchId()) - 1n;
      // Only the caller's stake moved. The old rival has to join to pay.
      expect(await balanceOf(game, two)).to.equal(300n); // lost 100, then staked 100 again
      expect((await game.getMatch(rematchId)).playerTwo).to.equal(hre.ethers.ZeroAddress);
      await expect(game.connect((await hre.ethers.getSigners())[3]).joinMatch(rematchId)).to.be.revertedWith("invite only");
      await game.connect(one).joinMatch(rematchId);
      expect(await balanceOf(game, one)).to.equal(500n); // won 100, then staked 100 again
    });

    it("refuses stakes and settlement for free matches", async function () {
      const [, one, two] = await hre.ethers.getSigners();
      const game = await deploy();
      const matchId = await seatedMatch(game, one, two);
      await playRound(game, one, two, matchId, STEAL, SCOUT);
      await expect(game.settle(matchId)).to.be.revertedWith("no stake");
    });

    it("rejects stakes when no stake token is configured", async function () {
      const [, one] = await hre.ethers.getSigners();
      const Factory = await hre.ethers.getContractFactory("ShadowHeistV2");
      const game = await Factory.deploy(hre.ethers.ZeroAddress);
      await game.waitForDeployment();
      await expect(game.connect(one).createMatchWith(1, 1, 0, hre.ethers.ZeroAddress, 10n)).to.be.revertedWith("stakes are not enabled");
    });
  });
});
