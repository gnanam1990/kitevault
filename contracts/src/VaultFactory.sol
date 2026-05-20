// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {KiteVault} from "./KiteVault.sol";

/// @title VaultFactory — deploys per-owner KiteVault instances and indexes them on-chain.
/// @notice ⚠️ EXPERIMENTAL v0.1. Unaudited.
contract VaultFactory {
    /// @notice owner => token => vault. Each (owner, token) pair gets at most one vault.
    mapping(address => mapping(address => address)) public vaultOf;

    /// @notice Convenience for the frontend: every vault deployed via this factory.
    address[] public allVaults;

    event VaultCreated(address indexed owner, address indexed token, address vault);

    error VaultExists();
    error ZeroAddress();

    function createVault(address token) external returns (address vault) {
        if (token == address(0)) revert ZeroAddress();
        if (vaultOf[msg.sender][token] != address(0)) revert VaultExists();

        vault = address(new KiteVault(msg.sender, token));
        vaultOf[msg.sender][token] = vault;
        allVaults.push(vault);

        emit VaultCreated(msg.sender, token, vault);
    }

    function allVaultsCount() external view returns (uint256) {
        return allVaults.length;
    }
}
