import type { Address } from "viem";

// Set after running `forge script Deploy.s.sol`. Per-network.
// The placeholder address is unset; if it equals zeroAddress, the UI disables vault creation.
export const VAULT_FACTORY_TESTNET = (import.meta.env.VITE_VAULT_FACTORY_TESTNET ??
  "0x0000000000000000000000000000000000000000") as Address;

export const VAULT_FACTORY_MAINNET = (import.meta.env.VITE_VAULT_FACTORY_MAINNET ??
  "0x0000000000000000000000000000000000000000") as Address;

export function factoryFor(network: "mainnet" | "testnet"): Address {
  return network === "mainnet" ? VAULT_FACTORY_MAINNET : VAULT_FACTORY_TESTNET;
}

export function isConfigured(addr: Address): boolean {
  return addr.toLowerCase() !== "0x0000000000000000000000000000000000000000";
}
