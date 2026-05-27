import { useEffect, useState } from "react";
import { WagmiProvider, createConfig, http, useAccount, useWriteContract, useReadContract, useChainId, useSwitchChain } from "wagmi";
import { injected } from "wagmi/connectors";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Loader2, Plus, Search, AlertTriangle } from "lucide-react";

import { kiteMainnet, kiteTestnet, isValidAddress, type KiteNetwork, TESTNET_USDT_ADDRESS } from "./lib/kite-chain";
import { factoryFor, isConfigured } from "./lib/contracts";
import { VAULT_FACTORY_ABI } from "./lib/vault-abi";

import { SiteHeader } from "./components/site-header";
import { SiteFooter } from "./components/site-footer";
import { AuditWarningBanner } from "./components/audit-warning-banner";
import { VaultDashboard } from "./components/vault-dashboard";
import { WalletConnectButton } from "./components/wallet-connect-button";

const NETWORK_STORAGE_KEY = "kitevault:network";

const wagmiConfig = createConfig({
  chains: [kiteMainnet, kiteTestnet],
  connectors: [injected()],
  transports: {
    [kiteMainnet.id]: http(kiteMainnet.rpcUrls.default.http[0]),
    [kiteTestnet.id]: http(kiteTestnet.rpcUrls.default.http[0]),
  },
});

const queryClient = new QueryClient();

type Route = { name: "landing" } | { name: "vault"; address: `0x${string}` };

function readRoute(): Route {
  if (typeof window === "undefined") return { name: "landing" };
  const m = window.location.pathname.match(/^\/vault\/(0x[a-fA-F0-9]{40})\/?$/);
  if (m) return { name: "vault", address: m[1] as `0x${string}` };
  return { name: "landing" };
}

function readInitialNetwork(): KiteNetwork {
  if (typeof window === "undefined") return "testnet";
  const stored = window.localStorage.getItem(NETWORK_STORAGE_KEY);
  return stored === "mainnet" ? "mainnet" : "testnet";
}

function navigate(path: string) {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

function InnerApp() {
  const [route, setRoute] = useState<Route>(() => readRoute());
  const [network, setNetwork] = useState<KiteNetwork>(() => readInitialNetwork());

  useEffect(() => {
    const onPop = () => setRoute(readRoute());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(NETWORK_STORAGE_KEY, network);
    }
  }, [network]);

  const toggleNetwork = () => setNetwork((n) => (n === "mainnet" ? "testnet" : "mainnet"));

  return (
    <div className="min-h-screen flex flex-col bg-kite-bg text-kite-fg">
      <SiteHeader network={network} onToggleNetwork={toggleNetwork} onNavigate={navigate} />
      <AuditWarningBanner variant={network === "mainnet" ? "mainnet" : "default"} />

      {route.name === "landing" && <Landing network={network} />}
      {route.name === "vault" && <VaultDashboard vaultAddress={route.address} network={network} />}

      <SiteFooter />
    </div>
  );
}

function Landing({ network }: { network: KiteNetwork }) {
  const [vaultLookup, setVaultLookup] = useState("");
  const factoryAddr = factoryFor(network);
  const configured = isConfigured(factoryAddr);

  const handleOpen = () => {
    const v = vaultLookup.trim();
    if (isValidAddress(v)) navigate(`/vault/${v}`);
  };

  return (
    <main className="flex-1">
      <section className="kite-gradient border-b border-kite-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-kite-fg mb-4">
            Programmable vaults for AI agents.
          </h1>
          <p className="text-base text-kite-fg/70 max-w-2xl leading-relaxed mb-10">
            Hold your USDC.e in a vault. Authorize an agent with rules — $X/day, $Y/month, pause
            on low balance. Non-custodial. Revoke instantly.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl">
            <CreateVaultCard network={network} factoryAddress={factoryAddr} configured={configured} />
            <OpenVaultCard
              value={vaultLookup}
              onChange={setVaultLookup}
              onOpen={handleOpen}
              valid={isValidAddress(vaultLookup.trim())}
            />
          </div>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <FeatureCard
            title="Deposit"
            body="Move USDC.e (or any ERC-20) into your vault. You're the only one who can pull everything out, no rules apply."
          />
          <FeatureCard
            title="Set rules"
            body="Authorize an agent. Configure per-tx, daily, and monthly caps plus a minimum balance threshold. Pause if it dips below."
          />
          <FeatureCard
            title="Agent operates"
            body="Your agent calls agentWithdraw within the rules. Anything outside the rules reverts on-chain. You see every spend."
          />
        </div>
      </section>
    </main>
  );
}

function FeatureCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="bg-kite-card border border-kite-border rounded-xl p-5">
      <h3 className="text-base font-semibold tracking-tight text-kite-fg mb-1.5">{title}</h3>
      <p className="text-sm text-kite-fg/65 leading-relaxed">{body}</p>
    </div>
  );
}

