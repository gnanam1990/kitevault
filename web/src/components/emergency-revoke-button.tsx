import { useState } from "react";
import { useWriteContract } from "wagmi";
import { AlertTriangle, X } from "lucide-react";
import { KITE_VAULT_ABI } from "../lib/vault-abi";
import { TxStatus, type TxState } from "./tx-status";
import { AddressDisplay } from "./address-display";
import type { KiteNetwork } from "../lib/kite-chain";

interface Props {
  vaultAddress: `0x${string}`;
  agentAddress: string;
  hasAgent: boolean;
  network: KiteNetwork;
  onRevoked: () => void;
}

export function EmergencyRevokeButton({
  vaultAddress,
  agentAddress,
  hasAgent,
  network,
  onRevoked,
}: Props) {
  const { writeContractAsync } = useWriteContract();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [state, setState] = useState<TxState>({ kind: "idle" });

  if (!hasAgent) return null;

  const confirmed = confirmText.trim().toUpperCase() === "REVOKE";

  const handle = async () => {
    if (!confirmed) return;
    setState({ kind: "awaiting_signature" });
    try {
      const hash = await writeContractAsync({
        address: vaultAddress,
        abi: KITE_VAULT_ABI,
        functionName: "revokeAgent",
        args: [],
      });
      setState({ kind: "success", hash, note: "Agent revoked" });
      setTimeout(() => {
        setOpen(false);
        setConfirmText("");
        onRevoked();
      }, 800);
    } catch (err) {
      const message = err instanceof Error ? err.message.split("\n")[0] : "Unknown error";
      setState({ kind: "failed", error: message });
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full h-11 rounded-lg border border-kite-destructive/40 bg-kite-destructive/10 text-kite-destructive font-semibold text-sm hover:bg-kite-destructive/15 transition-colors inline-flex items-center justify-center gap-1.5"
      >
        <AlertTriangle className="w-4 h-4" />
        Emergency revoke
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6 bg-kite-fg/40 backdrop-blur-sm"
          onClick={() => {
            setOpen(false);
            setConfirmText("");
          }}
        >
          <div
            className="w-full max-w-md bg-kite-card border border-kite-border rounded-2xl shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="px-5 py-4 border-b border-kite-border flex items-center justify-between">
              <h2 className="text-base font-bold tracking-tight text-kite-destructive flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Revoke agent access
              </h2>
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded text-kite-fg/55 hover:bg-kite-muted hover:text-kite-fg"
              >
                <X className="w-5 h-5" />
              </button>
            </header>
            <div className="px-5 py-5 space-y-4">
              <div>
                <p className="text-sm text-kite-fg/80 mb-2">This will:</p>
                <ul className="text-xs text-kite-fg/70 space-y-1 list-disc list-inside">
                  <li>Set agent address to <span className="font-mono">0x0…0</span></li>
                  <li>Pause future agent withdrawals immediately</li>
                  <li>Leave the vault and your funds intact</li>
                </ul>
              </div>
              <div className="px-3 py-2 rounded-md bg-kite-muted/70 border border-kite-border">
                <div className="text-[10px] uppercase tracking-widest text-kite-fg/55 font-bold mb-1">
                  Current agent
                </div>
                <AddressDisplay address={agentAddress} network={network} />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-widest text-kite-fg/55 font-semibold mb-1.5">
                  Type <code className="font-mono text-kite-destructive">REVOKE</code> to confirm
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  className="w-full bg-kite-bg border border-kite-border focus:border-kite-destructive focus:outline-none rounded-md px-3 py-2 text-sm font-mono text-kite-fg"
                />
              </div>
              <button
                onClick={handle}
                disabled={!confirmed || state.kind === "awaiting_signature" || state.kind === "pending"}
                className="w-full h-11 rounded-lg bg-kite-destructive text-kite-bg font-semibold text-sm hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
              >
                Revoke now
              </button>
              <TxStatus state={state} network={network} compact />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
