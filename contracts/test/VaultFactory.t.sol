// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Test.sol";
import {VaultFactory} from "../src/VaultFactory.sol";
import {KiteVault} from "../src/KiteVault.sol";
import {MockERC20} from "./MockERC20.sol";

contract VaultFactoryTest is Test {
    VaultFactory internal factory;
    MockERC20 internal token;

    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");

    function setUp() public {
        factory = new VaultFactory();
        token = new MockERC20();
    }

    function test_createVaultStoresMapping() public {
        vm.prank(alice);
        address vault = factory.createVault(address(token));
        assertEq(factory.vaultOf(alice, address(token)), vault);
        assertEq(factory.allVaultsCount(), 1);

        KiteVault v = KiteVault(vault);
        assertEq(v.owner(), alice);
        assertEq(address(v.token()), address(token));
    }

    function test_secondVaultForSameTokenReverts() public {
        vm.prank(alice);
        factory.createVault(address(token));
        vm.prank(alice);
        vm.expectRevert(VaultFactory.VaultExists.selector);
        factory.createVault(address(token));
    }

    function test_differentOwnersCanShareToken() public {
        vm.prank(alice);
        factory.createVault(address(token));
        vm.prank(bob);
        factory.createVault(address(token));
        assertEq(factory.allVaultsCount(), 2);
        assertTrue(factory.vaultOf(alice, address(token)) != factory.vaultOf(bob, address(token)));
    }

    function test_zeroTokenReverts() public {
        vm.prank(alice);
        vm.expectRevert(VaultFactory.ZeroAddress.selector);
        factory.createVault(address(0));
    }
}
