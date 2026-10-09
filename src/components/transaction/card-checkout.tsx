"use client";

import * as React from "react";
import { CreditCard, LockKeyhole, ShieldCheck } from "lucide-react";
import type * as D from "@/types/domain";
import { useInternalRules } from "@/hooks/api";
import { Field, Input } from "@/components/ui/primitives";
import { CompanyLogo } from "@/components/domain/logos";
import { CARD_BRANDS, asset } from "@/lib/assets";
import { cn, fmt } from "@/lib/utils";

type Method = "apple" | "google" | "card";

/** Card payment sheet: wallets first, then card details. Captured by the acquirer with 3-D Secure. */
export function CardCheckout({ amount, currency, classification }: { amount: number; currency: D.Currency; classification?: D.InvestorClassification }) {
  const { data: rules } = useInternalRules();
  const [method, setMethod] = React.useState<Method>("apple");
  const card = rules?.card;
  const limit = classification === "retail" ? card?.retailLimitUsd : card?.professionalLimitUsd;
  const fee = card ? (amount * card.feePct) / 100 : 0;
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface-2 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-1.5">
          {CARD_BRANDS.map((b) => <img key={b.key} src={asset(b.src)} alt={b.label} width={36} height={24} className="h-6 w-9" />)}
        </span>
        <span className="inline-flex items-center gap-1.5 text-[12px] text-muted"><CompanyLogo name="Checkout.com" size={18} /> Processed by Checkout.com</span>
      </div>
      <div role="radiogroup" aria-label="Card payment method" className="grid grid-cols-3 gap-2">
        {([["apple", "Apple Pay"], ["google", "Google Pay"], ["card", "Card"]] as [Method, string][]).map(([m, l]) => (
          <button key={m} type="button" role="radio" aria-checked={method === m} onClick={() => setMethod(m)}
            className={cn("flex h-11 items-center justify-center gap-2 rounded-lg border text-[13px] font-medium transition-colors", method === m ? "border-brand bg-surface ring-2 ring-brand/20" : "border-border bg-surface hover:bg-surface-3")}>
            {m === "card" ? <CreditCard className="size-4" /> : <img src={asset(CARD_BRANDS.find((b) => b.key === (m === "apple" ? "applepay" : "googlepay"))!.src)} alt="" className="h-5 w-8" />}
            {l}
          </button>
        ))}
      </div>
      {method === "card" ? (
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><Field label="Name on card" htmlFor="cc-name"><Input id="cc-name" autoComplete="cc-name" /></Field></div>
          <div className="col-span-2"><Field label="Card number" htmlFor="cc-num"><Input id="cc-num" inputMode="numeric" autoComplete="cc-number" placeholder="1234 1234 1234 1234" className="font-mono" /></Field></div>
          <Field label="Expiry" htmlFor="cc-exp"><Input id="cc-exp" autoComplete="cc-exp" placeholder="MM / YY" /></Field>
          <Field label="Security code" htmlFor="cc-cvc"><Input id="cc-cvc" inputMode="numeric" autoComplete="cc-csc" placeholder="CVC" /></Field>
        </div>
      ) : (
        <p className="text-[12.5px] text-muted">You confirm the payment with Face ID, fingerprint or your device PIN after the compliance check.</p>
      )}
      <ul className="flex flex-col gap-1 text-[12px] text-muted">
        {card?.threeDSecure && <li className="flex items-center gap-1.5"><ShieldCheck className="size-3.5 text-success" /> 3-D Secure confirmation with your bank</li>}
        {limit !== undefined && <li className="flex items-center gap-1.5"><LockKeyhole className="size-3.5" /> Up to {fmt.money(limit)} per order by card{amount > 0 && card ? `. Card fee ${fmt.pct(card.feePct, 1)} (${fmt.money(fee, currency, { digits: 2 })})` : ""}</li>}
      </ul>
    </div>
  );
}
