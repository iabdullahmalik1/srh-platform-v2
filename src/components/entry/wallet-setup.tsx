"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Building, Check, KeyRound, LifeBuoy, Link2, ShieldCheck, Smartphone, Wallet, type LucideIcon } from "lucide-react";
import type { Chain } from "@/types/domain";
import { NetworkLogo } from "@/components/domain/logos";
import { Button } from "@/components/ui/button";
import { CopyText, Field, Input } from "@/components/ui/primitives";
import { CHAIN_META } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { newAddress, type WalletMode } from "./onboarding-model";
import { ChoiceCard, EASE, GroupLabel, IconChip, SelectDot } from "./parts";

export const WALLET_CHAINS: Chain[] = ["ethereum", "polygon", "base", "avalanche", "solana"];

const SHARDS: { icon: LucideIcon; label: string; x: number; y: number }[] = [
  { icon: Smartphone, label: "Your device", x: 15, y: 26 },
  { icon: Building, label: "SRH custody", x: 85, y: 26 },
  { icon: LifeBuoy, label: "Recovery", x: 50, y: 84 },
];
const CENTER = { x: 50, y: 40 };

/** Key shares form around a single wallet, then the address appears. */
function MpcCreation({ chain, address, onCreated }: { chain: Chain; address: string; onCreated: (a: string) => void }) {
  const reduce = useReducedMotion();
  const [stage, setStage] = React.useState(address ? 5 : 0);
  const onCreatedRef = React.useRef(onCreated);
  React.useEffect(() => {
    onCreatedRef.current = onCreated;
  });

  React.useEffect(() => {
    if (stage === 0 || stage >= 5) return;
    const t = setTimeout(
      () => {
        if (stage === 4) onCreatedRef.current(newAddress(chain));
        setStage(stage + 1);
      },
      reduce ? 120 : [0, 380, 380, 520, 600][stage],
    );
    return () => clearTimeout(t);
  }, [stage, chain, reduce]);

  const started = stage > 0;
  const linked = stage >= 4;
  const ready = stage >= 5;

  return (
    <div className="space-y-3">
      <div className="relative h-[210px] overflow-hidden rounded-xl border border-border bg-surface-2">
        <div aria-hidden className="bg-grid absolute inset-0 opacity-60" />
        <svg aria-hidden className="absolute inset-0 size-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {SHARDS.map((s, i) => (
            <motion.line
              key={s.label}
              x1={s.x}
              y1={s.y}
              x2={CENTER.x}
              y2={CENTER.y}
              vectorEffect="non-scaling-stroke"
              className={cn(ready ? "stroke-success" : "stroke-brand")}
              strokeWidth={1.5}
              initial={false}
              animate={{ pathLength: linked ? 1 : 0, opacity: linked ? 1 : 0 }}
              transition={{ duration: 0.45, ease: EASE, delay: linked && !ready ? i * 0.08 : 0 }}
            />
          ))}
        </svg>
        {SHARDS.map((s, i) => {
          const visible = stage > i;
          return (
            <motion.div
              key={s.label}
              className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1"
              style={{ left: `${s.x}%`, top: `${s.y}%` }}
              initial={false}
              animate={{ opacity: started ? (visible ? 1 : 0.35) : 0.35, scale: visible ? 1 : 0.9 }}
              transition={{ duration: 0.3, ease: EASE }}
            >
              <span className={cn("grid size-10 place-items-center rounded-xl border bg-surface shadow-1 transition-colors duration-300", visible ? "border-brand/40 text-brand-ink" : "border-border text-subtle", ready && "border-success/40 text-success")}>
                <s.icon className="size-[18px]" aria-hidden />
              </span>
              <span className="whitespace-nowrap text-[11px] font-medium text-muted">{s.label}</span>
            </motion.div>
          );
        })}
        <motion.div
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${CENTER.x}%`, top: `${CENTER.y}%` }}
          initial={false}
          animate={{ scale: linked ? 1 : 0.85, opacity: linked ? 1 : 0.5 }}
          transition={{ duration: 0.35, ease: EASE }}
        >
          <span className={cn("relative grid size-14 place-items-center rounded-2xl shadow-2 transition-colors duration-300", ready ? "bg-success text-white" : linked ? "bg-brand text-white" : "border border-border bg-surface-3 text-subtle")}>
            {linked && !ready && !reduce && <span aria-hidden className="absolute inset-0 animate-ping rounded-2xl bg-brand opacity-30" />}
            {ready ? <Check className="size-6" strokeWidth={2.5} aria-hidden /> : <KeyRound className="size-6" aria-hidden />}
          </span>
        </motion.div>
      </div>

      <AnimatePresence initial={false} mode="wait">
        {ready && address ? (
          <motion.div key="addr" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, ease: EASE }} className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-border bg-surface px-3.5 py-3">
            <NetworkLogo chain={chain} size={22} />
            <span className="min-w-0 flex-1">
              <span className="block text-[12px] text-muted">{CHAIN_META[chain].label} address</span>
              <CopyText value={address} lead={10} tail={8} className="text-[12.5px] text-foreground" />
            </span>
            <IconChip icon={ShieldCheck} tone="success">2 of 3 key shares</IconChip>
          </motion.div>
        ) : (
          <motion.div key="btn" exit={{ opacity: 0 }}>
            <Button variant="primary" className="w-full" onClick={() => setStage(1)} isLoading={started} loadingText="Creating key shares…">
              <KeyRound /> Create MPC wallet
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function WalletSetup({
  mode,
  chain,
  address,
  error,
  onMode,
  onChain,
  onAddress,
}: {
  mode?: WalletMode;
  chain: Chain;
  address: string;
  error?: string;
  onMode: (m: WalletMode) => void;
  onChain: (c: Chain) => void;
  onAddress: (a: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div role="radiogroup" aria-label="Wallet option" className="grid gap-2.5 sm:grid-cols-2">
        <ChoiceCard name="wallet-mode" value="mpc" selected={mode === "mpc"} onSelect={() => onMode("mpc")} className="items-start gap-3 p-4">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand-ink">
            <ShieldCheck className="size-5" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-semibold text-foreground">Create a custodial MPC wallet</span>
            <span className="mt-2 flex flex-wrap gap-1.5">
              <IconChip icon={Check} tone="success">Recommended</IconChip>
              <IconChip icon={KeyRound}>No seed phrase</IconChip>
            </span>
          </span>
          <SelectDot selected={mode === "mpc"} />
        </ChoiceCard>
        <ChoiceCard name="wallet-mode" value="existing" selected={mode === "existing"} onSelect={() => onMode("existing")} className="items-start gap-3 p-4">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface-3 text-foreground">
            <Wallet className="size-5" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-semibold text-foreground">Connect an existing wallet</span>
            <span className="mt-2 flex flex-wrap gap-1.5">
              <IconChip icon={Link2}>Self-custody</IconChip>
              <IconChip icon={ShieldCheck}>Risk screened</IconChip>
            </span>
          </span>
          <SelectDot selected={mode === "existing"} />
        </ChoiceCard>
      </div>

      <AnimatePresence initial={false}>
        {mode && (
          <motion.div key={mode} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, ease: EASE }} className="space-y-5">
            <div>
              <GroupLabel icon={Link2}>Network</GroupLabel>
              <div role="radiogroup" aria-label="Network" className="flex flex-wrap gap-2">
                {WALLET_CHAINS.map((c) => {
                  const selected = chain === c;
                  return (
                    <label
                      key={c}
                      className={cn(
                        "inline-flex h-9 cursor-pointer items-center gap-2 rounded-full border pl-1.5 pr-3.5 text-[13px] font-medium transition-colors duration-150 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring",
                        selected ? "border-brand bg-brand-soft text-brand-ink" : "border-border bg-surface text-foreground hover:border-border-strong",
                      )}
                    >
                      <input
                        type="radio"
                        name="chain"
                        value={c}
                        checked={selected}
                        onChange={() => {
                          onChain(c);
                          onAddress("");
                        }}
                        className="sr-only"
                      />
                      <NetworkLogo chain={c} size={22} />
                      {CHAIN_META[c].label}
                    </label>
                  );
                })}
              </div>
            </div>

            {mode === "mpc" ? (
              <MpcCreation key={chain} chain={chain} address={address} onCreated={onAddress} />
            ) : (
              <Field label="Wallet address" htmlFor="wallet-address" error={error} hint={chain === "solana" ? "Base58 address, 32 to 44 characters" : "Starts with 0x, 42 characters"}>
                <div className="flex gap-2">
                  <Input
                    id="wallet-address"
                    value={address}
                    onChange={(e) => onAddress(e.target.value)}
                    placeholder={chain === "solana" ? "7xKX…" : "0x…"}
                    spellCheck={false}
                    autoComplete="off"
                    aria-invalid={!!error || undefined}
                    aria-describedby={error ? "wallet-address-error" : undefined}
                    className="h-10 font-mono text-[12.5px]"
                  />
                  <Button type="button" variant="secondary" className="h-10 shrink-0" onClick={() => onAddress(newAddress(chain))}>
                    Use sample
                  </Button>
                </div>
              </Field>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
