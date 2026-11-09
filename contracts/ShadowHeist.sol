// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.27;

import {FHE, ebool, euint8, externalEuint8} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title Shadow Heist
/// @notice A two-player confidential strategy game. Player choices remain encrypted
/// until a round is resolved and the result handles are made publicly decryptable.
contract ShadowHeist is ZamaEthereumConfig {
    uint8 public constant STEAL = 1;
    uint8 public constant GUARD = 2;
    uint8 public constant SCOUT = 3;

    struct Match {
        address playerOne;
        address playerTwo;
        uint8 round;
        uint8 scoreOne;
        uint8 scoreTwo;
        bool playerOneSubmitted;
        bool playerTwoSubmitted;
        bool roundResolved;
        euint8 actionOne;
        euint8 actionTwo;
        euint8 outcome;
        euint8 pointsOne;
        euint8 pointsTwo;
        euint8 eventCode;
    }

    uint256 public nextMatchId;
    mapping(uint256 => Match) private matches;

    event MatchCreated(uint256 indexed matchId, address indexed playerOne);
    event PlayerJoined(uint256 indexed matchId, address indexed playerTwo);
    event ActionSubmitted(uint256 indexed matchId, address indexed player);
    event RoundReady(uint256 indexed matchId);

    function createMatch() external returns (uint256 matchId) {
        matchId = nextMatchId++;
        Match storage game = matches[matchId];
        game.playerOne = msg.sender;
        game.round = 1;
        emit MatchCreated(matchId, msg.sender);
    }

    function joinMatch(uint256 matchId) external {
        Match storage game = matches[matchId];
        require(game.playerOne != address(0), "match does not exist");
        require(game.playerTwo == address(0), "match is full");
        require(msg.sender != game.playerOne, "host cannot join twice");
        game.playerTwo = msg.sender;
        emit PlayerJoined(matchId, msg.sender);
    }

    function submitAction(
        uint256 matchId,
        externalEuint8 encryptedAction,
        bytes calldata inputProof
    ) external {
        Match storage game = matches[matchId];
        require(msg.sender == game.playerOne || msg.sender == game.playerTwo, "not a player");
        require(game.playerTwo != address(0), "waiting for player two");
        require(!game.roundResolved, "round already resolved");
        require(_isValidPlayer(game, msg.sender), "player already submitted");

        euint8 action = FHE.fromExternal(encryptedAction, inputProof);
        FHE.allowThis(action);
        FHE.allow(action, msg.sender);

        if (msg.sender == game.playerOne) {
            game.actionOne = action;
            game.playerOneSubmitted = true;
        } else {
            game.actionTwo = action;
            game.playerTwoSubmitted = true;
        }

        emit ActionSubmitted(matchId, msg.sender);
        if (game.playerOneSubmitted && game.playerTwoSubmitted) {
            emit RoundReady(matchId);
        }
    }

    function resolveRound(uint256 matchId) external {
        Match storage game = matches[matchId];
        require(game.playerOneSubmitted && game.playerTwoSubmitted, "both actions required");
        require(!game.roundResolved, "round already resolved");

        ebool playerOneSteals = FHE.eq(game.actionOne, STEAL);
        ebool playerOneGuards = FHE.eq(game.actionOne, GUARD);
        ebool playerOneScouts = FHE.eq(game.actionOne, SCOUT);
        ebool playerTwoSteals = FHE.eq(game.actionTwo, STEAL);
        ebool playerTwoGuards = FHE.eq(game.actionTwo, GUARD);
        ebool playerTwoScouts = FHE.eq(game.actionTwo, SCOUT);

        ebool playerOneWins = FHE.or(
            FHE.or(FHE.and(playerOneSteals, playerTwoScouts), FHE.and(playerOneGuards, playerTwoSteals)),
            FHE.and(playerOneScouts, playerTwoGuards)
        );
        ebool playerTwoWins = FHE.or(
            FHE.or(FHE.and(playerTwoSteals, playerOneScouts), FHE.and(playerTwoGuards, playerOneSteals)),
            FHE.and(playerTwoScouts, playerOneGuards)
        );

        euint8 randomEvent = FHE.randEuint8(2);
        euint8 onePoint = FHE.asEuint8(1);
        euint8 twoPoints = FHE.asEuint8(2);
        euint8 zeroPoints = FHE.asEuint8(0);

        game.eventCode = randomEvent;
        game.pointsOne = FHE.select(playerOneWins, FHE.select(FHE.eq(randomEvent, 1), twoPoints, onePoint), zeroPoints);
        game.pointsTwo = FHE.select(playerTwoWins, onePoint, zeroPoints);
        game.outcome = FHE.select(
            playerOneWins,
            FHE.asEuint8(1),
            FHE.select(playerTwoWins, FHE.asEuint8(2), FHE.asEuint8(0))
        );
        game.roundResolved = true;

        FHE.allowThis(game.actionOne);
        FHE.allowThis(game.actionTwo);
        FHE.allowThis(game.outcome);
        FHE.allowThis(game.pointsOne);
        FHE.allowThis(game.pointsTwo);
        FHE.allowThis(game.eventCode);

        FHE.makePubliclyDecryptable(game.actionOne);
        FHE.makePubliclyDecryptable(game.actionTwo);
        FHE.makePubliclyDecryptable(game.outcome);
        FHE.makePubliclyDecryptable(game.pointsOne);
        FHE.makePubliclyDecryptable(game.pointsTwo);
        FHE.makePubliclyDecryptable(game.eventCode);
    }

    function getMatch(uint256 matchId) external view returns (
        address playerOne,
        address playerTwo,
        uint8 round,
        uint8 scoreOne,
        uint8 scoreTwo,
        bool playerOneSubmitted,
        bool playerTwoSubmitted,
        bool roundResolved
    ) {
        Match storage game = matches[matchId];
        return (
            game.playerOne,
            game.playerTwo,
            game.round,
            game.scoreOne,
            game.scoreTwo,
            game.playerOneSubmitted,
            game.playerTwoSubmitted,
            game.roundResolved
        );
    }

    function getEncryptedResult(uint256 matchId) external view returns (
        euint8 actionOne,
        euint8 actionTwo,
        euint8 outcome,
        euint8 pointsOne,
        euint8 pointsTwo,
        euint8 eventCode
    ) {
        Match storage game = matches[matchId];
        require(game.roundResolved, "round not resolved");
        return (
            game.actionOne,
            game.actionTwo,
            game.outcome,
            game.pointsOne,
            game.pointsTwo,
            game.eventCode
        );
    }

    function _isValidPlayer(Match storage game, address player) internal view returns (bool) {
        if (player == game.playerOne) return !game.playerOneSubmitted;
        return !game.playerTwoSubmitted;
    }
}
