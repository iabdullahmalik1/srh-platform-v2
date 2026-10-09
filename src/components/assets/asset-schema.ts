import { z } from "zod";
import type * as D from "@/types/domain";
import { waterfallFor } from "@/lib/waterfall";
import type { AssetDraft } from "@/stores/workflows";
import { fmt } from "@/lib/utils";
import { TOKEN_STANDARDS } from "./meta";

export const STRUCTURES: D.LegalStructure[] = ["SPV", "Fund", "Trust", "Corporate", "Sukuk SPV"];
export const INSTRUMENTS: D.InstrumentType[] = ["equity", "debt", "fund-unit", "note", "revenue-share", "sukuk-certificate"];
export const CURRENCIES: D.Currency[] = ["USD", "AED", "EUR", "GBP", "SAR", "SGD", "PKR"];
export const VALUATION_FREQ = ["daily", "monthly", "quarterly"] as const;
export const INCOME_FREQ = ["monthly", "quarterly", "semi-annual", "annual", "daily-accrual"] as const;
export const OWNERSHIP = ["on-chain", "transfer-agent", "custodian", "csd", "hybrid"] as const;
export const STANDARDS = TOKEN_STANDARDS.map((s) => s.value) as [D.TokenStandard, ...D.TokenStandard[]];
export const SYMBOL_RE = /^[A-Z0-9]{2,8}$/;

/** Instruments that carry a coupon or profit rate and a maturity. */
export const hasCoupon = (t?: D.InstrumentType) => t === "debt" || t === "note" || t === "sukuk-certificate";

const text = (msg: string, min: number, minMsg: string) => z.string({ error: msg }).trim().min(1, msg).min(min, minMsg);
const num = (msg: string) => z.number({ error: msg }).refine((n) => Number.isFinite(n), msg);

const template = z.object({ template: z.string({ error: "Choose a template to start from" }).min(1, "Choose a template to start from") });

const product = z.object({
  name: text("Enter the product name", 3, "Use at least 3 characters").max(80, "Keep the name to 80 characters"),
  shortName: text("Enter a short name", 2, "Use at least 2 characters").max(24, "Keep the short name to 24 characters"),
  description: text("Describe the product", 20, "Describe the product in at least 20 characters"),
  issuerId: z.string({ error: "Choose the issuer" }).min(1, "Choose the issuer"),
  legalEntity: z.object({
    name: text("Enter the legal entity name", 3, "Use at least 3 characters"),
    structure: z.enum(STRUCTURES, { error: "Choose a legal structure" }),
    jurisdiction: z.string({ error: "Choose a jurisdiction" }).min(1, "Choose a jurisdiction"),
  }),
  underlying: z.object({
    description: text("Describe the underlying asset", 5, "Use at least 5 characters"),
    location: z.string().optional(),
    appraisedValue: num("Enter the appraised value").refine((n) => n > 0, "Enter a value above zero"),
  }),
});

const instrument = z
  .object({
    instrument: z.object({
      type: z.enum(INSTRUMENTS, { error: "Choose an instrument type" }),
      couponPct: z.number().optional(),
      maturity: z.string().optional(),
      votingRights: z.boolean(),
    }),
    valuation: z.object({
      method: text("Enter the valuation method", 3, "Use at least 3 characters"),
      frequency: z.enum(VALUATION_FREQ, { error: "Choose a valuation frequency" }),
      currency: z.enum(CURRENCIES, { error: "Choose a currency" }),
    }),
    income: z.object({
      type: text("Enter the income type", 2, "Use at least 2 characters"),
      frequency: z.enum(INCOME_FREQ, { error: "Choose an income frequency" }),
      targetYieldPct: num("Enter a target yield, or 0 for non-distributing products").refine((n) => n >= 0 && n <= 50, "Enter a yield between 0% and 50%"),
    }),
    servicer: text("Enter the servicer", 2, "Use at least 2 characters"),
    ownershipModel: z.enum(OWNERSHIP, { error: "Choose where the authoritative record is kept" }),
  })
  .superRefine((v, ctx) => {
    if (!hasCoupon(v.instrument.type)) return;
    const c = v.instrument.couponPct;
    if (c === undefined || !Number.isFinite(c)) ctx.addIssue({ code: "custom", path: ["instrument", "couponPct"], message: "Enter the coupon or profit rate" });
    else if (c < 0 || c > 30) ctx.addIssue({ code: "custom", path: ["instrument", "couponPct"], message: "Enter a rate from 0% to 30%" });
    const m = v.instrument.maturity;
    if (!m) ctx.addIssue({ code: "custom", path: ["instrument", "maturity"], message: "Enter the maturity date" });
    else if (new Date(m).getTime() <= Date.now()) ctx.addIssue({ code: "custom", path: ["instrument", "maturity"], message: "Maturity must be in the future" });
  });

