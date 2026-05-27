import { useEffect, useState } from "react";
import { useAccount, useReadContracts, useChainId, useSwitchChain } from "wagmi";
import { Loader2, Plus, ArrowDownToLine, Settings, AlertTriangle, Pause, Play } from "lucide-react";
import { useWriteContract } from "wagmi";

import { KITE_VAULT_ABI, ERC20_ABI } from "../lib/vault-abi";
import { kiteMainnet, kiteTestnet, type KiteNetwork } from "../lib/kite-chain";
import { AddressDisplay } from "./address-display";
import { SpendTracker } from "./spend-tracker";
import { DepositForm } from "./deposit-form";
import { WithdrawForm } from "./withdraw-form";
import { AgentRulesEditor, type Rules } from "./agent-rules-editor";
import { EmergencyRevokeButton } from "./emergency-revoke-button";
import { PreviewBadge } from "./preview-badge";
import { TxStatus, type TxState } from "./tx-status";
import { WalletConnectButton } from "./wallet-connect-button";
import { formatAmount } from "../lib/format";

interface Props {
  vaultAddress: `0x${string}`;
  network: KiteNetwork;
}

const ZERO = "0x0000000000000000000000000000000000000000";

export function VaultDashboard({ vaultAddress, network }: Props) {
  const { address: connected, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const targetChainId = network === "mainnet" ? kiteMainnet.id : kiteTestnet.id;
  const { writeContractAsync } = useWriteContract();

  const [editorOpen, setEditorOpen] = useState(false);
  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [pauseState, setPauseState] = useState<TxState>({ kind: "idle" });
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  const { data: contractsData, isLoading, refetch } = useReadContracts({
    contracts: [
      { address: vaultAddress, abi: KITE_VAULT_ABI, functionName: "owner" },
      { address: vaultAddress, abi: KITE_VAULT_ABI, functionName: "token" },
      { address: vaultAddress, abi: KITE_VAULT_ABI, functionName: "agent" },
      { address: vaultAddress, abi: KITE_VAULT_ABI, functionName: "rules" },
      { address: vaultAddress, abi: KITE_VAULT_ABI, functionName: "balance" },
      { address: vaultAddress, abi: KITE_VAULT_ABI, functionName: "spendingHeadroom" },
      { address: vaultAddress, abi: KITE_VAULT_ABI, functionName: "dailySpent" },
      { address: vaultAddress, abi: KITE_VAULT_ABI, functionName: "monthlySpent" },
    ],
    query: { refetchInterval: 15_000 },
  });

  useEffect(() => {
    refetch();
  }, [refetchTrigger, refetch]);

  // Read token metadata
  const tokenAddress = contractsData?.[1]?.result as `0x${string}` | undefined;
  const { data: tokenMeta } = useReadContracts({
    contracts: tokenAddress
      ? [
          { address: tokenAddress, abi: ERC20_ABI, functionName: "symbol" },
          { address: tokenAddress, abi: ERC20_ABI, functionName: "decimals" },
        ]
      : [],
    query: { enabled: !!tokenAddress },
  });

  const ownerAddr = contractsData?.[0]?.result as string | undefined;
  const agentAddr = (contractsData?.[2]?.result as string | undefined) ?? ZERO;
  const rulesTuple = contractsData?.[3]?.result as readonly [bigint, bigint, bigint, bigint, boolean] | undefined;
  const balance = (contractsData?.[4]?.result as bigint | undefined) ?? 0n;
  const dailySpent = (contractsData?.[6]?.result as bigint | undefined) ?? 0n;
  const monthlySpent = (contractsData?.[7]?.result as bigint | undefined) ?? 0n;

  const symbol = (tokenMeta?.[0]?.result as string | undefined) ?? "TOKEN";
  const decimals = (tokenMeta?.[1]?.result as number | undefined) ?? 18;

  const isOwner = isConnected && connected && ownerAddr && connected.toLowerCase() === ownerAddr.toLowerCase();
  const hasAgent = agentAddr !== ZERO;

  const rules: Rules | null = rulesTuple
    ? {
        dailyLimit: rulesTuple[0],
        monthlyLimit: rulesTuple[1],
        perTxLimit: rulesTuple[2],
        minBalanceThreshold: rulesTuple[3],
        active: rulesTuple[4],
      }
    : null;

  if (isLoading || !rules || !ownerAddr) {
    return (
      <div className="flex items-center gap-2 text-sm text-kite-fg/55 px-4 py-16 justify-center">
        <Loader2 className="w-4 h-4 animate-spin text-kite-primary" /> Loading vault…
      </div>
    );
  }

  const onChainSelectMatches = chainId === targetChainId;
  const refresh = () => setRefetchTrigger((n) => n + 1);

  const handlePauseToggle = async () => {
    setPauseState({ kind: "awaiting_signature" });
    try {
      if (!onChainSelectMatches) {
        await switchChainAsync({ chainId: targetChainId });
      }
      const hash = await writeContractAsync({
        address: vaultAddress,
        abi: KITE_VAULT_ABI,
        functionName: rules.active ? "pauseAgent" : "unpauseAgent",
        args: [],
      });
      setPauseState({ kind: "success", hash, note: rules.active ? "Paused" : "Unpaused" });
      setTimeout(refresh, 600);
    } catch (err) {
      const message = err instanceof Error ? err.message.split("\n")[0] : "Unknown error";
      setPauseState({ kind: "failed", error: message });
    }
  };

  return (
    <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      {/* Vault header */}
      <header className="mb-6">
        <div className="text-xs uppercase tracking-widest text-kite-fg/45 font-bold mb-1">
          Vault
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-kite-fg mb-2">
          <AddressDisplay address={vaultAddress} network={network} className="text-2xl sm:text-3xl" />
        </h1>
        <div className="text-xs text-kite-fg/60 flex items-center gap-3 flex-wrap">
          <span>
            Owner: <AddressDisplay address={ownerAddr} network={network} className="text-xs" />
          </span>
          {isOwner && (
            <span className="px-1.5 py-0.5 rounded bg-kite-primary/15 text-kite-primary text-[10px] font-bold uppercase tracking-widest">
              You're the owner
            </span>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6">
        {/* Main column */}
        <div className="space-y-5">
          {/* Balance card */}
          <section className="bg-kite-card border border-kite-border rounded-2xl p-6 shadow-sm">
            <div className="text-[10px] uppercase tracking-widest font-bold text-kite-fg/55 mb-1">
              Vault balance
            </div>
            <div className="font-mono font-bold text-4xl sm:text-5xl tracking-tight text-kite-fg tabular-nums">
              {formatAmount(balance, decimals, 4)}
              <span className="text-kite-fg/45 text-2xl sm:text-3xl ml-2 font-medium">{symbol}</span>
            </div>
          </section>

          {/* Agent card */}
          <section className="bg-kite-card border border-kite-border rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-kite-fg tracking-tight">Agent</h2>
              {hasAgent && (
                <span
                  className={`text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded ${
                    rules.active
                      ? "bg-kite-accent/15 text-kite-accent"
                      : "bg-kite-muted text-kite-fg/55"
                  }`}
                >
                  {rules.active ? "Active" : "Paused"}
                </span>
              )}
            </div>

            {!hasAgent ? (
              <div className="text-sm text-kite-fg/60">
                No agent authorized. {isOwner ? "Set one to let an agent spend within your limits." : ""}
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-kite-fg/45 font-bold mb-1">
                    Authorized address
                  </div>
                  <AddressDisplay address={agentAddr} network={network} />
                </div>
                <div className="space-y-3">
                  <SpendTracker label="Today" spent={dailySpent} cap={rules.dailyLimit} decimals={decimals} symbol={symbol} />
                  <SpendTracker label="This month" spent={monthlySpent} cap={rules.monthlyLimit} decimals={decimals} symbol={symbol} />
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <Stat label="Per-tx limit" value={`${formatAmount(rules.perTxLimit, decimals)} ${symbol}`} />
                  <Stat label="Min balance" value={`${formatAmount(rules.minBalanceThreshold, decimals)} ${symbol}`} />
                </div>
              </div>
            )}
          </section>

          {/* Activity placeholder */}
          <section className="bg-kite-card/60 border border-kite-border rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-sm font-bold text-kite-fg tracking-tight">Activity</h2>
              <PreviewBadge
                label="Activity"
                tooltip="On-chain event indexing arrives in v0.2. For now, view this vault on KiteScan."
              />
            </div>
            <p className="text-xs text-kite-fg/55 leading-relaxed">
              v0.2 will surface deposits, agent withdrawals, rule changes, pauses, and revokes
              in-app via KiteScan event polling. For v0.1, all events are emitted by the contract —
              you can read them on KiteScan directly.
            </p>
          </section>
        </div>

        {/* Sidebar */}
        <aside className="space-y-4 self-start lg:sticky lg:top-20">
          {isOwner && (
            <>
              <section className="bg-kite-card border border-kite-border rounded-2xl p-5 shadow-sm space-y-2">
                <button
                  onClick={() => setDepositOpen((v) => !v)}
                  className="w-full h-10 rounded-lg bg-kite-primary text-kite-bg font-semibold text-sm hover:bg-kite-primary/90 transition-colors inline-flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Deposit
                </button>
                <button
                  onClick={() => setWithdrawOpen((v) => !v)}
                  className="w-full h-10 rounded-lg border border-kite-border bg-kite-bg text-kite-fg font-semibold text-sm hover:bg-kite-muted transition-colors inline-flex items-center justify-center gap-1.5"
                >
                  <ArrowDownToLine className="w-3.5 h-3.5" />
                  Owner withdraw
                </button>
                <button
                  onClick={() => setEditorOpen(true)}
                  className="w-full h-10 rounded-lg border border-kite-border bg-kite-bg text-kite-fg font-semibold text-sm hover:bg-kite-muted transition-colors inline-flex items-center justify-center gap-1.5"
                >
                  <Settings className="w-3.5 h-3.5" />
                  {hasAgent ? "Edit rules" : "Set agent + rules"}
                </button>
                {hasAgent && (
                  <button
                    onClick={handlePauseToggle}
                    className="w-full h-10 rounded-lg border border-kite-border bg-kite-bg text-kite-fg font-semibold text-sm hover:bg-kite-muted transition-colors inline-flex items-center justify-center gap-1.5"
                  >
                    {rules.active ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    {rules.active ? "Pause agent" : "Unpause agent"}
                  </button>
                )}
                <TxStatus state={pauseState} network={network} compact />
              </section>

              {depositOpen && tokenAddress && (
                <section className="bg-kite-card border border-kite-border rounded-2xl p-5 shadow-sm">
                  <h3 className="text-sm font-bold text-kite-fg tracking-tight mb-3">Deposit</h3>
                  <DepositForm
                    vaultAddress={vaultAddress}
                    tokenAddress={tokenAddress}
                    tokenDecimals={decimals}
                    tokenSymbol={symbol}
                    network={network}
                    onSuccess={refresh}
                  />
                </section>
              )}

              {withdrawOpen && (
                <section className="bg-kite-card border border-kite-border rounded-2xl p-5 shadow-sm">
                  <h3 className="text-sm font-bold text-kite-fg tracking-tight mb-3">
                    Owner withdraw
                  </h3>
                  <WithdrawForm
                    vaultAddress={vaultAddress}
                    tokenDecimals={decimals}
                    tokenSymbol={symbol}
                    network={network}
                    defaultRecipient={connected ?? ""}
                    onSuccess={refresh}
                  />
                </section>
              )}

              <section className="bg-kite-card border border-kite-border rounded-2xl p-5 shadow-sm">
                <h3 className="text-sm font-bold text-kite-destructive tracking-tight mb-3 flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" /> Emergency
                </h3>
                <EmergencyRevokeButton
                  vaultAddress={vaultAddress}
                  agentAddress={agentAddr}
                  hasAgent={hasAgent}
                  network={network}
                  onRevoked={refresh}
                />
                {!hasAgent && (
                  <p className="text-xs text-kite-fg/55 mt-2">
                    No agent set — nothing to revoke.
                  </p>
                )}
              </section>
            </>
          )}

          {!isOwner && (
            <section className="bg-kite-card border border-kite-border rounded-2xl p-5 shadow-sm">
              <h3 className="text-sm font-bold text-kite-fg tracking-tight mb-2">View-only</h3>
              <p className="text-xs text-kite-fg/65 leading-relaxed mb-3">
                You're not the owner of this vault. Connect with the owner address to deposit,
                withdraw, or edit agent rules.
              </p>
              {!isConnected && <WalletConnectButton />}
            </section>
          )}
        </aside>
      </div>

      {editorOpen && (
        <AgentRulesEditor
          vaultAddress={vaultAddress}
          network={network}
          decimals={decimals}
          symbol={symbol}
          initialAgent={agentAddr}
          initialRules={rules}
          onClose={() => setEditorOpen(false)}
          onSaved={() => {
            setEditorOpen(false);
            refresh();
          }}
        />
      )}
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-kite-bg border border-kite-border rounded-md px-3 py-2">
      <div className="text-[10px] uppercase tracking-widest text-kite-fg/45 font-bold mb-0.5">
        {label}
      </div>
      <div className="font-mono text-sm text-kite-fg/85 tabular-nums">{value}</div>
    </div>
  );
}
