import { formatUnits } from "viem";

export function formatAmount(raw: bigint, decimals: number, maxFrac = 4): string {
  return parseFloat(formatUnits(raw, decimals)).toLocaleString("en-US", {
    maximumFractionDigits: maxFrac,
  });
}

export function shortAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function relativeFromUnix(timestamp: bigint | number): string {
  const sec = typeof timestamp === "bigint" ? Number(timestamp) : timestamp;
  const diff = Math.floor(Date.now() / 1000) - sec;
  const abs = Math.abs(diff);
  if (abs < 60) return diff >= 0 ? `${abs}s ago` : `in ${abs}s`;
  const min = Math.round(abs / 60);
  if (abs < 3600) return diff >= 0 ? `${min}m ago` : `in ${min}m`;
  const hr = Math.round(abs / 3600);
  if (abs < 86400) return diff >= 0 ? `${hr}h ago` : `in ${hr}h`;
  const day = Math.round(abs / 86400);
  return diff >= 0 ? `${day}d ago` : `in ${day}d`;
}
