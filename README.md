# KiteVault

Programmable non-custodial vaults for AI agents on the [Kite](https://gokite.ai) blockchain. Sister project to [AgentID](https://agentid-seven.vercel.app), [KiteLeaderboard](https://kiteleaderboard.vercel.app), [KitePay](https://github.com/gnanam1990/kitepay), [KiteIndex Lite](https://github.com/gnanam1990/kiteindex-lite), [KiteSubs](https://github.com/gnanam1990/kitesubs), and [AgentMarket](https://github.com/gnanam1990/agentmarket).

> ⚠️ **EXPERIMENTAL. UNAUDITED.** v0.1 ships testnet-only. Do **not** deposit real funds on mainnet until an external audit is complete.

The idea: hold USDC.e (or any ERC-20) in a contract you own. Authorize one **agent** address with rules — daily cap, monthly cap, per-tx limit, minimum vault balance. The agent calls `agentWithdraw(to, amount)`; the contract validates against your rules before transferring. You can pause, revoke, edit rules, or withdraw everything at any time.

## Monorepo

| Package           | What it is                              | Status                  |
| ----------------- | --------------------------------------- | ----------------------- |
| `contracts/`      | Foundry: `KiteVault.sol` + `VaultFactory.sol` + tests | **21 tests pass** locally. Testnet only. |
| `web/`            | Vite + React + wagmi + RainbowKit dashboard | Ships v0.1              |

## Live deployment

- Web app: <https://kitevault.vercel.app>
- Host: Vercel (`kitevault`)
- Deployed package: `web`
- Build: `pnpm build`
- Output: `dist`

The hosted dashboard is live. Vault creation requires the relevant `VITE_VAULT_FACTORY_*` environment variable to point at a deployed factory. Contracts are testnet-only and unaudited in v0.1.

## Quickstart

### Contracts

```bash
cd contracts
git submodule update --init --recursive   # if cloning fresh
forge build
forge test -vvv
```

To deploy to Kite Testnet:

```bash
cd contracts
export PRIVATE_KEY=0x...   # testnet wallet, NOT mainnet keys
forge script script/Deploy.s.sol \
  --rpc-url https://rpc-testnet.gokite.ai \
  --broadcast \
  --private-key $PRIVATE_KEY
```

Note the printed factory address and set it as `VITE_VAULT_FACTORY_TESTNET` for the web app.

### Web

```bash
cd web
pnpm install
echo "VITE_VAULT_FACTORY_TESTNET=0xYourFactoryAddress" > .env.local
pnpm dev   # http://localhost:3060
```

Without `VITE_VAULT_FACTORY_TESTNET`, the "Create vault" button is disabled (with a clear message). You can still open an existing vault by pasting its address.

## Honest disclaimers

These are non-negotiable until audited:

- **The contracts have not been externally audited.** v0.1 is for testnet experimentation only.
- **The contract protects against a compromised agent within the configured caps.** It does NOT protect against a compromised owner key.
- **No timelocks on owner actions** in v0.1. Owner can revoke / change rules / withdraw instantly. This is the right call for emergencies but means a stolen owner key drains the vault immediately.
- **No allowance whitelist** — the agent can withdraw to any recipient. v0.2 will add an optional `allowedRecipients` list.

The UI shows a persistent warning banner on every page. The mainnet network toggle additionally shows a louder banner.

## v0.1 contract surface

```solidity
function deposit(uint256 amount) external;
function ownerWithdraw(address to, uint256 amount) external onlyOwner;
function setAgent(address newAgent, AgentRules calldata newRules) external onlyOwner;
function updateRules(AgentRules calldata newRules) external onlyOwner;
function revokeAgent() external onlyOwner;
function pauseAgent() external onlyOwner;
function unpauseAgent() external onlyOwner;
function agentWithdraw(address to, uint256 amount) external;

// views
function balance() external view returns (uint256);
function spendingHeadroom() external view returns (uint256 dailyRemaining, uint256 monthlyRemaining);
```

Rules struct:

```solidity
struct AgentRules {
  uint256 dailyLimit;
  uint256 monthlyLimit;
  uint256 perTxLimit;
  uint256 minBalanceThreshold;
  bool active;
}
```

## v0.2 roadmap

- External audit (required for mainnet)
- Allowance whitelist (only let agents withdraw to pre-approved recipients)
- Optional timelock on owner actions
- kpass session signatures (agent uses session sig instead of EOA)
- Multi-sig owner option (Safe integration)
- On-chain activity feed (Ponder/KiteIndex Lite integration)
- Recovery agent for owner-key loss

## Threat model — short

| Threat                                        | v0.1 mitigation                                   |
| --------------------------------------------- | ------------------------------------------------- |
| Agent key compromised                         | Caps + min balance + emergency revoke (single tx) |
| Owner key compromised                         | Not mitigated. Future: multi-sig + timelock.      |
| Reentrancy on `agentWithdraw` / `ownerWithdraw` | `ReentrancyGuard` + checks-effects-interactions  |
| Counter wraparound at year boundaries          | `block.timestamp` resets are sliding-window, not calendar — no fixed-boundary edge case |
| Agent draws on exactly the threshold          | Checks `balance - amount < threshold` (strict)    |
