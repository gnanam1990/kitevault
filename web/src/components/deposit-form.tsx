import { useState } from "react";
import { parseUnits } from "viem";
import { useAccount, useWriteContract, useReadContract } from "wagmi";
import { KITE_VAULT_ABI, ERC20_ABI } from "../lib/vault-abi";
import { TxStatus, type TxState } from "./tx-status";
import { WalletConnectButton } from "./wallet-connect-button";
import type { KiteNetwork } from "../lib/kite-chain";

interface Props {
  vaultAddress: `0x${string}`;
  tokenAddress: `0x${string}`;
  tokenDecimals: number;
  tokenSymbol: string;
  network: KiteNetwork;
  onSuccess: () => void;
}

export function DepositForm({
  vaultAddress,
  tokenAddress,
  tokenDecimals,
  tokenSymbol,
  network,
  onSuccess,
}: Props) {
  const { isConnected, address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const [amount, setAmount] = useState("");
  const [state, setState] = useState<TxState>({ kind: "idle" });

  const { data: allowance } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address ? [address, vaultAddress] : undefined,
    query: { enabled: !!address },
  });

  const handle = async () => {
    if (!amount) return;
    setState({ kind: "awaiting_signature" });
    try {
      const raw = parseUnits(amount, tokenDecimals);
      const currentAllowance = (allowance as bigint | undefined) ?? 0n;
      if (currentAllowance < raw) {
        const approveHash = await writeContractAsync({
          address: tokenAddress,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [vaultAddress, raw],
        });
        setState({ kind: "pending", hash: approveHash });
      }
      const hash = await writeContractAsync({
        address: vaultAddress,
        abi: KITE_VAULT_ABI,
        functionName: "deposit",
        args: [raw],
      });
      setState({ kind: "success", hash, note: "Deposit confirmed" });
      onSuccess();
    } catch (err) {
      const message =
        err instanceof Error ? err.message.split("\n")[0] : "Unknown error";
      setState({ kind: "failed", error: message });
    }
  };

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center gap-2">
        <p className="text-xs text-kite-fg/60">Connect a wallet to deposit</p>
        <WalletConnectButton label="Connect" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-[11px] uppercase tracking-widest text-kite-fg/55 font-semibold mb-1.5">
          Amount to deposit
        </label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="100.00"
          step="any"
          min="0"
          className="w-full bg-kite-bg border border-kite-border focus:border-kite-primary focus:outline-none rounded-md px-3 py-2 text-sm font-mono text-kite-fg"
        />
        <p className="text-[10px] text-kite-fg/45 mt-1">
          Approves the vault, then transfers {tokenSymbol}.
        </p>
      </div>
      <button
        onClick={handle}
        disabled={!amount || state.kind === "awaiting_signature" || state.kind === "pending"}
        className="w-full h-10 rounded-lg bg-kite-primary text-kite-bg font-semibold text-sm hover:bg-kite-primary/90 disabled:opacity-50 transition-colors"
      >
        Deposit {amount || "—"} {tokenSymbol}
      </button>
      <TxStatus state={state} network={network} compact />
    </div>
  );
}
