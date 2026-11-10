// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.27;

import {euint64} from "@fhevm/solidity/lib/FHE.sol";

/// @notice The slice of ERC-7984 that Shadow Heist uses for stakes.
/// @dev The official Zama confidential wrappers (for example cUSDT) implement these overloads.
interface IConfidentialToken {
    function confidentialTransferFrom(address from, address to, euint64 amount) external returns (euint64 transferred);

    function confidentialTransfer(address to, euint64 amount) external returns (euint64 transferred);
}
