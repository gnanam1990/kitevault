import { AlertTriangle } from "lucide-react";

interface Props {
  variant?: "default" | "mainnet";
}

export function AuditWarningBanner({ variant = "default" }: Props) {
  const isMainnet = variant === "mainnet";
  return (
    <div
      className={`border-b ${
        isMainnet
          ? "bg-kite-destructive/15 border-kite-destructive/40"
          : "bg-kite-destructive/8 border-kite-destructive/25"
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-start gap-2 text-xs text-kite-destructive leading-relaxed">
        <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <p>
          <strong className="font-bold tracking-wide">
            {isMainnet ? "Mainnet selected — extra danger." : "KiteVault is experimental, unaudited."}
          </strong>{" "}
          {isMainnet
            ? "v0.1 contracts are NOT audited. We strongly discourage holding real funds on mainnet until an external audit is complete."
            : "v0.1 contracts have NOT been externally audited. Use on testnet first. Don't deposit funds you can't afford to lose."}
        </p>
      </div>
    </div>
  );
}
