import { Loader2, LogOut, Wallet } from "lucide-react";
import { useAccount, useConnect, useDisconnect } from "wagmi";

function shortAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

interface Props {
  label?: string;
  compact?: boolean;
}

export function WalletConnectButton({ label = "Connect wallet", compact = false }: Props) {
  const { address, isConnected } = useAccount();
  const { connectAsync, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const connector = connectors[0];

  if (isConnected && address) {
    return (
      <button
        type="button"
        onClick={() => disconnect()}
        title="Disconnect wallet"
        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-kite-border bg-kite-card px-3 text-xs font-semibold text-kite-fg transition-colors hover:border-kite-primary hover:text-kite-primary"
      >
        <LogOut className="h-3.5 w-3.5" />
        <span className={compact ? "hidden sm:inline" : ""}>{shortAddress(address)}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => connector && void connectAsync({ connector })}
      disabled={!connector || isPending}
      title={connector ? label : "Install a browser wallet to connect"}
      className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-kite-primary px-3 text-xs font-semibold text-kite-bg transition-colors hover:bg-kite-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wallet className="h-3.5 w-3.5" />}
      <span className={compact ? "hidden sm:inline" : ""}>{isPending ? "Connecting..." : label}</span>
    </button>
  );
}
