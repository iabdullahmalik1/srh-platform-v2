/**
 * Static asset helpers. Every image path in the app goes through `asset()` so the
 * site works both at the domain root and under a sub-path (GitHub Pages project sites).
 */
import personas from "@/mocks/data/personas.json";
import investors from "@/mocks/data/investors.json";
import type { Chain, PaymentRail } from "@/types/domain";

export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function asset(path?: string | null): string {
  if (!path) return "";
  if (/^(https?:|data:|blob:)/.test(path)) return path;
  return `${BASE_PATH}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Prefix an in-app href with the base path for places that bypass next/link (window.location). */
export function withBase(href: string) {
  return href.startsWith("/") ? `${BASE_PATH}${href}` : href;
}

export function slugify(s: string) {
  return s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const AVATARS = new Map<string, string>();
for (const p of personas as { name: string; avatar?: string }[]) if (p.avatar) AVATARS.set(p.name.toLowerCase(), p.avatar);
for (const v of investors as { name: string; avatar?: string }[]) if (v.avatar) AVATARS.set(v.name.toLowerCase(), v.avatar);

/** Profile photo for a known person, by display name. */
export function avatarFor(name?: string | null): string | undefined {
  if (!name) return undefined;
  const a = AVATARS.get(name.trim().toLowerCase());
  return a ? asset(a) : undefined;
}

export const NETWORK_LOGO: Record<Chain, string> = {
  ethereum: "/logos/networks/eth.svg",
  polygon: "/logos/networks/matic.svg",
  solana: "/logos/networks/sol.svg",
  base: "/logos/networks/base.svg",
  avalanche: "/logos/networks/avax.svg",
};

export const TOKEN_LOGO: Record<string, string> = {
  USDC: "/logos/networks/usdc.svg",
  USDT: "/logos/networks/usdt.svg",
  ETH: "/logos/networks/eth.svg",
  BTC: "/logos/networks/btc.svg",
};

export const RAIL_LOGO: Partial<Record<PaymentRail, string>> = {
  usdc: "/logos/networks/usdc.svg",
  usdt: "/logos/networks/usdt.svg",
  "aed-stablecoin": "/logos/rails/aed-stablecoin.svg",
  "tokenized-deposit": "/logos/rails/tokenized-deposit.svg",
  swift: "/logos/rails/swift.svg",
  sepa: "/logos/rails/sepa.svg",
  ach: "/logos/rails/ach.svg",
  "local-rail": "/logos/rails/local-rail.svg",
  card: "/logos/rails/card.svg",
};

/** Card scheme marks shown at card checkout. */
export const CARD_BRANDS: { key: string; label: string; src: string }[] = [
  { key: "visa", label: "Visa", src: "/logos/cards/visa.svg" },
  { key: "mastercard", label: "Mastercard", src: "/logos/cards/mastercard.svg" },
  { key: "amex", label: "American Express", src: "/logos/cards/americanexpress.svg" },
  { key: "applepay", label: "Apple Pay", src: "/logos/cards/applepay.svg" },
  { key: "googlepay", label: "Google Pay", src: "/logos/cards/googlepay.svg" },
];

/** Bespoke logos for named companies; everything else gets a generated mark. */
export const COMPANY_LOGO: Record<string, string> = {
  "srh markets": "/brand/srh-mark.png",
  "srh markets ltd": "/brand/srh-mark.png",
  "srh inc": "/brand/srh-mark.png",
  "srh registrar ltd": "/brand/srh-mark.png",
  "srh principal desk": "/brand/srh-mark.png",
  "talara securities": "/logos/tenants/talara.svg",
  "talara securities llc": "/logos/tenants/talara.svg",
  "meridian bank": "/logos/tenants/meridian.svg",
  "meridian bank b.s.c.": "/logos/tenants/meridian.svg",
  "northgate asset management": "/logos/tenants/northgate.svg",
  "northgate asset management co.": "/logos/tenants/northgate.svg",
  ...providerLogos({
    "fireblocks.png": ["Fireblocks", "Fireblocks (nominee)", "Fireblocks Network (USDT)"],
    "komainu.png": ["Komainu", "Komainu (nominee)"],
    "copper.png": ["Copper", "Copper (nominee)"],
    "bitgo.png": ["BitGo", "BitGo Trust"],
    "securitize.png": ["Securitize"],
    "tokeny.png": ["Tokeny", "Tokeny (ERC-3643)"],
    "checkout.png": ["Checkout.com"],
    "emirates-nbd.png": ["Emirates NBD", "Emirates NBD Capital"],
    "lean.png": ["Lean Technologies"],
    "network-international.png": ["Network International"],
    "archax.png": ["Archax", "Archax RFQ", "Archax (external venue)"],
    "helius.png": ["Helius"],
    "apollo.png": ["Apollo Global Management"],
    "knight-frank.png": ["Knight Frank"],
    "apex-group.png": ["Apex Group"],
    "deloitte.png": ["Deloitte"],
    "jll.png": ["JLL", "JLL (draft)"],
    "dewa.png": ["Dubai Electricity and Water Authority (DEWA)", "Dubai Electricity and Water Authority"],
    "sumsub.png": ["Sumsub", "Sumsub KYB"],
    "jumio.png": ["Jumio"],
    "acra.png": ["ACRA BizFile"],
    "kyckr.png": ["Kyckr"],
    "complyadvantage.png": ["ComplyAdvantage"],
    "chainalysis.png": ["Chainalysis"],
    "elliptic.png": ["Elliptic"],
    "trm-labs.png": ["TRM Labs"],
    "bny.png": ["BNY"],
    "iq-eq.png": ["IQ-EQ"],
    "pinsent-masons.png": ["Pinsent Masons"],
    "pwc.png": ["PwC Luxembourg", "PwC"],
    "dnv.png": ["DNV"],
    "cavendish-maxwell.png": ["Cavendish Maxwell"],
    "dubai-land-department.png": ["Dubai Land Department"],
    "companies-house.png": ["Companies House API", "Companies House"],
    "anchorage.png": ["Anchorage Digital"],
    "stripe.svg": ["Stripe"],
    "adyen.svg": ["Adyen"],
    "circle.svg": ["Circle (USDC)", "Circle"],
    "chainlink.svg": ["Chainlink", "Chainlink Proof of Reserve"],
    "alchemy.svg": ["Alchemy"],
    "hsbc.svg": ["HSBC", "HSBC UK", "HSBC Markets"],
  }),
};

function providerLogos(map: Record<string, string[]>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [file, names] of Object.entries(map)) for (const n of names) out[n.toLowerCase()] = `/logos/providers/${file}`;
  return out;
}
