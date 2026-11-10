// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.27;

import {FHE, ebool, euint8, externalEuint8} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title Shadow Heist V2
/// @notice Extensible two-player confidential strategy matches for FHEVM.
/// @dev Moves and cumulative scores remain encrypted. Frontends/indexers derive
/// profiles, streaks, and leaderboards from public result handles and events.
contract ShadowHeistV2 is ZamaEthereumConfig {
    uint8 public constant STEAL = 1;
    uint8 public constant GUARD = 2;
    uint8 public constant SCOUT = 3;

    uint8 public constant MODE_SINGLE = 1;
    uint8 public constant MODE_BEST_OF_THREE = 2;
    uint8 public constant MAX_ROUNDS = 9;
    uint8 public constant EVENT_COUNT = 4;
    uint64 public constant ACTION_TIMEOUT = 30 minutes;

    struct Match {
        address playerOne;
        address playerTwo;
        uint8 mode;
        uint8 maxRounds;
        uint8 round;
        uint256 challengeId;
        uint64 createdAt;
        uint64 lastActionAt;
        uint8 scoreOne;
        uint8 scoreTwo;
        bool playerOneSubmitted;
        bool playerTwoSubmitted;
        bool roundResolved;
        bool finished;
        bool cancelled;
        euint8 encryptedScoreOne;
        euint8 encryptedScoreTwo;
    }

    struct RoundResult {
        euint8 actionOne;
        euint8 actionTwo;
        euint8 outcome;
        euint8 pointsOne;
        euint8 pointsTwo;
        euint8 eventCode;
        bool resolved;
    }

    struct DailyChallenge {
        uint8 eventCode;
        bool active;
    }

    struct PublicProfile {
        uint64 matchesCreated;
        uint64 matchesJoined;
        uint64 lastSeenAt;
        bool registered;
    }

    uint256 public nextMatchId;
    address public immutable admin;
    /// @notice Set when a match ended by timeout. The forfeit winner wins the match regardless of score.
    mapping(uint256 => address) public forfeitWinner;
    mapping(uint256 => Match) private matches;
    mapping(uint256 => mapping(uint8 => RoundResult)) private rounds;
    mapping(uint256 => DailyChallenge) private dailyChallenges;
    mapping(address => PublicProfile) private profiles;
    address[] private playerDirectory;

    event MatchCreated(uint256 indexed matchId, address indexed playerOne, uint8 mode, uint8 maxRounds, uint256 challengeId);
    event PlayerJoined(uint256 indexed matchId, address indexed playerTwo);
    event ActionSubmitted(uint256 indexed matchId, uint8 indexed round, address indexed player);
    event RoundReady(uint256 indexed matchId, uint8 indexed round);
    event RoundResolved(uint256 indexed matchId, uint8 indexed round, uint8 eventCount);
    event NextRoundStarted(uint256 indexed matchId, uint8 indexed round);
    event MatchFinished(uint256 indexed matchId, uint8 indexed roundsPlayed);
    event MatchCancelled(uint256 indexed matchId);
    event MatchTimedOut(uint256 indexed matchId, uint8 indexed round, address indexed winner);
    event RematchCreated(uint256 indexed previousMatchId, uint256 indexed matchId);
    event ProfileRegistered(address indexed player);
    event DailyChallengeUpdated(uint256 indexed day, uint8 eventCode, bool active);

    modifier onlyAdmin() {
        require(msg.sender == admin, "admin only");
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    function createMatch() external returns (uint256 matchId) {
        return _createMatch(msg.sender, address(0), MODE_SINGLE, 1, 0);
    }

    function createMatch(uint8 mode, uint8 maxRounds, uint256 challengeId) external returns (uint256 matchId) {
        require(mode == MODE_SINGLE || mode == MODE_BEST_OF_THREE, "unsupported mode");
        require(maxRounds == 1 || maxRounds == 3 || maxRounds == 5 || maxRounds == 7 || maxRounds == 9, "invalid round count");
        if (mode == MODE_SINGLE) require(maxRounds == 1, "single match has one round");
        if (mode == MODE_BEST_OF_THREE) require(maxRounds == 3, "best of three has three rounds");
        return _createMatch(msg.sender, address(0), mode, maxRounds, challengeId);
    }

    function rematch(uint256 previousMatchId) external returns (uint256 matchId) {
        Match storage previous = matches[previousMatchId];
        require(previous.playerOne != address(0), "match does not exist");
        require(previous.finished, "match not finished");
        require(msg.sender == previous.playerOne || msg.sender == previous.playerTwo, "not a player");
        matchId = _createMatch(previous.playerOne, previous.playerTwo, previous.mode, previous.maxRounds, previous.challengeId);
        emit RematchCreated(previousMatchId, matchId);
    }

    function joinMatch(uint256 matchId) external {
        Match storage game = matches[matchId];
        require(game.playerOne != address(0), "match does not exist");
        require(game.playerTwo == address(0), "match is full");
        require(msg.sender != game.playerOne, "host cannot join twice");
        require(!game.cancelled && !game.finished, "match is closed");
        game.playerTwo = msg.sender;
        game.lastActionAt = uint64(block.timestamp);
        _touchProfile(msg.sender, false);
        emit PlayerJoined(matchId, msg.sender);
    }

    function submitAction(uint256 matchId, externalEuint8 encryptedAction, bytes calldata inputProof) external {
        Match storage game = matches[matchId];
        require(_isPlayer(game, msg.sender), "not a player");
        require(game.playerTwo != address(0), "waiting for player two");
        require(!game.finished && !game.cancelled, "match is closed");
        require(!game.roundResolved, "round already resolved");
        require(_isValidPlayer(game, msg.sender), "player already submitted");

        euint8 rawAction = FHE.fromExternal(encryptedAction, inputProof);
        // A client can encrypt any value. Anything outside 1..3 is treated as SCOUT, so a
        // malformed move can never become a "move that cannot lose".
        ebool validAction = FHE.and(FHE.ge(rawAction, STEAL), FHE.le(rawAction, SCOUT));
        euint8 action = FHE.select(validAction, rawAction, FHE.asEuint8(SCOUT));
        FHE.allowThis(action);
        FHE.allow(action, msg.sender);

        RoundResult storage current = rounds[matchId][game.round];
        if (msg.sender == game.playerOne) {
            current.actionOne = action;
            game.playerOneSubmitted = true;
        } else {
            current.actionTwo = action;
            game.playerTwoSubmitted = true;
        }
        game.lastActionAt = uint64(block.timestamp);

        emit ActionSubmitted(matchId, game.round, msg.sender);
        if (game.playerOneSubmitted && game.playerTwoSubmitted) emit RoundReady(matchId, game.round);
    }

    function resolveRound(uint256 matchId) external {
        Match storage game = matches[matchId];
        require(_isPlayer(game, msg.sender), "not a player");
        require(game.playerOneSubmitted && game.playerTwoSubmitted, "both actions required");
        require(!game.roundResolved && !game.finished, "round is closed");

        RoundResult storage current = rounds[matchId][game.round];
        ebool oneSteals = FHE.eq(current.actionOne, STEAL);
        ebool oneGuards = FHE.eq(current.actionOne, GUARD);
        ebool oneScouts = FHE.eq(current.actionOne, SCOUT);
        ebool twoSteals = FHE.eq(current.actionTwo, STEAL);
        ebool twoGuards = FHE.eq(current.actionTwo, GUARD);
        ebool twoScouts = FHE.eq(current.actionTwo, SCOUT);
        ebool oneWins = FHE.or(FHE.or(FHE.and(oneSteals, twoScouts), FHE.and(oneGuards, twoSteals)), FHE.and(oneScouts, twoGuards));
        ebool twoWins = FHE.or(FHE.or(FHE.and(twoSteals, oneScouts), FHE.and(twoGuards, oneSteals)), FHE.and(twoScouts, oneGuards));

        euint8 eventCode = _eventCode(game.challengeId);
        euint8 zero = FHE.asEuint8(0);
        euint8 one = FHE.asEuint8(1);
        euint8 two = FHE.asEuint8(2);
        euint8 baseReward = FHE.select(FHE.or(FHE.eq(eventCode, 1), FHE.eq(eventCode, 2)), two, one);
        euint8 scoutBonusOne = FHE.select(FHE.and(oneWins, FHE.and(oneScouts, FHE.eq(eventCode, 3))), one, zero);
        euint8 scoutBonusTwo = FHE.select(FHE.and(twoWins, FHE.and(twoScouts, FHE.eq(eventCode, 3))), one, zero);
        euint8 pointsOne = FHE.select(oneWins, FHE.add(baseReward, scoutBonusOne), zero);
        euint8 pointsTwo = FHE.select(twoWins, FHE.add(baseReward, scoutBonusTwo), zero);

        current.outcome = FHE.select(oneWins, one, FHE.select(twoWins, two, zero));
        current.pointsOne = pointsOne;
        current.pointsTwo = pointsTwo;
        current.eventCode = eventCode;
        current.resolved = true;
        game.encryptedScoreOne = FHE.add(game.encryptedScoreOne, pointsOne);
        game.encryptedScoreTwo = FHE.add(game.encryptedScoreTwo, pointsTwo);
        game.roundResolved = true;
        game.lastActionAt = uint64(block.timestamp);

        _allowAndReveal(current.actionOne);
        _allowAndReveal(current.actionTwo);
        _allowAndReveal(current.outcome);
        _allowAndReveal(current.pointsOne);
        _allowAndReveal(current.pointsTwo);
        _allowAndReveal(current.eventCode);
        FHE.allowThis(game.encryptedScoreOne);
        FHE.allowThis(game.encryptedScoreTwo);
        FHE.makePubliclyDecryptable(game.encryptedScoreOne);
        FHE.makePubliclyDecryptable(game.encryptedScoreTwo);

        if (game.round >= game.maxRounds) {
            game.finished = true;
            emit MatchFinished(matchId, game.round);
        }
        emit RoundResolved(matchId, game.round, EVENT_COUNT);
    }

    function startNextRound(uint256 matchId) external {
        Match storage game = matches[matchId];
        require(_isPlayer(game, msg.sender), "not a player");
        require(game.roundResolved, "round not resolved");
        require(!game.finished && !game.cancelled, "match is closed");
        game.round += 1;
        game.playerOneSubmitted = false;
        game.playerTwoSubmitted = false;
        game.roundResolved = false;
        game.lastActionAt = uint64(block.timestamp);
        emit NextRoundStarted(matchId, game.round);
    }

    function cancelMatch(uint256 matchId) external {
        Match storage game = matches[matchId];
        require(msg.sender == game.playerOne, "host only");
        require(game.playerTwo == address(0), "opponent already joined");
        require(!game.finished && !game.cancelled, "match is closed");
        game.cancelled = true;
        emit MatchCancelled(matchId);
    }

    function forfeitTimeout(uint256 matchId) external {
        Match storage game = matches[matchId];
        require(_isPlayer(game, msg.sender), "not a player");
        require(!game.finished && !game.cancelled && !game.roundResolved, "round is closed");
        require(game.playerOneSubmitted != game.playerTwoSubmitted, "no single-player timeout");
        require(block.timestamp > game.lastActionAt + ACTION_TIMEOUT, "timeout not reached");

        RoundResult storage current = rounds[matchId][game.round];
        euint8 zero = FHE.asEuint8(0);
        euint8 one = FHE.asEuint8(1);
        euint8 two = FHE.asEuint8(2);
        if (game.playerOneSubmitted) {
            current.outcome = one;
            current.pointsOne = one;
            current.pointsTwo = zero;
            forfeitWinner[matchId] = game.playerOne;
            emit MatchTimedOut(matchId, game.round, game.playerOne);
        } else {
            current.outcome = two;
            current.pointsOne = zero;
            current.pointsTwo = one;
            forfeitWinner[matchId] = game.playerTwo;
            emit MatchTimedOut(matchId, game.round, game.playerTwo);
        }
        current.eventCode = zero;
        current.resolved = true;
        game.encryptedScoreOne = FHE.add(game.encryptedScoreOne, current.pointsOne);
        game.encryptedScoreTwo = FHE.add(game.encryptedScoreTwo, current.pointsTwo);
        game.roundResolved = true;
        game.finished = true;
        _allowAndReveal(current.outcome);
        _allowAndReveal(current.pointsOne);
        _allowAndReveal(current.pointsTwo);
        _allowAndReveal(current.eventCode);
        FHE.allowThis(game.encryptedScoreOne);
        FHE.allowThis(game.encryptedScoreTwo);
        FHE.makePubliclyDecryptable(game.encryptedScoreOne);
        FHE.makePubliclyDecryptable(game.encryptedScoreTwo);
        emit RoundResolved(matchId, game.round, EVENT_COUNT);
        emit MatchFinished(matchId, game.round);
    }

    /// @notice Closes a seated match where neither player moved for ACTION_TIMEOUT.
    function abandonStaleMatch(uint256 matchId) external {
        Match storage game = matches[matchId];
        require(_isPlayer(game, msg.sender), "not a player");
        require(game.playerTwo != address(0), "waiting for player two");
        require(!game.finished && !game.cancelled && !game.roundResolved, "round is closed");
        require(!game.playerOneSubmitted && !game.playerTwoSubmitted, "a player already moved");
        require(block.timestamp > game.lastActionAt + ACTION_TIMEOUT, "timeout not reached");
        game.cancelled = true;
        emit MatchCancelled(matchId);
    }

    function registerProfile() external {
        _touchProfile(msg.sender, true);
    }

    function setDailyChallenge(uint256 day, uint8 eventCode, bool active) external onlyAdmin {
        require(eventCode < EVENT_COUNT, "invalid event code");
        dailyChallenges[day] = DailyChallenge(eventCode, active);
        emit DailyChallengeUpdated(day, eventCode, active);
    }

    function getMatch(uint256 matchId) external view returns (
        address playerOne,
        address playerTwo,
        uint8 mode,
        uint8 maxRounds,
        uint8 round,
        uint256 challengeId,
        uint64 createdAt,
        uint64 lastActionAt,
        bool playerOneSubmitted,
        bool playerTwoSubmitted,
        bool roundResolved,
        bool finished,
        bool cancelled
    ) {
        Match storage game = matches[matchId];
        return (game.playerOne, game.playerTwo, game.mode, game.maxRounds, game.round, game.challengeId, game.createdAt, game.lastActionAt, game.playerOneSubmitted, game.playerTwoSubmitted, game.roundResolved, game.finished, game.cancelled);
    }

    function getEncryptedRoundResult(uint256 matchId, uint8 round) external view returns (
        euint8 actionOne,
        euint8 actionTwo,
        euint8 outcome,
        euint8 pointsOne,
        euint8 pointsTwo,
        euint8 eventCode,
        bool resolved
    ) {
        RoundResult storage result = rounds[matchId][round];
        return (result.actionOne, result.actionTwo, result.outcome, result.pointsOne, result.pointsTwo, result.eventCode, result.resolved);
    }

    function getEncryptedScore(uint256 matchId) external view returns (euint8 scoreOne, euint8 scoreTwo) {
        Match storage game = matches[matchId];
        return (game.encryptedScoreOne, game.encryptedScoreTwo);
    }

    function getProfile(address player) external view returns (PublicProfile memory) {
        return profiles[player];
    }

    function getPlayerCount() external view returns (uint256) {
        return playerDirectory.length;
    }

    function playerAt(uint256 index) external view returns (address) {
        return playerDirectory[index];
    }

    function getDailyChallenge(uint256 day) external view returns (uint8 eventCode, bool active) {
        DailyChallenge storage challenge = dailyChallenges[day];
        return (challenge.eventCode, challenge.active);
    }

    function _createMatch(address playerOne, address playerTwo, uint8 mode, uint8 maxRounds, uint256 challengeId) internal returns (uint256 matchId) {
        matchId = nextMatchId++;
        Match storage game = matches[matchId];
        game.playerOne = playerOne;
        game.playerTwo = playerTwo;
        game.mode = mode;
        game.maxRounds = maxRounds;
        game.round = 1;
        game.challengeId = challengeId;
        game.createdAt = uint64(block.timestamp);
        game.lastActionAt = uint64(block.timestamp);
        game.encryptedScoreOne = FHE.asEuint8(0);
        game.encryptedScoreTwo = FHE.asEuint8(0);
        FHE.allowThis(game.encryptedScoreOne);
        FHE.allowThis(game.encryptedScoreTwo);
        _touchProfile(playerOne, false);
        if (playerTwo != address(0)) _touchProfile(playerTwo, false);
        emit MatchCreated(matchId, playerOne, mode, maxRounds, challengeId);
        if (playerTwo != address(0)) emit PlayerJoined(matchId, playerTwo);
    }

    function _eventCode(uint256 challengeId) internal returns (euint8) {
        if (challengeId != 0) {
            DailyChallenge storage challenge = dailyChallenges[challengeId];
            if (challenge.active) return FHE.asEuint8(challenge.eventCode);
        }
        return FHE.randEuint8(EVENT_COUNT);
    }

    function _allowAndReveal(euint8 value) internal {
        FHE.allowThis(value);
        FHE.makePubliclyDecryptable(value);
    }

    function _touchProfile(address player, bool explicitRegistration) internal {
        PublicProfile storage profile = profiles[player];
        bool alreadyRegistered = profile.registered;
        if (!alreadyRegistered) {
            profile.registered = true;
            playerDirectory.push(player);
            emit ProfileRegistered(player);
        }
        profile.lastSeenAt = uint64(block.timestamp);
        if (explicitRegistration && alreadyRegistered) emit ProfileRegistered(player);
    }

    function _isPlayer(Match storage game, address player) internal view returns (bool) {
        return player == game.playerOne || player == game.playerTwo;
    }

    function _isValidPlayer(Match storage game, address player) internal view returns (bool) {
        if (player == game.playerOne) return !game.playerOneSubmitted;
        return !game.playerTwoSubmitted;
    }
}
