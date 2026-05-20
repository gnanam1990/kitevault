import { useState } from "react";
import { parseUnits } from "viem";
import { useWriteContract } from "wagmi";
import { X } from "lucide-react";
import { KITE_VAULT_ABI } from "../lib/vault-abi";
import { TxStatus, type TxState } from "./tx-status";
import { isValidAddress, type KiteNetwork } from "../lib/kite-chain";
import { formatAmount } from "../lib/format";

export interface Rules {
  dailyLimit: bigint;
  monthlyLimit: bigint;
  perTxLimit: bigint;
  minBalanceThreshold: bigint;
  active: boolean;
}

interface Props {
  vaultAddress: `0x${string}`;
  network: KiteNetwork;
  decimals: number;
  symbol: string;
  initialAgent: string;
  initialRules: Rules;
  onClose: () => void;
  onSaved: () => void;
}

export function AgentRulesEditor({
  vaultAddress,
  network,
  decimals,
  symbol,
  initialAgent,
  initialRules,
  onClose,
  onSaved,
}: Props) {
  const { writeContractAsync } = useWriteContract();
  const [agentAddress, setAgentAddress] = useState(initialAgent);
  const [dailyLimit, setDailyLimit] = useState(formatAmount(initialRules.dailyLimit, decimals));
  const [monthlyLimit, setMonthlyLimit] = useState(formatAmount(initialRules.monthlyLimit, decimals));
  const [perTxLimit, setPerTxLimit] = useState(formatAmount(initialRules.perTxLimit, decimals));
  const [minBalance, setMinBalance] = useState(formatAmount(initialRules.minBalanceThreshold, decimals));
  const [active, setActive] = useState(initialRules.active);
  const [state, setState] = useState<TxState>({ kind: "idle" });

  const agentError = agentAddress && !isValidAddress(agentAddress) ? "Invalid address" : null;
  const canSave =
    !agentError &&
    dailyLimit &&
    monthlyLimit &&
    perTxLimit &&
    isValidAddress(agentAddress) &&
    state.kind !== "awaiting_signature" &&
    state.kind !== "pending";

  const handle = async () => {
    if (!canSave) return;
    setState({ kind: "awaiting_signature" });
    try {
      const rules = {
        dailyLimit: parseUnits(dailyLimit, decimals),
        monthlyLimit: parseUnits(monthlyLimit, decimals),
        perTxLimit: parseUnits(perTxLimit, decimals),
        minBalanceThreshold: parseUnits(minBalance || "0", decimals),
        active,
      };
      const isSameAgent =
        initialAgent.toLowerCase() === agentAddress.toLowerCase() &&
        initialAgent !== "0x0000000000000000000000000000000000000000";
      const hash = isSameAgent
        ? await writeContractAsync({
            address: vaultAddress,
            abi: KITE_VAULT_ABI,
            functionName: "updateRules",
            args: [rules],
          })
        : await writeContractAsync({
            address: vaultAddress,
            abi: KITE_VAULT_ABI,
            functionName: "setAgent",
            args: [agentAddress as `0x${string}`, rules],
          });
      setState({ kind: "success", hash, note: "Rules saved" });
      setTimeout(onSaved, 600);
    } catch (err) {
      const message = err instanceof Error ? err.message.split("\n")[0] : "Unknown error";
      setState({ kind: "failed", error: message });
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6 bg-kite-fg/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md max-h-full overflow-auto bg-kite-card border border-kite-border rounded-2xl shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="px-5 py-4 border-b border-kite-border flex items-center justify-between">
          <h2 className="text-base font-bold tracking-tight text-kite-fg">Agent rules</h2>
          <button
            onClick={onClose}
            className="p-1 rounded text-kite-fg/55 hover:bg-kite-muted hover:text-kite-fg"
          >
            <X className="w-5 h-5" />
          </button>
        </header>
        <div className="px-5 py-5 space-y-3">
          <Field
            label="Agent address"
            error={agentError}
            value={agentAddress}
            onChange={setAgentAddress}
            mono
            placeholder="0x…"
          />
          <Field
            label={`Per-tx limit (${symbol})`}
            value={perTxLimit}
            onChange={setPerTxLimit}
            mono
          />
          <Field
            label={`Daily cap (${symbol})`}
            value={dailyLimit}
            onChange={setDailyLimit}
            mono
          />
          <Field
            label={`Monthly cap (${symbol})`}
            value={monthlyLimit}
            onChange={setMonthlyLimit}
            mono
          />
          <Field
            label={`Pause if balance drops below (${symbol})`}
            value={minBalance}
            onChange={setMinBalance}
            mono
          />
          <label className="flex items-center gap-2 text-sm text-kite-fg/80">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="w-4 h-4 accent-kite-primary"
            />
            Agent is active (can withdraw within these rules)
          </label>

          <p className="text-xs text-kite-fg/55 border border-kite-border rounded-md p-2 bg-kite-muted/50 leading-relaxed">
            Agent can spend up to{" "}
            <strong className="font-mono text-kite-fg">{perTxLimit || "—"}</strong> per tx,{" "}
            <strong className="font-mono text-kite-fg">{dailyLimit || "—"}</strong> /day,{" "}
            <strong className="font-mono text-kite-fg">{monthlyLimit || "—"}</strong> /month. Pauses
            if vault balance drops below{" "}
            <strong className="font-mono text-kite-fg">{minBalance || "0"}</strong> {symbol}.
          </p>

          <button
            onClick={handle}
            disabled={!canSave}
            className="w-full h-11 rounded-lg bg-kite-primary text-kite-bg font-semibold text-sm hover:bg-kite-primary/90 disabled:opacity-50 transition-colors"
          >
            Save rules
          </button>
          <TxStatus state={state} network={network} compact />
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  error,
  mono,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string | null;
  mono?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-[11px] uppercase tracking-widest text-kite-fg/55 font-semibold mb-1">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full bg-kite-bg border border-kite-border focus:border-kite-primary focus:outline-none rounded-md px-3 py-2 text-sm ${
          mono ? "font-mono" : ""
        } text-kite-fg`}
      />
      {error && <p className="text-xs text-kite-destructive mt-1">{error}</p>}
    </div>
  );
}