const compliance = z.object({
  rules: z.object({
    eligibleClassifications: z.array(z.string(), { error: "Choose at least one investor classification" }).min(1, "Choose at least one investor classification"),
    blockedCountries: z.array(z.string()),
    lockupDays: num("Enter the lock-up in days, or 0 for none").refine((n) => Number.isInteger(n) && n >= 0 && n <= 3650, "Enter whole days between 0 and 3,650"),
    holdingLimitPct: num("Enter the holding limit").refine((n) => n > 0 && n <= 100, "Enter a percentage above 0 and up to 100"),
    minInvestment: num("Enter the minimum investment").refine((n) => n > 0, "Enter an amount above zero"),
  }),
});

const tokenSchema = (taken: string[]) =>
  z
    .object({
      token: z.object({
        symbol: z
          .string({ error: "Enter a token symbol" })
          .regex(SYMBOL_RE, "Use 2 to 8 capital letters or digits, for example WPKS2")
          .refine((s) => !taken.includes(s.toUpperCase()), "This symbol is already used by another token class"),
        standard: z.enum(STANDARDS, { error: "Choose a token standard" }),
        decimals: num("Enter the decimals").refine((n) => Number.isInteger(n) && n >= 0 && n <= 18, "Enter a whole number from 0 to 18"),
        chains: z.array(z.string(), { error: "Choose at least one chain" }).min(1, "Choose at least one chain"),
        controls: z.object({ pausable: z.boolean(), freezable: z.boolean(), forcedTransfer: z.boolean(), recovery: z.boolean(), mintable: z.boolean(), burnable: z.boolean() }),
      }),
    })
    .superRefine((v, ctx) => {
      const { standard, chains } = v.token;
      if (standard === "SPL Token-2022" && chains.some((c) => c !== "solana")) ctx.addIssue({ code: "custom", path: ["token", "chains"], message: "SPL Token-2022 deploys only on Solana. Remove the EVM chains or choose an EVM standard." });
      if (standard !== "SPL Token-2022" && chains.length > 0 && chains.every((c) => c === "solana")) ctx.addIssue({ code: "custom", path: ["token", "chains"], message: `${standard} is an EVM standard. Add an EVM chain or choose SPL Token-2022 for Solana only.` });
    });

const offeringSchema = (minInvestment?: number) =>
  z
    .object({
      offering: z.object({
        target: num("Enter the target raise").refine((n) => n > 0, "Enter an amount above zero"),
        pricePerToken: num("Enter the price per token").refine((n) => n > 0, "Enter a price above zero"),
        minTicket: num("Enter the minimum ticket").refine((n) => n > 0, "Enter an amount above zero"),
        currency: z.enum(CURRENCIES, { error: "Choose a currency" }),
        rails: z.array(z.string(), { error: "Choose at least one payment rail" }).min(1, "Choose at least one payment rail"),
      }),
    })
    .superRefine((v, ctx) => {
      const o = v.offering;
      if (o.minTicket > o.target) ctx.addIssue({ code: "custom", path: ["offering", "minTicket"], message: "The minimum ticket cannot exceed the target raise" });
      if (minInvestment && o.minTicket < minInvestment) ctx.addIssue({ code: "custom", path: ["offering", "minTicket"], message: `The product rules require at least ${fmt.num(minInvestment)} per investor` });
      if (o.pricePerToken > o.target) ctx.addIssue({ code: "custom", path: ["offering", "pricePerToken"], message: "The price per token cannot exceed the target raise" });
    });

export type Errors = Record<string, string>;

function collect(r: { success: true } | { success: false; error: z.ZodError }): Errors {
  if (r.success) return {};
  const out: Errors = {};
  for (const i of r.error.issues) {
    const k = i.path.join(".");
    if (!out[k]) out[k] = i.message;
  }
  return out;
}