function OpenVaultCard({
  value,
  onChange,
  onOpen,
  valid,
}: {
  value: string;
  onChange: (v: string) => void;
  onOpen: () => void;
  valid: boolean;
}) {
  return (
    <div className="bg-kite-card border border-kite-border rounded-2xl p-5 shadow-sm">
      <h3 className="text-sm font-bold text-kite-fg mb-2">I have a vault address</h3>
      <p className="text-xs text-kite-fg/60 mb-3">
        Paste an existing vault address to view its dashboard.
      </p>
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0x…"
          className="flex-1 min-w-0 bg-kite-bg border border-kite-border focus:border-kite-primary focus:outline-none rounded-md px-3 py-2 text-xs font-mono text-kite-fg"
        />
        <button
          onClick={onOpen}
          disabled={!valid}
          className="px-3 rounded-md bg-kite-primary text-kite-bg text-xs font-semibold hover:bg-kite-primary/90 disabled:opacity-40 transition-colors inline-flex items-center gap-1"
        >
          <Search className="w-3 h-3" />
          Open
        </button>
      </div>
    </div>
  );
}

function CreateVaultCard({
  network,
  factoryAddress,
  configured,
}: {
  network: KiteNetwork;
  factoryAddress: `0x${string}`;
  configured: boolean;
}) {
  const { isConnected, address } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const targetChainId = network === "mainnet" ? kiteMainnet.id : kiteTestnet.id;

  // Check if user already has a vault for the testnet USDT token.
  const { data: existingVault } = useReadContract({
    address: factoryAddress,
    abi: VAULT_FACTORY_ABI,
    functionName: "vaultOf",
    args: address ? [address, TESTNET_USDT_ADDRESS] : undefined,
    query: { enabled: configured && isConnected && network === "testnet" },
  });

  const handleCreate = async () => {
    setError(null);
    setBusy(true);
    try {
      if (chainId !== targetChainId) {
        await switchChainAsync({ chainId: targetChainId });
      }
      const hash = await writeContractAsync({
        address: factoryAddress,
        abi: VAULT_FACTORY_ABI,
        functionName: "createVault",
        args: [TESTNET_USDT_ADDRESS],
      });
      // Note: we don't know the new vault address from the tx hash alone without
      // waiting for the receipt. For simplicity, poll vaultOf after a brief delay.
      setTimeout(async () => {
        // Re-read vaultOf via simple fetch loop is overkill; user can paste the
        // address from KiteScan or refresh and use the lookup above. v0.2: parse
        // the receipt log for VaultCreated.
        console.log("Vault creation tx submitted:", hash);
        setBusy(false);
      }, 500);
    } catch (err) {
      setError(err instanceof Error ? err.message.split("\n")[0] : "Unknown error");
      setBusy(false);
    }
  };

  return (
    <div className="bg-kite-card border border-kite-border rounded-2xl p-5 shadow-sm">
      <h3 className="text-sm font-bold text-kite-fg mb-2">Create a new vault</h3>
      {!configured ? (
        <div className="text-xs text-kite-destructive flex items-start gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <span>
            Factory address not configured for {network}. Deploy{" "}
            <code className="font-mono">VaultFactory.sol</code> and set{" "}
            <code className="font-mono">VITE_VAULT_FACTORY_{network.toUpperCase()}</code>.
          </span>
        </div>
      ) : !isConnected ? (
        <>
          <p className="text-xs text-kite-fg/60 mb-3">
            Connect a wallet to deploy your own vault on {network}.
          </p>
          <WalletConnectButton label="Connect wallet" />
        </>
      ) : existingVault && existingVault !== "0x0000000000000000000000000000000000000000" ? (
        <>
          <p className="text-xs text-kite-fg/60 mb-3">
            You already have a vault for {network === "testnet" ? "Test USDT" : "this token"} —
          </p>
          <button
            onClick={() => navigate(`/vault/${existingVault}`)}
            className="w-full h-10 rounded-lg bg-kite-primary text-kite-bg text-sm font-semibold hover:bg-kite-primary/90 transition-colors"
          >
            Open my vault
          </button>
        </>
      ) : (
        <>
          <p className="text-xs text-kite-fg/60 mb-3">
            Deploys a vault for{" "}
            {network === "testnet" ? "Test USDT" : "the configured token"}. You're the owner.
          </p>
          <button
            onClick={handleCreate}
            disabled={busy}
            className="w-full h-10 rounded-lg bg-kite-primary text-kite-bg text-sm font-semibold hover:bg-kite-primary/90 disabled:opacity-60 transition-colors inline-flex items-center justify-center gap-1.5"
          >
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            {busy ? "Deploying…" : "Create vault"}
          </button>
          {error && (
            <p className="text-xs text-kite-destructive font-mono break-all mt-2">{error}</p>
          )}
        </>
      )}
    </div>
  );
}

export default function App() {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <InnerApp />
      </QueryClientProvider>
    </WagmiProvider>
  );
}
