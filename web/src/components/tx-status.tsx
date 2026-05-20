import { Loader2, CheckCircle2, AlertTriangle, ExternalLink } from "lucide-react";
import { explorerTxUrl, type KiteNetwork } from "../lib/kite-chain";

export type TxState =
  | { kind: "idle" }
  | { kind: "awaiting_signature" }
  | { kind: "pending"; hash: `0x${string}` }
  | { kind: "success"; hash: `0x${string}`; note?: string }
  | { kind: "failed"; error: string };

interface Props {
  state: TxState;
  network: KiteNetwork;
  compact?: boolean;
}

export function TxStatus({ state, network, compact }: Props) {
  if (state.kind === "idle") return null;
  if (state.kind === "awaiting_signature") {
    return (
      <div className="flex items-center gap-2 text-xs text-kite-fg/70">
        <Loader2 className="w-3.5 h-3.5 animate-spin text-kite-primary" /> Confirm in wallet…
      </div>
    );
  }
  if (state.kind === "pending") {
    return (
      <div className="flex items-center gap-2 text-xs text-kite-fg/80">
        <Loader2 className="w-3.5 h-3.5 animate-spin text-kite-primary" />
        <span>Submitted…</span>
        <a
          href={explorerTxUrl(state.hash, network)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 font-mono text-kite-primary hover:text-kite-fg"
        >
          {state.hash.slice(0, 8)}…{state.hash.slice(-6)} <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    );
  }
  if (state.kind === "success") {
    return (
      <div
        className={`flex items-center gap-2 ${compact ? "text-xs" : "text-sm"} px-3 py-2 rounded-md bg-kite-accent/10 border border-kite-accent/30 text-kite-accent`}
      >
        <CheckCircle2 className="w-4 h-4" />
        <span className="font-semibold">{state.note ?? "Confirmed"}</span>
        <a
          href={explorerTxUrl(state.hash, network)}
          target="_blank"
          rel="noreferrer"
          className="ml-auto inline-flex items-center gap-1 font-mono text-xs hover:underline"
        >
          KiteScan <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    );
  }
  return (
    <div className="px-3 py-2 rounded-md bg-kite-destructive/10 border border-kite-destructive/30 text-kite-destructive text-xs">
      <div className="flex items-center gap-2 font-semibold">
        <AlertTriangle className="w-4 h-4" />
        Transaction failed
      </div>
      <p className="text-[11px] font-mono break-all opacity-80 mt-0.5">{state.error}</p>
    </div>
  );
}
