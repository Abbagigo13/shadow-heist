// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.27;

import {FHE, ebool, euint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @notice Test-only stand-in for an ERC-7984 token. Like the real one, a transfer that exceeds the
/// sender's balance moves 0 instead of reverting, because the balance is encrypted.
contract MockConfidentialToken is ZamaEthereumConfig {
    mapping(address => euint64) private balances;
    mapping(address => mapping(address => bool)) public isOperator;

    function mint(address to, uint64 amount) external {
        euint64 updated = FHE.add(_balance(to), amount);
        _store(to, updated);
    }

    function setOperator(address operator, uint48) external {
        isOperator[msg.sender][operator] = true;
    }

    function confidentialBalanceOf(address account) external view returns (euint64) {
        return balances[account];
    }

    function confidentialTransferFrom(address from, address to, euint64 amount) external returns (euint64) {
        require(from == msg.sender || isOperator[from][msg.sender], "not operator");
        return _transfer(from, to, amount);
    }

    function confidentialTransfer(address to, euint64 amount) external returns (euint64) {
        return _transfer(msg.sender, to, amount);
    }

    function _transfer(address from, address to, euint64 amount) internal returns (euint64 sent) {
        euint64 fromBalance = _balance(from);
        ebool enough = FHE.le(amount, fromBalance);
        sent = FHE.select(enough, amount, FHE.asEuint64(0));
        _store(from, FHE.sub(fromBalance, sent));
        _store(to, FHE.add(_balance(to), sent));
        FHE.allowTransient(sent, msg.sender);
    }

    function _balance(address account) internal returns (euint64) {
        euint64 current = balances[account];
        if (!FHE.isInitialized(current)) return FHE.asEuint64(0);
        return current;
    }

    function _store(address account, euint64 value) internal {
        balances[account] = value;
        FHE.allowThis(value);
        FHE.allow(value, account);
    }
}