/** Validates one wizard step against the draft. Keys are dotted field paths, which are also the input ids. */
export function validateStep(step: number, input: AssetDraft, ctx: { takenSymbols: string[] }): Errors {
  // Missing nested sections validate as empty objects so each field reports its own message.
  const draft = { ...input, underlying: input.underlying ?? {}, legalEntity: input.legalEntity ?? {}, instrument: input.instrument ?? {}, valuation: input.valuation ?? {}, income: input.income ?? {}, rules: input.rules ?? {}, token: input.token ?? {}, offering: input.offering ?? {} };
  switch (step) {
    case 0: return collect(template.safeParse(draft));
    case 1: return collect(product.safeParse(draft));
    case 2: return collect(instrument.safeParse(draft));
    case 3: return collect(compliance.safeParse(draft));
    case 4: return collect(tokenSchema(ctx.takenSymbols).safeParse(draft));
    case 5: return collect(offeringSchema(input.rules?.minInvestment).safeParse(draft));
    default: return {};
  }
}

/** First step (0 to 5) that fails validation, or -1 when the draft is complete. */
export function firstInvalidStep(draft: AssetDraft, ctx: { takenSymbols: string[] }) {
  for (let s = 0; s <= 5; s++) if (Object.keys(validateStep(s, draft, ctx)).length) return s;
  return -1;
}

/** Builds the API input from a draft that has passed every step. */
export function toInput(d: AssetDraft): D.NewAssetInput {
  const coupon = hasCoupon(d.instrument!.type);
  return {
    template: d.template!,
    name: d.name!.trim(),
    shortName: d.shortName!.trim(),
    description: d.description!.trim(),
    issuerId: d.issuerId!,
    underlying: { description: d.underlying!.description.trim(), location: d.underlying!.location?.trim() || undefined, appraisedValue: d.underlying!.appraisedValue },
    legalEntity: { name: d.legalEntity!.name.trim(), structure: d.legalEntity!.structure, jurisdiction: d.legalEntity!.jurisdiction },
    instrument: {
      type: d.instrument!.type,
      votingRights: d.instrument!.votingRights,
      ...(coupon ? { couponPct: d.instrument!.couponPct, maturity: new Date(d.instrument!.maturity!).toISOString() } : {}),
    },
    valuation: { method: d.valuation!.method.trim(), frequency: d.valuation!.frequency, currency: d.valuation!.currency },
    income: { type: d.income!.type.trim(), frequency: d.income!.frequency, targetYieldPct: d.income!.targetYieldPct },
    servicer: d.servicer!.trim(),
    ownershipModel: d.ownershipModel!,
    rules: { ...d.rules! },
    token: { ...d.token!, symbol: d.token!.symbol.toUpperCase() },
    offering: { ...d.offering! },
    regimes: d.regimes?.length ? d.regimes : undefined,
    profile: d.profile?.length ? d.profile : undefined,
    oracleMode: d.oracleMode ?? (d.valuation!.frequency === "daily" ? "automated" : "manual"),
    documents: d.documents?.length ? d.documents : undefined,
    tokenClasses: d.tokenClasses?.length ? d.tokenClasses : undefined,
    waterfall: d.tokenClasses?.length ? waterfallFor([{ name: "Main class", symbol: d.token!.symbol.toUpperCase(), tier: "senior", targetReturnPct: d.income!.targetYieldPct, supply: 0 }, ...d.tokenClasses]) : undefined,
    debt: coupon
      ? {
          faceValue: d.debt?.faceValue ?? 100,
          couponPct: d.instrument!.couponPct ?? 0,
          couponFrequency: d.instrument!.couponPct === 0 ? "none" : d.debt?.couponFrequency && d.debt.couponFrequency !== "none" ? d.debt.couponFrequency : "semi-annual",
          issueDate: new Date(d.debt?.issueDate || Date.now()).toISOString(),
          maturity: new Date(d.instrument!.maturity!).toISOString(),
          yieldPct: d.debt?.yieldPct ?? d.instrument!.couponPct ?? 0,
          dayCount: d.debt?.dayCount ?? "30/360",
          amortising: d.debt?.amortising,
        }
      : undefined,
  };
}
