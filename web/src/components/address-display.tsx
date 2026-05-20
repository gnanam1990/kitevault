import { useState } from "react";
import { Copy, Check, ExternalLink } from "lucide-react";
import { explorerAddressUrl, type KiteNetwork } from "../lib/kite-chain";
import { shortAddress } from "../lib/format";

interface Props {
  address: string;
  className?: string;
  network?: KiteNetwork;
  link?: boolean;
}

export function AddressDisplay({ address, className = "", network = "testnet", link = true }: Props) {
  const [copied, setCopied] = useState(false);

  const copy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <span className={`inline-flex items-center gap-1.5 font-mono text-sm ${className}`}>
      <span className="text-kite-fg/85">{shortAddress(address)}</span>
      <button
        onClick={copy}
        className="p-0.5 rounded text-kite-fg/40 hover:text-kite-fg hover:bg-kite-muted transition-colors"
        title="Copy"
      >
        {copied ? <Check className="w-3 h-3 text-kite-accent" /> : <Copy className="w-3 h-3" />}
      </button>
      {link && (
        <a
          href={explorerAddressUrl(address, network)}
          target="_blank"
          rel="noreferrer"
          className="text-kite-fg/40 hover:text-kite-fg"
          title="View on KiteScan"
        >
          <ExternalLink className="w-3 h-3" />
        </a>
      )}
    </span>
  );
}
