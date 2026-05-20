// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title KiteVault — programmable non-custodial vault for AI-agent spend control.
/// @notice ⚠️ EXPERIMENTAL v0.1. Unaudited. Use on testnet first.
/// @dev Owner deposits ERC-20, authorizes one agent with per-tx / daily / monthly caps.
///      Owner can withdraw or revoke at any time. Counters reset on a sliding 24h / 30d window.
contract KiteVault is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct AgentRules {
        uint256 dailyLimit;
        uint256 monthlyLimit;
        uint256 perTxLimit;
        uint256 minBalanceThreshold;
        bool active;
    }

    IERC20 public immutable token;
    address public agent;
    AgentRules public rules;

    uint256 public dailySpent;
    uint256 public dailyResetAt;
    uint256 public monthlySpent;
    uint256 public monthlyResetAt;

    event AgentSet(address indexed agent, AgentRules rules);
    event AgentRevoked(address indexed previousAgent);
    event Deposited(address indexed from, uint256 amount);
    event OwnerWithdrew(address indexed to, uint256 amount);
    event AgentWithdrew(address indexed to, uint256 amount);

    error NotAgent();
    error AgentPaused();
    error PerTxLimitExceeded();
    error DailyLimitExceeded();
    error MonthlyLimitExceeded();
    error BelowMinBalance();
    error ZeroAmount();
    error ZeroAddress();

    constructor(address initialOwner, address tokenAddress) Ownable(initialOwner) {
        if (tokenAddress == address(0)) revert ZeroAddress();
        token = IERC20(tokenAddress);
    }

    /// @notice Anyone may deposit. Use this to top up the vault from any wallet.
    function deposit(uint256 amount) external {
        if (amount == 0) revert ZeroAmount();
        token.safeTransferFrom(msg.sender, address(this), amount);
        emit Deposited(msg.sender, amount);
    }

    /// @notice Owner can pull funds at any time; no rules apply.
    function ownerWithdraw(address to, uint256 amount) external onlyOwner nonReentrant {
        if (to == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        token.safeTransfer(to, amount);
        emit OwnerWithdrew(to, amount);
    }

    /// @notice Authorize a single agent and set its spending rules. Resets the spend counters.
    function setAgent(address newAgent, AgentRules calldata newRules) external onlyOwner {
        if (newAgent == address(0)) revert ZeroAddress();
        agent = newAgent;
        rules = newRules;
        // Counters reset on new agent so previous spend doesn't bleed into the new authorization.
        dailySpent = 0;
        dailyResetAt = block.timestamp + 1 days;
        monthlySpent = 0;
        monthlyResetAt = block.timestamp + 30 days;
        emit AgentSet(newAgent, newRules);
    }

    /// @notice Update only the rules for the already-authorized agent. Does not reset counters.
    function updateRules(AgentRules calldata newRules) external onlyOwner {
        if (agent == address(0)) revert ZeroAddress();
        rules = newRules;
        emit AgentSet(agent, newRules);
    }

    /// @notice Revoke the agent immediately. Cheaper than setAgent for emergencies.
    function revokeAgent() external onlyOwner {
        address prev = agent;
        agent = address(0);
        rules.active = false;
        emit AgentRevoked(prev);
    }

    /// @notice Pause without revoking the address.
    function pauseAgent() external onlyOwner {
        rules.active = false;
        emit AgentSet(agent, rules);
    }

    /// @notice Unpause an already-authorized agent.
    function unpauseAgent() external onlyOwner {
        if (agent == address(0)) revert ZeroAddress();
        rules.active = true;
        emit AgentSet(agent, rules);
    }

    /// @notice Agent draws funds within the configured limits.
    function agentWithdraw(address to, uint256 amount) external nonReentrant {
        if (msg.sender != agent) revert NotAgent();
        if (!rules.active) revert AgentPaused();
        if (to == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        if (amount > rules.perTxLimit) revert PerTxLimitExceeded();

        _maybeResetCounters();

        if (dailySpent + amount > rules.dailyLimit) revert DailyLimitExceeded();
        if (monthlySpent + amount > rules.monthlyLimit) revert MonthlyLimitExceeded();

        // Check minimum balance is still respected after the withdrawal.
        uint256 balanceBefore = token.balanceOf(address(this));
        if (balanceBefore < amount || balanceBefore - amount < rules.minBalanceThreshold) {
            revert BelowMinBalance();
        }

        dailySpent += amount;
        monthlySpent += amount;

        token.safeTransfer(to, amount);
        emit AgentWithdrew(to, amount);
    }

    /// @notice Current vault balance (helper for the frontend).
    function balance() external view returns (uint256) {
        return token.balanceOf(address(this));
    }

    /// @notice Remaining spend capacity today / this month, after considering counter resets.
    function spendingHeadroom()
        external
        view
        returns (uint256 dailyRemaining, uint256 monthlyRemaining)
    {
        uint256 d = block.timestamp >= dailyResetAt ? 0 : dailySpent;
        uint256 m = block.timestamp >= monthlyResetAt ? 0 : monthlySpent;
        dailyRemaining = rules.dailyLimit > d ? rules.dailyLimit - d : 0;
        monthlyRemaining = rules.monthlyLimit > m ? rules.monthlyLimit - m : 0;
    }

    function _maybeResetCounters() internal {
        if (block.timestamp >= dailyResetAt) {
            dailySpent = 0;
            dailyResetAt = block.timestamp + 1 days;
        }
        if (block.timestamp >= monthlyResetAt) {
            monthlySpent = 0;
            monthlyResetAt = block.timestamp + 30 days;
        }
    }
}
