import { useState } from "react";
import { parseUnits } from "viem";
import { useWriteContract } from "wagmi";
import { KITE_VAULT_ABI } from "../lib/vault-abi";
import { TxStatus, type TxState } from "./tx-status";
import type { KiteNetwork } from "../lib/kite-chain";

interface Props {
  vaultAddress: `0x${string}`;
  tokenDecimals: number;
  tokenSymbol: string;
  network: KiteNetwork;
  defaultRecipient: string;
  onSuccess: () => void;
}

export function WithdrawForm({
  vaultAddress,
  tokenDecimals,
  tokenSymbol,
  network,
  defaultRecipient,
  onSuccess,
}: Props) {
  const { writeContractAsync } = useWriteContract();
  const [amount, setAmount] = useState("");
  const [to, setTo] = useState(defaultRecipient);
  const [state, setState] = useState<TxState>({ kind: "idle" });

  const handle = async () => {
    if (!amount || !to) return;
    setState({ kind: "awaiting_signature" });
    try {
      const raw = parseUnits(amount, tokenDecimals);
      const hash = await writeContractAsync({
        address: vaultAddress,
        abi: KITE_VAULT_ABI,
        functionName: "ownerWithdraw",
        args: [to as `0x${string}`, raw],
      });
      setState({ kind: "success", hash, note: "Withdrew" });
      onSuccess();
    } catch (err) {
      const message =
        err instanceof Error ? err.message.split("\n")[0] : "Unknown error";
      setState({ kind: "failed", error: message });
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-[11px] uppercase tracking-widest text-kite-fg/55 font-semibold mb-1.5">
          Amount
        </label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          step="any"
          min="0"
          className="w-full bg-kite-bg border border-kite-border focus:border-kite-primary focus:outline-none rounded-md px-3 py-2 text-sm font-mono text-kite-fg"
        />
      </div>
      <div>
        <label className="block text-[11px] uppercase tracking-widest text-kite-fg/55 font-semibold mb-1.5">
          Recipient
        </label>
        <input
          type="text"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="w-full bg-kite-bg border border-kite-border focus:border-kite-primary focus:outline-none rounded-md px-3 py-2 text-sm font-mono text-kite-fg"
        />
      </div>
      <button
        onClick={handle}
        disabled={!amount || !to || state.kind === "awaiting_signature" || state.kind === "pending"}
        className="w-full h-10 rounded-lg bg-kite-primary text-kite-bg font-semibold text-sm hover:bg-kite-primary/90 disabled:opacity-50 transition-colors"
      >
        Withdraw {amount || "—"} {tokenSymbol}
      </button>
      <TxStatus state={state} network={network} compact />
    </div>
  );
}
