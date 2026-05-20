// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Test.sol";
import {KiteVault} from "../src/KiteVault.sol";
import {MockERC20} from "./MockERC20.sol";

contract KiteVaultTest is Test {
    KiteVault internal vault;
    MockERC20 internal token;

    address internal owner = makeAddr("owner");
    address internal agent = makeAddr("agent");
    address internal recipient = makeAddr("recipient");
    address internal other = makeAddr("other");

    KiteVault.AgentRules internal defaultRules =
        KiteVault.AgentRules({
            dailyLimit: 100 ether,
            monthlyLimit: 1000 ether,
            perTxLimit: 25 ether,
            minBalanceThreshold: 50 ether,
            active: true
        });

    function setUp() public {
        token = new MockERC20();
        vault = new KiteVault(owner, address(token));

        token.mint(owner, 10_000 ether);
        token.mint(other, 1_000 ether);

        vm.prank(owner);
        token.approve(address(vault), type(uint256).max);

        vm.prank(other);
        token.approve(address(vault), type(uint256).max);
    }

    // --- deposit ---

    function test_anyoneCanDeposit() public {
        vm.prank(other);
        vault.deposit(100 ether);
        assertEq(token.balanceOf(address(vault)), 100 ether);
    }

    function test_depositZeroReverts() public {
        vm.prank(other);
        vm.expectRevert(KiteVault.ZeroAmount.selector);
        vault.deposit(0);
    }

    // --- ownerWithdraw ---

    function test_ownerCanWithdraw() public {
        vm.prank(owner);
        vault.deposit(200 ether);

        vm.prank(owner);
        vault.ownerWithdraw(owner, 150 ether);
        assertEq(token.balanceOf(address(vault)), 50 ether);
    }

    function test_nonOwnerCannotWithdraw() public {
        vm.prank(owner);
        vault.deposit(100 ether);

        vm.prank(other);
        vm.expectRevert();
        vault.ownerWithdraw(other, 1 ether);
    }

    // --- setAgent / revokeAgent ---

    function test_ownerSetsAgent() public {
        vm.prank(owner);
        vault.setAgent(agent, defaultRules);
        assertEq(vault.agent(), agent);
    }

    function test_nonOwnerCannotSetAgent() public {
        vm.prank(other);
        vm.expectRevert();
        vault.setAgent(agent, defaultRules);
    }

    function test_setAgentResetsCounters() public {
        // First agent + spend
        vm.prank(owner);
        vault.deposit(500 ether);
        vm.prank(owner);
        vault.setAgent(agent, defaultRules);

        vm.prank(agent);
        vault.agentWithdraw(recipient, 20 ether);
        assertEq(vault.dailySpent(), 20 ether);

        // New agent → counters reset
        vm.prank(owner);
        vault.setAgent(other, defaultRules);
        assertEq(vault.dailySpent(), 0);
        assertEq(vault.monthlySpent(), 0);
    }

    function test_revokeAgentStopsWithdrawals() public {
        vm.prank(owner);
        vault.deposit(500 ether);
        vm.prank(owner);
        vault.setAgent(agent, defaultRules);

        vm.prank(owner);
        vault.revokeAgent();

        vm.prank(agent);
        vm.expectRevert(KiteVault.NotAgent.selector);
        vault.agentWithdraw(recipient, 1 ether);
    }

    function test_pauseAgentBlocksWithdrawals() public {
        vm.prank(owner);
        vault.deposit(500 ether);
        vm.prank(owner);
        vault.setAgent(agent, defaultRules);

        vm.prank(owner);
        vault.pauseAgent();

        vm.prank(agent);
        vm.expectRevert(KiteVault.AgentPaused.selector);
        vault.agentWithdraw(recipient, 1 ether);
    }

    function test_unpauseRestoresWithdrawals() public {
        vm.prank(owner);
        vault.deposit(500 ether);
        vm.prank(owner);
        vault.setAgent(agent, defaultRules);

        vm.prank(owner);
        vault.pauseAgent();
        vm.prank(owner);
        vault.unpauseAgent();

        vm.prank(agent);
        vault.agentWithdraw(recipient, 5 ether);
        assertEq(token.balanceOf(recipient), 5 ether);
    }

    // --- agentWithdraw rule enforcement ---

    function test_agentWithinLimits() public {
        vm.prank(owner);
        vault.deposit(500 ether);
        vm.prank(owner);
        vault.setAgent(agent, defaultRules);

        vm.prank(agent);
        vault.agentWithdraw(recipient, 25 ether);
        assertEq(token.balanceOf(recipient), 25 ether);
        assertEq(vault.dailySpent(), 25 ether);
        assertEq(vault.monthlySpent(), 25 ether);
    }

    function test_agentExceedsPerTxLimit() public {
        vm.prank(owner);
        vault.deposit(500 ether);
        vm.prank(owner);
        vault.setAgent(agent, defaultRules);

        vm.prank(agent);
        vm.expectRevert(KiteVault.PerTxLimitExceeded.selector);
        vault.agentWithdraw(recipient, 26 ether);
    }

    function test_agentExceedsDailyLimit() public {
        vm.prank(owner);
        vault.deposit(500 ether);
        vm.prank(owner);
        vault.setAgent(agent, defaultRules);

        // Spend 4 * 25 = 100, then try 1 more.
        for (uint256 i = 0; i < 4; i++) {
            vm.prank(agent);
            vault.agentWithdraw(recipient, 25 ether);
        }
        vm.prank(agent);
        vm.expectRevert(KiteVault.DailyLimitExceeded.selector);
        vault.agentWithdraw(recipient, 1 ether);
    }

    function test_dailyCounterResetsAfter24h() public {
        vm.prank(owner);
        vault.deposit(500 ether);
        vm.prank(owner);
        vault.setAgent(agent, defaultRules);

        // Max out the daily cap.
        for (uint256 i = 0; i < 4; i++) {
            vm.prank(agent);
            vault.agentWithdraw(recipient, 25 ether);
        }
        vm.warp(block.timestamp + 1 days + 1);

        vm.prank(agent);
        vault.agentWithdraw(recipient, 25 ether);
        assertEq(vault.dailySpent(), 25 ether);
    }

    function test_agentBelowMinBalanceReverts() public {
        // Set min balance to be just above what's left after a max-perTx withdrawal.
        vm.prank(owner);
        vault.deposit(60 ether);
        vm.prank(owner);
        vault.setAgent(
            agent,
            KiteVault.AgentRules({
                dailyLimit: 100 ether,
                monthlyLimit: 1000 ether,
                perTxLimit: 25 ether,
                minBalanceThreshold: 50 ether,
                active: true
            })
        );
        // Withdrawing 11 would leave 49, below the 50 minimum.
        vm.prank(agent);
        vm.expectRevert(KiteVault.BelowMinBalance.selector);
        vault.agentWithdraw(recipient, 11 ether);
    }

    function test_nonAgentCannotCallAgentWithdraw() public {
        vm.prank(owner);
        vault.deposit(500 ether);
        vm.prank(owner);
        vault.setAgent(agent, defaultRules);

        vm.prank(other);
        vm.expectRevert(KiteVault.NotAgent.selector);
        vault.agentWithdraw(recipient, 1 ether);
    }

    // --- spendingHeadroom view ---

    function test_spendingHeadroom() public {
        vm.prank(owner);
        vault.deposit(500 ether);
        vm.prank(owner);
        vault.setAgent(agent, defaultRules);

        (uint256 d, uint256 m) = vault.spendingHeadroom();
        assertEq(d, 100 ether);
        assertEq(m, 1000 ether);

        vm.prank(agent);
        vault.agentWithdraw(recipient, 25 ether);
        (d, m) = vault.spendingHeadroom();
        assertEq(d, 75 ether);
        assertEq(m, 975 ether);
    }
}
