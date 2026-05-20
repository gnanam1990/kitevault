import { formatAmount } from "../lib/format";

interface Props {
  label: string;
  spent: bigint;
  cap: bigint;
  decimals: number;
  symbol: string;
}

export function SpendTracker({ label, spent, cap, decimals, symbol }: Props) {
  const pct = cap > 0n ? Math.min(100, Number((spent * 1000n) / cap) / 10) : 0;
  const isOver = cap > 0n && spent >= cap;
  const isNear = pct >= 80 && !isOver;
  const barColor = isOver ? "bg-kite-destructive" : isNear ? "bg-kite-primary" : "bg-kite-accent";
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-[10px] uppercase tracking-widest font-bold text-kite-fg/55">
          {label}
        </span>
        <span className="font-mono text-xs text-kite-fg/75 tabular-nums">
          {formatAmount(spent, decimals)} / {formatAmount(cap, decimals)} {symbol}
        </span>
      </div>
      <div className="h-2 rounded-full bg-kite-muted overflow-hidden">
        <div
          className={`h-full ${barColor} transition-all duration-300`}
          style={{ width: `${Math.max(2, pct)}%` }}
        />
      </div>
    </div>
  );
}
