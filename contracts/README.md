# `kitevault/contracts`

Foundry-based smart contracts for KiteVault.

> ⚠️ **EXPERIMENTAL — UNAUDITED.** Do not deploy to Kite Mainnet without an external audit. v0.1 is testnet-only.

## Contracts

| File                          | What it is                                          |
| ----------------------------- | --------------------------------------------------- |
| `src/KiteVault.sol`           | The vault. One owner, one optional agent, one ERC-20. Daily/monthly/per-tx caps + min-balance threshold. |
| `src/VaultFactory.sol`        | Creates per-owner-per-token vaults; deduplicates.   |
| `test/KiteVault.t.sol`        | Foundry tests for the vault state machine.          |
| `test/VaultFactory.t.sol`     | Foundry tests for the factory.                      |
| `script/Deploy.s.sol`         | Deploys the factory. **Testnet only until audited.** |

## Quickstart

```bash
# install deps (first time)
forge install OpenZeppelin/openzeppelin-contracts --no-commit
forge install foundry-rs/forge-std --no-commit

forge build
forge test -vvv
forge coverage     # aim for ≥ 90% line coverage on src/
```

## Deploy to Kite Testnet

```bash
export PRIVATE_KEY=0x...   # a testnet wallet, NOT your mainnet keys
forge script script/Deploy.s.sol \
  --rpc-url https://rpc-testnet.gokite.ai \
  --broadcast \
  --private-key $PRIVATE_KEY
```

Then plug the printed factory address into `web/src/lib/contracts.ts`.

## What's NOT here yet (v0.2)

- Slither static analysis pipeline in CI
- Multi-token vault variants
- Timelock on owner actions
- kpass session signature support (currently agent is a plain EOA)
- Allowance whitelist (only let agents withdraw to pre-approved recipients)
- Gas optimization pass

## Threat model

The owner is fully trusted. The contract protects the **owner's funds** from a compromised agent (within the configured caps) — not the agent from the owner. If the owner key is compromised, all funds in the vault are at risk: the attacker can `ownerWithdraw` immediately or replace the agent with an attacker-controlled one.

Future work: optional multi-sig owner, recovery agent for owner-key loss, timelocks.
