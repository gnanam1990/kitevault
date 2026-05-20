// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Script.sol";
import {VaultFactory} from "../src/VaultFactory.sol";

/// @notice Deploys the factory. The vault contracts are deployed per-user by the factory.
///         Usage:
///           forge script script/Deploy.s.sol --rpc-url kite_testnet --broadcast --private-key $PRIVATE_KEY
///         Mainnet deploy is INTENTIONALLY left to a manual step after audit.
contract Deploy is Script {
    function run() external {
        vm.startBroadcast();
        VaultFactory factory = new VaultFactory();
        console.log("VaultFactory deployed at", address(factory));
        vm.stopBroadcast();
    }
}
