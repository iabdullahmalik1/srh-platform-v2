/**
 * Deterministic mock data generator.
 * Run: npx tsx scripts/generate-mocks.ts
 * Output: src/mocks/data/*.json (committed, so the app does not depend on this script at runtime).
 *
 * Real-world references: Whitworth Park (University of Manchester), LBMA gold prices, US Treasury bill rates,
 * Al Dhafra Solar PV, MBR Solar Park, Apollo ACRED and Hamilton Lane GPA are described from published sources.
 * Providers, custodians, banks and service firms are real, licensed companies named as typical integrations.
 * Investors, holdings, orders and transactions are illustrative.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import type * as D from "../src/types/domain";
import { kycFor, kybFor, SAMPLE_BANK } from "../src/lib/kyc-countries";
import { CLASSIFICATION_LABEL } from "../src/lib/constants";
import MEDIA_MAP from "./media-map.json";

/* ---------------------------- seeded random ---------------------------- */
let seed = 20261007;
function rand() {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const between = (a: number, b: number) => a + rand() * (b - a);
const int = (a: number, b: number) => Math.floor(between(a, b + 1));
const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)];
const chance = (p: number) => rand() < p;
const hex = (n: number) => Array.from({ length: n }, () => "0123456789abcdef"[int(0, 15)]).join("");
const evmAddr = () => "0x" + hex(40);
const solAddr = () => Array.from({ length: 44 }, () => "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"[int(0, 57)]).join("");
const addrFor = (c: D.Chain) => (c === "solana" ? solAddr() : evmAddr());
const txHash = () => "0x" + hex(64);
const round = (n: number, d = 2) => Math.round(n * 10 ** d) / 10 ** d;

const NOW = new Date("2026-10-06T16:00:00Z").getTime();
const DAY = 86_400_000;
const iso = (t: number) => new Date(t).toISOString();
const daysAgo = (d: number, jitterH = 0) => iso(NOW - d * DAY - int(0, jitterH) * 3_600_000);
const daysAhead = (d: number) => iso(NOW + d * DAY);

let idc = 1000;
const id = (p: string) => `${p}_${(idc++).toString(36)}${hex(4)}`;

/* ------------------------------ reference ------------------------------ */
export const jurisdictions: D.Jurisdiction[] = [
  { code: "AE-ADGM", name: "Abu Dhabi Global Market", regulator: "FSRA", country: "AE" },
  { code: "AE-DIFC", name: "Dubai International Financial Centre", regulator: "DFSA", country: "AE" },
  { code: "AE-VARA", name: "Dubai (VARA regime)", regulator: "VARA", country: "AE" },
  { code: "SA", name: "Kingdom of Saudi Arabia", regulator: "CMA", country: "SA" },
  { code: "BH", name: "Kingdom of Bahrain", regulator: "CBB", country: "BH" },
  { code: "SG", name: "Singapore", regulator: "MAS", country: "SG" },
  { code: "GB", name: "United Kingdom", regulator: "FCA", country: "GB" },
  { code: "EU-LU", name: "Luxembourg (EU)", regulator: "CSSF", country: "LU" },
  { code: "KY", name: "Cayman Islands", regulator: "CIMA", country: "KY" },
  { code: "US", name: "United States", regulator: "SEC", country: "US" },
  { code: "PK", name: "Pakistan", regulator: "SECP", country: "PK" },
  { code: "CH", name: "Switzerland", regulator: "FINMA", country: "CH" },
  { code: "AE-SCA", name: "UAE onshore (SCA)", regulator: "SCA", country: "AE" },
  { code: "QA", name: "Qatar Financial Centre", regulator: "QFCRA", country: "QA" },
  { code: "HK", name: "Hong Kong", regulator: "SFC", country: "HK" },
  { code: "EU", name: "European Union (MiCA and DLT Pilot)", regulator: "ESMA and national authorities", country: "EU" },
  { code: "VG", name: "British Virgin Islands", regulator: "BVI FSC", country: "VG" },
  { code: "JE", name: "Jersey", regulator: "JFSC", country: "JE" },
];

const ENTITY_INDUSTRY: Record<string, string> = {
  "family-office": "Family office", fund: "Investment fund", corporate: "Corporate treasury", pension: "Pension fund",
  sovereign: "Sovereign investor", trust: "Endowment and trust", bank: "Bank",
};

/* ------------------------------- tenants ------------------------------- */
const T_SRH = "tnt_srh", T_XYZ = "tnt_xyz", T_MRD = "tnt_mrd", T_NGT = "tnt_ngt";

const allModules: D.ModuleKey[] = ["identity", "compliance", "assets", "tokenization", "primary-market", "payments", "custody", "registry", "servicing", "secondary-market", "defi"];

const tenants: D.Tenant[] = [
  {
    id: T_SRH, name: "SRH Markets", shortName: "SRH", deploymentModel: "own-platform", domain: "markets.srh.inc",
    brand: { primary: "#D21F17", primaryHover: "#B01912", accentSoft: "#FDECEA", monogram: "S" },
    hosting: "SRH Cloud (multi-tenant, me-central-1)", dataResidency: "UAE",
    modules: allModules,
    licences: [
      { id: "lic_srh_1", holder: "SRH Markets Ltd", regulator: "FSRA", jurisdiction: "AE-ADGM", activities: ["distribution", "brokerage"], reference: "FSRA-FSP-240318", status: "active", grantedAt: "2025-04-11T00:00:00Z", expiresAt: "2027-04-10T00:00:00Z" },
      { id: "lic_srh_2", holder: "SRH Registrar Ltd", regulator: "FSRA", jurisdiction: "AE-ADGM", activities: ["transfer-agency", "settlement"], reference: "FSRA-FSP-250902", status: "active", grantedAt: "2025-09-02T00:00:00Z", expiresAt: "2027-09-01T00:00:00Z" },
      { id: "lic_srh_3", holder: "SRH Digital Markets FZE", regulator: "VARA", jurisdiction: "AE-VARA", activities: ["brokerage", "distribution"], reference: "VARA-BD-0119", status: "active", grantedAt: "2025-11-20T00:00:00Z", expiresAt: "2026-11-19T00:00:00Z" },
      { id: "lic_srh_4", holder: "SRH Exchange Ltd", regulator: "FSRA", jurisdiction: "AE-ADGM", activities: ["marketplace-operation"], reference: "FSRA-MTF-APP-0412", status: "pending", grantedAt: "2026-07-01T00:00:00Z", expiresAt: "2028-06-30T00:00:00Z" },
    ],
    responsibilities: [
      { activity: "issuance", entity: "Issuer SPV (per product)", type: "external-provider" },
      { activity: "distribution", entity: "SRH Markets Ltd", type: "platform-entity", licenceId: "lic_srh_1" },
      { activity: "brokerage", entity: "SRH Markets Ltd", type: "platform-entity", licenceId: "lic_srh_1" },
      { activity: "custody", entity: "Komainu (custody) and Fireblocks (MPC wallets)", type: "external-provider" },
      { activity: "transfer-agency", entity: "SRH Registrar Ltd", type: "platform-entity", licenceId: "lic_srh_2" },
      { activity: "payment-handling", entity: "Emirates NBD (client money), Checkout.com (cards)", type: "external-provider" },
      { activity: "marketplace-operation", entity: "SRH Exchange Ltd (licence pending)", type: "platform-entity", licenceId: "lic_srh_4" },
      { activity: "fund-management", entity: "Appointed fund manager (per product)", type: "external-provider" },
      { activity: "settlement", entity: "SRH Registrar Ltd", type: "platform-entity", licenceId: "lic_srh_2" },
      { activity: "compliance", entity: "SRH Markets Ltd (MLRO)", type: "platform-entity", licenceId: "lic_srh_1" },
      { activity: "asset-servicing", entity: "SRH Registrar Ltd", type: "platform-entity", licenceId: "lic_srh_2" },
    ],
    apiKeys: [
      { id: "key_1", label: "Production server", prefix: "srh_live_7Hq2", scopes: ["investors:write", "orders:write", "tokens:read"], createdAt: "2026-02-14T09:00:00Z", lastUsedAt: daysAgo(0, 3) },
      { id: "key_2", label: "Reporting warehouse", prefix: "srh_live_K9mx", scopes: ["*:read"], createdAt: "2026-05-02T09:00:00Z", lastUsedAt: daysAgo(1, 6) },
    ],
    createdAt: "2025-03-01T00:00:00Z",
  },
  {
    id: T_XYZ, name: "Talara Securities", shortName: "Talara", deploymentModel: "white-label", domain: "digital.talarasecurities.ae",
    brand: { primary: "#0E7C7B", primaryHover: "#0A6362", accentSoft: "#E3F4F3", monogram: "T" },
    hosting: "SRH Cloud (white-label tenant)", dataResidency: "UAE",
    modules: ["identity", "compliance", "assets", "tokenization", "primary-market", "payments", "registry", "servicing"],
    licences: [
      { id: "lic_xyz_1", holder: "Talara Securities LLC", regulator: "DFSA", jurisdiction: "AE-DIFC", activities: ["distribution", "brokerage", "custody"], reference: "DFSA-F00731", status: "active", grantedAt: "2019-06-01T00:00:00Z", expiresAt: "2027-05-31T00:00:00Z" },
    ],
    responsibilities: [
      { activity: "issuance", entity: "Issuer SPV (per product)", type: "external-provider" },
      { activity: "distribution", entity: "Talara Securities LLC", type: "customer-entity", licenceId: "lic_xyz_1" },
      { activity: "brokerage", entity: "Talara Securities LLC", type: "customer-entity", licenceId: "lic_xyz_1" },
      { activity: "custody", entity: "Talara Securities LLC", type: "customer-entity", licenceId: "lic_xyz_1" },
      { activity: "transfer-agency", entity: "SRH Registrar Ltd", type: "platform-entity" },
      { activity: "payment-handling", entity: "Talara banking partner", type: "external-provider" },
      { activity: "marketplace-operation", entity: "Not enabled", type: "customer-entity" },
      { activity: "fund-management", entity: "Not applicable", type: "customer-entity" },
      { activity: "settlement", entity: "SRH settlement engine (technology)", type: "platform-entity" },
      { activity: "compliance", entity: "Talara Securities LLC (Compliance Officer)", type: "customer-entity", licenceId: "lic_xyz_1" },
      { activity: "asset-servicing", entity: "SRH Registrar Ltd", type: "platform-entity" },
    ],
    apiKeys: [{ id: "key_3", label: "Talara core banking bridge", prefix: "tal_live_2bQe", scopes: ["investors:read", "orders:write"], createdAt: "2026-06-10T09:00:00Z", lastUsedAt: daysAgo(0, 2) }],
    createdAt: "2026-05-18T00:00:00Z",
  },
  {
    id: T_MRD, name: "Meridian Bank", shortName: "Meridian", deploymentModel: "headless", domain: "api.meridianbank.example",
    brand: { primary: "#3346C8", primaryHover: "#2636A6", accentSoft: "#E8EBFB", monogram: "M" },
    hosting: "SRH Cloud (API only)", dataResidency: "Bahrain",
    modules: ["compliance", "tokenization", "payments", "custody", "registry"],
    licences: [
      { id: "lic_mrd_1", holder: "Meridian Bank B.S.C.", regulator: "CBB", jurisdiction: "BH", activities: ["custody", "payment-handling", "issuance", "settlement"], reference: "CBB-RB-0088", status: "active", grantedAt: "2008-01-15T00:00:00Z", expiresAt: "2028-01-14T00:00:00Z" },
    ],
    responsibilities: [
      { activity: "issuance", entity: "Meridian Bank B.S.C.", type: "customer-entity", licenceId: "lic_mrd_1" },
      { activity: "distribution", entity: "Meridian Bank (own channels)", type: "customer-entity" },
      { activity: "brokerage", entity: "Not applicable", type: "customer-entity" },
      { activity: "custody", entity: "Meridian Bank B.S.C.", type: "customer-entity", licenceId: "lic_mrd_1" },
      { activity: "transfer-agency", entity: "Meridian Bank registrar unit", type: "customer-entity" },
      { activity: "payment-handling", entity: "Meridian Bank B.S.C.", type: "customer-entity", licenceId: "lic_mrd_1" },
      { activity: "marketplace-operation", entity: "Not enabled", type: "customer-entity" },
      { activity: "fund-management", entity: "Not applicable", type: "customer-entity" },
      { activity: "settlement", entity: "Meridian Bank B.S.C.", type: "customer-entity", licenceId: "lic_mrd_1" },
      { activity: "compliance", entity: "Meridian Bank (Group Compliance)", type: "customer-entity" },
      { activity: "asset-servicing", entity: "SRH servicing engine (technology)", type: "platform-entity" },
    ],
    apiKeys: [
      { id: "key_4", label: "Mobile banking backend", prefix: "mrd_live_Pp41", scopes: ["compliance:check", "tokens:write", "settlements:write"], createdAt: "2026-03-03T09:00:00Z", lastUsedAt: daysAgo(0, 1) },
    ],
    createdAt: "2026-03-01T00:00:00Z",
  },
  {
    id: T_NGT, name: "Northgate Asset Management", shortName: "Northgate", deploymentModel: "dedicated", domain: "tokens.northgate-am.example",
    brand: { primary: "#1F6F43", primaryHover: "#185835", accentSoft: "#E4F2EA", monogram: "N" },
    hosting: "Dedicated VPC in customer cloud account, customer-managed keys", dataResidency: "Saudi Arabia",
    modules: ["identity", "compliance", "assets", "tokenization", "primary-market", "payments", "custody", "registry", "servicing", "secondary-market"],
    licences: [
      { id: "lic_ngt_1", holder: "Northgate Asset Management Co.", regulator: "CMA", jurisdiction: "SA", activities: ["fund-management", "distribution", "custody"], reference: "CMA-37-11192", status: "active", grantedAt: "2014-09-01T00:00:00Z", expiresAt: "2027-08-31T00:00:00Z" },
    ],
    responsibilities: [
      { activity: "issuance", entity: "Northgate fund vehicles", type: "customer-entity" },
      { activity: "distribution", entity: "Northgate Asset Management Co.", type: "customer-entity", licenceId: "lic_ngt_1" },
      { activity: "brokerage", entity: "Not applicable", type: "customer-entity" },
      { activity: "custody", entity: "Northgate Asset Management Co.", type: "customer-entity", licenceId: "lic_ngt_1" },
      { activity: "transfer-agency", entity: "Northgate registrar", type: "customer-entity" },
      { activity: "payment-handling", entity: "Northgate banking partner", type: "external-provider" },
      { activity: "marketplace-operation", entity: "External licensed venue", type: "external-provider" },
      { activity: "fund-management", entity: "Northgate Asset Management Co.", type: "customer-entity", licenceId: "lic_ngt_1" },
      { activity: "settlement", entity: "SRH settlement engine (technology)", type: "platform-entity" },
      { activity: "compliance", entity: "Northgate Compliance", type: "customer-entity" },
      { activity: "asset-servicing", entity: "Northgate fund administration", type: "customer-entity" },
    ],
    apiKeys: [],
    createdAt: "2026-01-20T00:00:00Z",
  },
];

/* ------------------------------- personas ------------------------------ */
const personas: D.Persona[] = [
  { id: "usr_ops", name: "Layla Haddad", email: "layla.haddad@srh.inc", role: "operations", title: "Head of Platform Operations", organization: "SRH Markets Ltd", initials: "LH" },
  { id: "usr_cco", name: "Omar Siddiqui", email: "omar.siddiqui@srh.inc", role: "compliance-officer", title: "Chief Compliance Officer and MLRO", organization: "SRH Markets Ltd", initials: "OS" },
  { id: "usr_adm", name: "Daniel Reyes", email: "daniel.reyes@srh.inc", role: "platform-admin", title: "Platform Administrator", organization: "SRH Inc", initials: "DR" },
  { id: "usr_iss", name: "Sara Kim", email: "sara.kim@whitworthpark-spv.com", role: "issuer-admin", title: "Director, Investor Relations", organization: "Whitworth Park Residences SPV Ltd", initials: "SK" },
  { id: "usr_inv", name: "Ahmed Al Mansoori", email: "ahmed.mansoori@example.ae", role: "investor", title: "Professional Investor", organization: "Individual", initials: "AM" },
  { id: "usr_corp", name: "Victor Lindqvist", email: "victor.lindqvist@tidewaterpension.co.uk", role: "investor", title: "Treasurer, authorised signatory", organization: "Tidewater Pension Trust", initials: "VL" },
  { id: "usr_aud", name: "Grace Okafor", email: "grace.okafor@auditpartners.example", role: "auditor", title: "Engagement Partner", organization: "Okafor & Lane Audit", initials: "GO" },
];

/* ------------------------------- providers ----------------------------- */
const P = (id: string, name: string, category: D.ProviderCategory, service: string, region: string, coverage: string[], usedBy: D.ModuleKey[], latencyMs: number, extra: Partial<D.Provider> = {}): D.Provider => ({
  id, name, category, service, adapter: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "@" + int(1, 4) + "." + int(0, 9) + "." + int(0, 9),
  status: "operational", latencyMs, uptimePct: round(between(99.9, 99.995), 2), region, coverage, lastSyncAt: daysAgo(0), usedBy, mode: "automated", ...extra,
});
const providers: D.Provider[] = [
  // Identity (KYC)
  P("prv_sumsub", "Sumsub", "kyc", "Document, liveness and KYB verification", "Global", ["Global"], ["identity"], 380, { website: "sumsub.com" }),
  P("prv_onfido", "Onfido (Entrust)", "kyc", "Document and biometric verification", "EU / UK / ME", ["GB", "EU", "AE"], ["identity"], 450, { website: "onfido.com" }),
  P("prv_jumio", "Jumio", "kyc", "Identity verification and eKYC", "Global", ["US", "EU", "SG"], ["identity"], 520, { website: "jumio.com" }),
  P("prv_uaepass", "UAE Pass", "kyc", "National digital identity (TDRA)", "AE", ["AE"], ["identity"], 610, { website: "uaepass.ae" }),
  P("prv_singpass", "Singpass Myinfo", "kyc", "Government-verified personal data", "SG", ["SG"], ["identity"], 480, { website: "singpass.gov.sg" }),
  P("prv_nafath", "Nafath", "kyc", "Saudi national single sign-on", "SA", ["SA"], ["identity"], 690, { website: "nafath.sa" }),
  P("prv_kycdesk", "SRH manual review desk", "kyc", "Compliance analysts verify documents by hand", "Any region", ["PK", "BH", "Other"], ["identity"], 0, { mode: "manual" }),
  // Company verification (KYB) and registries
  P("prv_sumsubkyb", "Sumsub KYB", "kyb", "Company verification and UBO discovery", "Global", ["Global"], ["identity"], 900, { website: "sumsub.com" }),
  P("prv_companieshouse", "Companies House API", "kyb", "UK company register and PSC data", "GB", ["GB"], ["identity"], 260, { website: "companieshouse.gov.uk" }),
  P("prv_acra", "ACRA BizFile", "kyb", "Singapore company profiles", "SG", ["SG"], ["identity"], 540, { website: "acra.gov.sg" }),
  P("prv_kyckr", "Kyckr", "kyb", "Live access to 300+ official registries", "Global", ["EU", "KY", "VG", "LU"], ["identity"], 1200, { website: "kyckr.com" }),
  P("prv_kybdesk", "SRH registry desk", "kyb", "Manual registry checks where no API exists", "Any region", ["AE-ML", "PK", "SA", "Other"], ["identity"], 0, { mode: "manual" }),
  // AML, sanctions and wallet risk
  P("prv_complyadv", "ComplyAdvantage", "aml", "Sanctions, PEP and adverse media screening", "Global", ["Global"], ["compliance"], 240, { website: "complyadvantage.com" }),
  P("prv_worldcheck", "LSEG World-Check", "aml", "Risk intelligence and enhanced due diligence", "Global", ["Global"], ["compliance"], 330, { website: "lseg.com" }),
  P("prv_chainalysis", "Chainalysis", "aml", "Wallet risk and transaction monitoring (KYT)", "Global", ["Global"], ["compliance", "custody"], 1840, { status: "degraded", uptimePct: 99.42, website: "chainalysis.com" }),
  P("prv_elliptic", "Elliptic", "aml", "Wallet screening and cross-chain analytics", "Global", ["Global"], ["compliance"], 410, { website: "elliptic.co" }),
  P("prv_trm", "TRM Labs", "aml", "Blockchain intelligence and travel rule", "Global", ["Global"], ["compliance"], 380, { website: "trmlabs.com" }),
  // Custody and key management
  P("prv_fireblocks", "Fireblocks", "custody", "MPC wallets, policy engine and tokenisation", "Global", ["Global"], ["custody", "tokenization"], 190, { website: "fireblocks.com" }),
  P("prv_komainu", "Komainu", "custody", "Regulated institutional custody", "AE / JE / GB", ["AE", "JE", "GB"], ["custody"], 350, { website: "komainu.com" }),
  P("prv_copper", "Copper", "custody", "Custody and ClearLoop off-exchange settlement", "CH / GB", ["CH", "GB"], ["custody"], 300, { website: "copper.co" }),
  P("prv_bitgo", "BitGo", "custody", "Qualified custody and multi-signature wallets", "US / EU", ["US", "EU"], ["custody"], 420, { website: "bitgo.com" }),
  P("prv_thales", "Thales Luna HSM", "custody", "Hardware security modules for token admin keys", "me-central-1", ["AE"], ["custody", "tokenization"], 45, { uptimePct: 100, website: "thalesgroup.com" }),
  // Tokenisation and transfer agency
  P("prv_tokeny", "Tokeny (ERC-3643)", "tokenization", "Permissioned token standard and onchain identity", "EU", ["Global"], ["tokenization"], 210, { website: "tokeny.com" }),
  P("prv_securitize", "Securitize", "tokenization", "Transfer agent and tokenised fund distribution", "US / EU", ["US", "EU"], ["tokenization", "registry"], 340, { website: "securitize.io" }),
  // Banking
  P("prv_enbd", "Emirates NBD", "banking", "Client money accounts, SWIFT and UAEFTS", "AE", ["AE"], ["payments"], 900, { website: "emiratesnbd.com" }),
  P("prv_hsbc", "HSBC", "banking", "GBP and EUR collections, CHAPS and SEPA", "GB / EU", ["GB", "EU"], ["payments"], 820, { website: "hsbc.com" }),
  P("prv_lean", "Lean Technologies", "banking", "Open banking account verification and pay-by-bank", "AE / SA", ["AE", "SA"], ["payments", "identity"], 640, { website: "leantech.me" }),
  P("prv_bankdesk", "SRH treasury desk", "banking", "Manual statement matching for banks without APIs", "Any region", ["PK", "Other"], ["payments"], 0, { mode: "manual" }),
  // Payments, cards and stablecoins
  P("prv_checkout", "Checkout.com", "payments", "Card acquiring, Apple Pay and Google Pay", "Global", ["AE", "GB", "EU", "SA"], ["payments"], 310, { website: "checkout.com" }),
  P("prv_stripe", "Stripe", "payments", "Card payments and 3-D Secure", "Global", ["GB", "EU", "US", "SG", "AE"], ["payments"], 280, { website: "stripe.com" }),
  P("prv_adyen", "Adyen", "payments", "Card acquiring and local payment methods", "Global", ["EU", "GB", "US", "SG"], ["payments"], 300, { website: "adyen.com" }),
  P("prv_netint", "Network International", "payments", "Card acquiring in the UAE and Saudi Arabia", "AE / SA", ["AE", "SA"], ["payments"], 520, { website: "network.ae" }),
  P("prv_circle", "Circle (USDC)", "payments", "USDC minting, redemption and payouts", "Global", ["Global"], ["payments"], 240, { website: "circle.com" }),
  P("prv_aecoin", "AE Coin", "payments", "Dirham stablecoin licensed by the CBUAE", "AE", ["AE"], ["payments"], 260, { website: "aecoin.com" }),
  // Oracles and valuation
  P("prv_chainlink", "Chainlink", "oracle", "Price feeds, NAV data and Proof of Reserve", "Global", ["Global"], ["servicing", "defi"], 130, { website: "chain.link" }),
  P("prv_lbma", "LBMA Gold Price", "oracle", "Daily LBMA gold auction reference", "Global", ["Global"], ["servicing"], 600, { website: "lbma.org.uk" }),
  P("prv_valdesk", "SRH valuation desk", "oracle", "Manual NAV entry with maker-checker approval", "Any region", ["Global"], ["servicing"], 0, { mode: "manual" }),
  // Market infrastructure
  P("prv_archax", "Archax", "market", "FCA-regulated digital securities exchange", "GB", ["GB", "EU"], ["secondary-market"], 75, { website: "archax.com" }),
  // Blockchain access
  P("prv_alchemy", "Alchemy", "blockchain", "EVM node infrastructure and webhooks", "Multi-region", ["Global"], ["tokenization"], 160, { website: "alchemy.com" }),
  P("prv_helius", "Helius", "blockchain", "Solana RPC and indexing", "Multi-region", ["Global"], ["tokenization"], 90, { website: "helius.dev" }),
];

/* ------------------------------- investors ----------------------------- */
const individuals = [
  ["Ahmed Al Mansoori", "AE", "AE"], ["Fatima Rahman", "AE", "GB"], ["James Whitfield", "GB", "GB"], ["Priya Nair", "SG", "IN"],
  ["Khalid Al Suwaidi", "AE", "AE"], ["Elena Petrova", "CH", "BG"], ["Hassan Qureshi", "PK", "PK"], ["Mei Lin Tan", "SG", "SG"],
  ["Yousef Haddad", "BH", "JO"], ["Sophie Laurent", "LU", "FR"], ["Rashid Al Nuaimi", "AE", "AE"], ["Aisha Khan", "GB", "PK"],
  ["Marcus Bauer", "DE", "DE"], ["Noura Al Ketbi", "AE", "AE"], ["Tariq Mahmood", "SA", "PK"], ["Hana Yamamoto", "SG", "JP"],
  ["Omar Farouk", "SA", "EG"], ["Leila Karimi", "AE", "CA"], ["David Cohen", "US", "US"], ["Zainab Malik", "PK", "PK"],
  ["Arjun Mehta", "AE", "IN"], ["Lucas Moreau", "CH", "FR"], ["Salma Idris", "BH", "BH"],
] as const;
const entities = [
  ["Al Noor Family Office", "AE-DIFC", "family-office"], ["Crescent Bay Capital", "AE-ADGM", "fund"], ["Falcon Ridge Holdings", "SA", "corporate"],
  ["Tidewater Pension Trust", "GB", "pension"], ["Saffron Peak Investments", "SG", "fund"], ["Orion Sovereign Partners", "AE-ADGM", "sovereign"],
  ["Bluewater Treasury Ltd", "KY", "corporate"], ["Harbour Gate Asset Management", "GB", "fund"], ["Qasr Capital", "SA", "fund"],
  ["Zenith Endowment Fund", "CH", "trust"], ["Northlight Insurance Co", "BH", "corporate"], ["Desert Rose Private Office", "AE-FZ", "family-office"],
  ["Lumen Treasury Bank", "LU", "bank"], ["Indus Growth Partners", "PK", "fund"], ["Pearl Coast Holdings", "BH", "corporate"],
  ["Granite Hill Capital", "US", "fund"], ["Sable Creek Family Trust", "SG", "trust"], ["Amber Gate Ventures", "AE-ML", "corporate"],
  ["Westmarch Pension Scheme", "GB", "pension"], ["Kestrel Opportunities Fund", "KY", "fund"],
] as const;
const rms = ["Nadia Farah", "Imran Sheikh", "Clara Jensen", "Faisal Al Amri"];
const custodians = ["Fireblocks", "Komainu", "Talara Securities Custody", "Meridian Bank Custody"];
const countryOf = (j: string) => (j.startsWith("AE") ? "AE" : j);

function makeWallets(n: number, isEntity: boolean): D.Wallet[] {
  return Array.from({ length: n }, (_, i) => {
    const chain = pick<D.Chain>(["ethereum", "ethereum", "polygon", "base", "solana", "avalanche"]);
    const type = pick<D.WalletType>(isEntity ? ["custodial", "mpc", "multisig"] : ["custodial", "mpc", "self-custody"]);
    return {
      id: id("wal"), label: i === 0 ? "Primary" : pick(["Treasury", "Trading", "Cold storage", "Operations"]),
      address: addrFor(chain), chain, type, custodian: type === "custodial" || type === "mpc" ? pick(custodians.slice(0, 2)) : undefined,
      whitelisted: chance(0.9), riskScore: int(2, 28), addedAt: daysAgo(int(30, 400)),
    };
  });
}

const ALL_TEMPLATES: D.AssetTemplate[] = ["real-estate", "spv-shares", "private-credit", "treasury-fund", "bond", "sukuk", "private-equity", "commodity", "infrastructure"];
const interestsFor = (cls: D.InvestorClassification, i: number): D.InvestorInterests => {
  const income = i % 3 !== 1;
  const types = [...ALL_TEMPLATES].sort(() => rand() - 0.5).slice(0, int(2, 4));
  return {
    assetTypes: i === 0 ? ["real-estate", "commodity", "treasury-fund", "sukuk"] : types,
    regions: i === 0 ? ["GCC", "United Kingdom"] : [pick(["GCC", "United Kingdom", "Europe", "Asia"]), pick(["GCC", "Global"])].filter((x, k, a) => a.indexOf(x) === k),
    risk: i === 0 ? "medium" : cls === "retail" ? pick<D.RiskProfile>(["very-low", "low"]) : pick<D.RiskProfile>(["low", "medium", "medium", "high"]),
    goal: i === 0 ? "income" : income ? "income" : pick(["growth", "preservation"]),
    ticket: i === 0 ? 250_000 : undefined,
  };
};

/** Requirement checklist for an individual, by status. Items left "missing" model an account opened before everything was provided. */
function individualVerification(country: string, kyc: D.KycStatus, opts: { missingAddress?: boolean; bankMismatch?: boolean; pep?: boolean; adverse?: boolean; walletHigh?: boolean; classification: D.InvestorClassification }): D.VerificationItem[] {
  const k = kycFor(country);
  const idDoc = k.ids.find((x) => !x.digital) ?? k.ids[0];
  const digital = k.ids.find((x) => x.digital);
  const provider = country === "AE" ? (digital ? "UAE Pass" : "Sumsub") : country === "SG" ? "Singpass Myinfo" : country === "SA" ? "Nafath" : country === "PK" ? "SRH manual review desk" : pick(["Sumsub", "Onfido (Entrust)", "Jumio"]);
  const done = kyc === "approved";
  return [
    { key: "identity-document", label: (digital && country !== "PK" ? digital.label : idDoc.label) + " verified", status: kyc === "rejected" ? "failed" : kyc === "expired" ? "failed" : "passed", provider, detail: kyc === "expired" ? "Document expired" : undefined },
    { key: "liveness", label: "Liveness and face match", status: kyc === "not-started" ? "missing" : "passed", provider: provider === "SRH manual review desk" ? "Sumsub" : provider },
    { key: "address", label: "Proof of address", status: opts.missingAddress ? "missing" : kyc === "in-review" ? "pending" : "passed", provider: "Sumsub", detail: opts.missingAddress ? "Not provided at registration" : k.address[0] },
    { key: "bank-account", label: "Bank account in investor's name", status: opts.bankMismatch ? "failed" : done ? "passed" : "pending", provider: country === "AE" || country === "SA" ? "Lean Technologies" : "SRH treasury desk", detail: opts.bankMismatch ? "Account holder name on statement does not match" : undefined },
    { key: "source-of-funds", label: "Source of funds", status: done ? "passed" : "pending", detail: "Employment income and investment proceeds" },
    { key: "sanctions", label: "Sanctions screening", status: "passed", provider: "ComplyAdvantage" },
    { key: "pep", label: "PEP screening", status: opts.pep ? "pending" : "passed", provider: "LSEG World-Check", detail: opts.pep ? "Domestic PEP: enhanced due diligence" : undefined },
    { key: "adverse-media", label: "Adverse media", status: opts.adverse ? "pending" : "passed", provider: "ComplyAdvantage" },
    { key: "wallet-risk", label: "Wallet risk", status: opts.walletHigh ? "pending" : "passed", provider: "Chainalysis" },
    { key: "classification", label: CLASSIFICATION_LABEL[opts.classification] + " classification", status: done ? "passed" : "pending", detail: opts.classification === "retail" ? "Appropriateness test passed" : "Wealth and experience criteria met" },
  ];
}

const investors: D.Investor[] = [];
const tenantSplit = (i: number) => (i % 9 === 4 ? T_XYZ : i % 11 === 7 ? T_NGT : i % 13 === 5 ? T_MRD : T_SRH);

individuals.forEach(([name, residency, citizenship], i) => {
  const kyc = i === 6 ? "in-review" : i === 18 ? "approved" : i === 21 ? "expired" : i === 15 ? "rejected" : "approved";
  const classification: D.InvestorClassification = i === 0 ? "professional" : residency === "US" ? "accredited" : i % 4 === 0 ? "retail" : i % 5 === 0 ? "accredited" : "professional";
  // Registered but incomplete: account open, items outstanding for the back office
  const incomplete = i === 7 || i === 19 || i === 22;
  const verification = individualVerification(residency, kyc as D.KycStatus, { missingAddress: i === 7 || i === 22, bankMismatch: i === 19, pep: i === 10, adverse: i === 9, walletHigh: i === 17, classification });
  const idDoc = kycFor(residency).ids.find((x) => !x.digital) ?? kycFor(residency).ids[0];
  investors.push({
    id: i === 0 ? "inv_ahmed" : "inv_" + name.toLowerCase().replace(/[^a-z]/g, ""), tenantId: i === 0 || incomplete ? T_SRH : tenantSplit(i), type: "individual", name,
    email: name.toLowerCase().replace(/[^a-z ]/g, "").replace(/ /g, ".") + "@example.com", phone: "+971 50 " + int(100, 999) + " " + int(1000, 9999),
    country: residency, residency, citizenship, classification,
    accreditationExpiresAt: classification !== "retail" ? daysAhead(int(-20, 500)) : undefined,
    kycStatus: (incomplete ? "pending" : kyc) as D.KycStatus, kycProvider: verification[0].provider ?? "Sumsub", amlRisk: i === 9 ? "high" : i % 6 === 0 ? "medium" : "low",
    pep: i === 10, sanctionsHit: false, adverseMedia: i === 9, wallets: makeWallets(int(1, 2), false), beneficialOwners: [],
    documents: [
      { id: id("doc"), name: idDoc.label, kind: idDoc.kind, status: kyc === "expired" ? "expired" : "verified", uploadedAt: daysAgo(int(60, 500)) },
      { id: id("doc"), name: "Proof of address", kind: "proof-of-address", status: i === 7 || i === 22 ? "missing" : kyc === "in-review" ? "pending" : "verified", uploadedAt: daysAgo(int(30, 400)) },
      ...(classification !== "retail" ? [{ id: id("doc"), name: "Professional investor attestation", kind: "accreditation-letter" as const, status: "verified" as const, uploadedAt: daysAgo(int(30, 300)) }] : []),
      { id: id("doc"), name: "Source of funds declaration", kind: "source-of-funds", status: "verified", uploadedAt: daysAgo(int(30, 300)) },
      ...(i === 19 ? [{ id: id("doc"), name: "Bank statement", kind: "bank-statement" as const, status: "rejected" as const, uploadedAt: daysAgo(2) }] : []),
    ],
    totalInvested: 0, holdingsCount: 0, onboardedAt: incomplete ? daysAgo(int(1, 6)) : daysAgo(int(20, 520)), lastReviewedAt: daysAgo(int(1, 120)),
    relationshipManager: pick(rms), tags: i === 0 ? ["Priority client"] : chance(0.2) ? [pick(["Priority client", "Sharia-compliant only", "Quarterly reporting", "Introducer: Gulf desk"])] : [],
    verification, profileComplete: !incomplete && kyc === "approved", interests: interestsFor(classification, i),
  });
});

entities.forEach(([name, juris, entityType], i) => {
  const kyb = i === 8 ? "in-review" : i === 15 ? "approved" : i === 17 ? "pending" : "approved";
  const country = countryOf(juris);
  const classification: D.InvestorClassification = entityType === "bank" || entityType === "sovereign" || entityType === "pension" ? "institutional" : entityType === "fund" ? (i % 2 ? "institutional" : "qualified-purchaser") : "professional";
  const reg = kybFor(juris);
  const ubos = Array.from({ length: int(1, 3) }, (_, k) => ({ id: id("ubo"), name: pick(["Saeed", "Mariam", "Robert", "Ying", "Faris", "Anita", "Kareem", "Helena"]) + " " + pick(["Al Hashimi", "Okoro", "Sterling", "Wei", "Bakr", "Rossi", "Nasser", "Varga"]), ownershipPct: k === 0 ? int(40, 70) : int(10, 30), nationality: country, pep: i === 6 && k === 0, verified: kyb === "approved" }));
  const bank = SAMPLE_BANK[country] ?? SAMPLE_BANK.AE;
  const acct = String(int(10_000_000, 99_999_999));
  const docStatus = (kind: D.InvestorDocumentKind): D.InvestorDocument["status"] => (kyb === "pending" && (kind === "register-of-beneficial-owners" || kind === "board-resolution") ? "missing" : kyb === "in-review" && kind === "register-of-directors" ? "pending" : "verified");
  const tidewater = name === "Tidewater Pension Trust";
  investors.push({
    id: tidewater ? "inv_tidewater" : "inv_" + name.toLowerCase().replace(/[^a-z]/g, "").slice(0, 18), tenantId: tidewater ? T_SRH : tenantSplit(i + 3), type: "entity", name,
    email: "operations@" + name.toLowerCase().replace(/[^a-z]/g, "").slice(0, 14) + ".example",
    country, residency: country, entityType: entityType as D.Investor["entityType"],
    registrationNumber: (reg.numberHint.match(/[A-Z]{2,}/)?.[0] ?? country) + "-" + int(100000, 999999), classification,
    kycStatus: "approved", kybStatus: kyb as D.KycStatus, kycProvider: juris === "GB" ? "Companies House API" : juris === "SG" ? "ACRA BizFile" : "Sumsub KYB",
    amlRisk: i === 12 ? "high" : i % 5 === 0 ? "medium" : "low", pep: false, sanctionsHit: i === 19, adverseMedia: false,
    wallets: makeWallets(int(1, 3), true),
    beneficialOwners: ubos,
    documents: reg.docs.slice(0, 6).map((d) => ({ id: id("doc"), name: d.label, kind: d.kind, status: docStatus(d.kind), uploadedAt: daysAgo(int(30, 500)) })),
    totalInvested: 0, holdingsCount: 0, onboardedAt: kyb === "pending" ? daysAgo(3) : daysAgo(int(20, 600)), lastReviewedAt: daysAgo(int(1, 150)),
    relationshipManager: pick(rms), tags: chance(0.3) ? [pick(["Anchor investor", "Sharia-compliant only", "Monthly reporting", "Treasury mandate"])] : [],
    verification: [
      { key: "company-registry", label: reg.registry + " record", status: kyb === "pending" ? "pending" : "passed", provider: reg.lookup ? reg.lookup : "SRH registry desk" },
      { key: "company-documents", label: "Company documents", status: kyb === "pending" ? "missing" : kyb === "in-review" ? "pending" : "passed", detail: kyb === "pending" ? "Beneficial owner register and board resolution outstanding" : undefined },
      { key: "beneficial-owners", label: "Beneficial owners identified and verified", status: kyb === "approved" ? "passed" : "pending", provider: "Sumsub KYB" },
      { key: "directors", label: "Directors verified", status: kyb === "approved" ? "passed" : "pending" },
      { key: "signatories", label: "Authorised signatories verified", status: kyb === "approved" ? "passed" : "pending" },
      { key: "bank-account", label: "Settlement bank account", status: kyb === "approved" ? "passed" : "pending", provider: country === "AE" || country === "SA" ? "Lean Technologies" : "SRH treasury desk" },
      { key: "sanctions", label: "Sanctions screening (entity and owners)", status: i === 19 ? "failed" : "passed", provider: "ComplyAdvantage" },
      { key: "pep", label: "PEP screening of owners", status: i === 6 ? "pending" : "passed", provider: "LSEG World-Check" },
      { key: "wallet-risk", label: "Wallet risk", status: "passed", provider: "Chainalysis" },
    ],
    profileComplete: kyb === "approved" && i !== 19,
    interests: { assetTypes: entityType === "pension" ? ["real-estate", "infrastructure", "bond", "treasury-fund"] : [...ALL_TEMPLATES].sort(() => rand() - 0.5).slice(0, 3), regions: ["GCC", "United Kingdom", "Global"].slice(0, int(1, 3)), risk: entityType === "pension" || entityType === "bank" ? "low" : pick<D.RiskProfile>(["low", "medium", "high"]), goal: entityType === "pension" ? "income" : pick(["income", "growth"]) },
    company: {
      jurisdiction: juris, registry: reg.registry, legalForm: tidewater ? "Pension scheme trust" : reg.legalForms[0], incorporatedAt: daysAgo(int(900, 6000)),
      registeredAddress: tidewater ? "1 Bartholomew Lane, London EC2N 2AX" : undefined, industry: ENTITY_INDUSTRY[entityType] ?? "Investment holding",
      directors: ubos.slice(0, 2).map((u, k) => ({ name: u.name, role: k === 0 ? "Director" : "Non-executive director", verified: kyb === "approved" })),
      signatories: tidewater ? [{ name: "Victor Lindqvist", title: "Treasurer", email: "victor.lindqvist@tidewaterpension.co.uk", verified: true }, { name: ubos[0].name, title: "Chair of trustees", email: "trustees@tidewaterpension.co.uk", verified: true }] : [{ name: ubos[0].name, title: "Director", email: "signatory@" + name.toLowerCase().replace(/[^a-z]/g, "").slice(0, 12) + ".example", verified: kyb === "approved" }],
      bankAccounts: [{ id: id("bnk"), bank: bank.bank, iban: bank.iban(acct), swift: bank.swift, currency: country === "GB" ? "GBP" : country === "SA" ? "SAR" : country === "AE" ? "AED" : "USD", verified: kyb === "approved", method: country === "AE" || country === "SA" ? "Open banking (Lean)" : "Statement review" }],
    },
  });
});

/* -------------------------------- issuers ------------------------------ */
const issuers: D.Issuer[] = [
  { id: "iss_srhlf", name: "SRH Liquidity Fund SPC", type: "fund", jurisdiction: "AE-ADGM", registrationNumber: "000004120", sponsor: "SRH Asset Management", contact: "funds@srh.inc", kybStatus: "approved", assetsCount: 1, createdAt: "2025-05-01T00:00:00Z", licence: "FSRA qualified investor fund",
    serviceProviders: [{ role: "Fund administrator", name: "Apex Group" }, { role: "Custodian", name: "BNY" }, { role: "Auditor", name: "KPMG Lower Gulf" }, { role: "Legal counsel", name: "Clifford Chance" }] },
  { id: "iss_wpk", name: "Whitworth Park Residences SPV Ltd", type: "spv", jurisdiction: "AE-ADGM", registrationNumber: "000013377", sponsor: "The University of Manchester", contact: "sara.kim@whitworthpark-spv.com", kybStatus: "approved", assetsCount: 1, createdAt: "2026-05-04T00:00:00Z",
    serviceProviders: [{ role: "Operator and lessee", name: "The University of Manchester" }, { role: "Valuer", name: "Knight Frank" }, { role: "Corporate services", name: "IQ-EQ" }, { role: "Security trustee", name: "Apex Group" }, { role: "Auditor", name: "Deloitte" }, { role: "Legal counsel", name: "Pinsent Masons" }] },
  { id: "iss_gold", name: "SRH Gold Trust", type: "trust", jurisdiction: "AE-ADGM", registrationNumber: "000008841", sponsor: "SRH Asset Management", contact: "gold@srh.inc", kybStatus: "approved", assetsCount: 1, createdAt: "2024-12-02T00:00:00Z",
    serviceProviders: [{ role: "Vault operator", name: "Brink's Global Services (Dubai)" }, { role: "Refiner (LBMA Good Delivery)", name: "Emirates Gold DMCC" }, { role: "Bar audit", name: "Inspectorate (Bureau Veritas)" }, { role: "Trustee", name: "Apex Group" }] },
  { id: "iss_ads", name: "Al Dhafra Solar Sukuk Ltd", type: "spv", jurisdiction: "AE-ADGM", registrationNumber: "000011245", sponsor: "Masdar", contact: "sukuk@aldhafrasukuk.ae", kybStatus: "approved", assetsCount: 1, createdAt: "2025-12-15T00:00:00Z",
    serviceProviders: [{ role: "Obligor and co-owner", name: "Masdar" }, { role: "Offtaker", name: "Emirates Water and Electricity Company (EWEC)" }, { role: "Sharia adviser", name: "Dar Al Sharia" }, { role: "Delegate and trustee", name: "Apex Group" }, { role: "Legal counsel", name: "Allen Overy Shearman" }] },
  { id: "iss_acred", name: "Securitize Tokenized Apollo Diversified Credit Fund, Ltd.", type: "fund", jurisdiction: "VG", registrationNumber: "2156443", sponsor: "Apollo Global Management", contact: "investors@securitize.io", kybStatus: "approved", assetsCount: 1, createdAt: "2025-01-29T00:00:00Z", licence: "Feeder into Apollo Diversified Credit Fund",
    serviceProviders: [{ role: "Investment manager (master fund)", name: "Apollo Global Management" }, { role: "Transfer agent and tokenisation", name: "Securitize" }, { role: "Administrator", name: "Apex Group" }] },
  { id: "iss_hl", name: "Hamilton Lane Global Private Assets Fund", type: "fund", jurisdiction: "EU-LU", registrationNumber: "B259102", sponsor: "Hamilton Lane", contact: "gpa@hamiltonlane.com", kybStatus: "approved", assetsCount: 1, createdAt: "2025-03-10T00:00:00Z", licence: "Luxembourg SICAV, CSSF supervised",
    serviceProviders: [{ role: "Investment manager", name: "Hamilton Lane" }, { role: "Tokenised access", name: "Securitize" }, { role: "Depositary", name: "State Street Bank International" }, { role: "Auditor", name: "PwC Luxembourg" }] },
  { id: "iss_kafd", name: "KAFD Grade-A Office Income Fund", type: "fund", jurisdiction: "SA", registrationNumber: "CMA-REF-1147", sponsor: "Riyad Capital", contact: "realestate@riyadcapital.com", kybStatus: "in-review", assetsCount: 1, createdAt: "2026-06-20T00:00:00Z", licence: "CMA private real estate fund",
    serviceProviders: [{ role: "Fund manager", name: "Riyad Capital" }, { role: "Valuer", name: "JLL" }, { role: "Custodian", name: "Albilad Capital" }] },
  { id: "iss_mbr", name: "MBR Solar Phase 6 Notes Issuer Ltd", type: "spv", jurisdiction: "AE-ADGM", registrationNumber: "Pending", sponsor: "Masdar", contact: "notes@mbr6-issuer.ae", kybStatus: "pending", assetsCount: 1, createdAt: "2026-09-14T00:00:00Z",
    serviceProviders: [{ role: "Project sponsor", name: "Masdar" }, { role: "Offtaker", name: "Dubai Electricity and Water Authority (DEWA)" }, { role: "Technical adviser", name: "DNV" }] },
  { id: "iss_bbr", name: "Business Bay Residences SPV Ltd", type: "spv", jurisdiction: "AE-VARA", registrationNumber: "DLD-SPV-2026-0418", sponsor: "SRH Real Estate Partners", contact: "spv@srh.inc", kybStatus: "approved", assetsCount: 1, createdAt: "2026-06-01T00:00:00Z", licence: "Dubai Land Department property tokenisation programme",
    serviceProviders: [{ role: "Property manager", name: "Betterhomes" }, { role: "Valuer", name: "Cavendish Maxwell" }, { role: "Title registration", name: "Dubai Land Department" }] },
  { id: "iss_xyz", name: "Talara Structured Products SPV", type: "spv", jurisdiction: "AE-DIFC", registrationNumber: "CL9004", sponsor: "Talara Securities LLC", contact: "spv@talarasecurities.example", kybStatus: "approved", assetsCount: 2, createdAt: "2026-05-20T00:00:00Z" },
  { id: "iss_ngt", name: "Northgate Fund Vehicles", type: "fund", jurisdiction: "SA", registrationNumber: "CMA-FND-5512", sponsor: "Northgate Asset Management Co.", contact: "funds@northgate-am.example", kybStatus: "approved", assetsCount: 2, createdAt: "2026-01-25T00:00:00Z" },
  { id: "iss_mrd", name: "Meridian Bank B.S.C.", type: "corporate", jurisdiction: "BH", registrationNumber: "CR-11203", sponsor: "Meridian Bank", contact: "treasury@meridianbank.example", kybStatus: "approved", assetsCount: 1, createdAt: "2026-03-01T00:00:00Z" },
];

/* ----------------------------- market history ---------------------------- */
// LBMA gold price, USD per troy ounce, month-end. Anchored on published fixes (Jan 2025 2,812; Dec 2025 4,368; Feb 2026 5,222; Jun 2026 4,026; Sep 2026 4,261).
const GOLD_OZ: [string, number][] = [
  ["2024-10-31", 2730], ["2024-11-29", 2650], ["2024-12-31", 2610], ["2025-01-31", 2812], ["2025-02-28", 2858], ["2025-03-31", 3115], ["2025-04-30", 3280], ["2025-05-30", 3290],
  ["2025-06-30", 3300], ["2025-07-31", 3340], ["2025-08-29", 3420], ["2025-09-30", 3820], ["2025-10-31", 4010], ["2025-11-28", 4150], ["2025-12-31", 4368], ["2026-01-30", 4982],
  ["2026-02-27", 5222], ["2026-03-31", 4870], ["2026-04-30", 4560], ["2026-05-29", 4290], ["2026-06-30", 4026], ["2026-07-31", 4140], ["2026-08-31", 4195], ["2026-09-25", 4261], ["2026-10-06", 4255],
];
// US 3-month Treasury bill rate, monthly average (FRED TB3MS shape; May to Sep 2026 published values).
const TBILL: [string, number][] = [
  ["2025-01-15", 4.21], ["2025-02-15", 4.22], ["2025-03-15", 4.2], ["2025-04-15", 4.21], ["2025-05-15", 4.25], ["2025-06-15", 4.23], ["2025-07-15", 4.25], ["2025-08-15", 4.12],
  ["2025-09-15", 3.92], ["2025-10-15", 3.82], ["2025-11-15", 3.78], ["2025-12-15", 3.62], ["2026-01-15", 3.6], ["2026-02-15", 3.62], ["2026-03-15", 3.65], ["2026-04-15", 3.62],
  ["2026-05-15", 3.6], ["2026-06-15", 3.66], ["2026-07-15", 3.73], ["2026-08-15", 3.72], ["2026-09-15", 3.94], ["2026-10-06", 3.95],
];
const interp = (series: [string, number][], t: number) => {
  const pts = series.map(([d, v]) => [new Date(d).getTime(), v] as const);
  if (t <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) if (t <= pts[i][0]) { const [t0, v0] = pts[i - 1], [t1, v1] = pts[i]; return v0 + ((v1 - v0) * (t - t0)) / (t1 - t0); }
  return pts[pts.length - 1][1];
};
const GRAM = 31.1035;
const goldPerGram = (t: number) => interp(GOLD_OZ, t) / GRAM;
const TBILL_FUND_START = new Date("2025-07-01T00:00:00Z").getTime();
/** Accumulating fund NAV: compounds the T-bill rate net of 25 bp fees from 1.0000 at launch. */
const tbillNav = (t: number) => { let nav = 1; for (let x = TBILL_FUND_START; x < t; x += DAY) nav *= 1 + (interp(TBILL, x) - 0.25) / 100 / 365; return nav; };
const TBILL_NAV_NOW = round(tbillNav(NOW), 4);
const GOLD_NOW = round(goldPerGram(NOW), 2);
const TBILL_YIELD_NOW = round(interp(TBILL, NOW) - 0.25, 2);
// Zero-coupon note: face 100, yield 6.10%, issued 30 Jun 2026, matures 30 Jun 2029. Price = 100 / 1.061^3.
const ZERO_YIELD = 6.1;
const zeroPrice = (t: number, y = ZERO_YIELD) => round(100 / Math.pow(1 + y / 100, (new Date("2029-06-30").getTime() - t) / (365.25 * DAY)), 2);

/* --------------------------------- assets ------------------------------ */
type ClassSeed = { symbol: string; name: string; tier: D.TokenTier; targetReturnPct: number; supply: number; rights: string; price: number };
type AssetSeed = Omit<D.Asset, "aum" | "investorsCount" | "navHistory" | "tokenClassIds" | "documents" | "shareClasses" | "policyPackIds"> & {
  supply: number; chains: D.Chain[]; symbol: string; standard: D.TokenStandard; offering?: Partial<D.Offering> & { status: D.Offering["status"] };
  classes?: { name: string; fee: number; min: number; cls: D.InvestorClassification[] }[];
  tier?: D.TokenTier; extraClasses?: ClassSeed[]; rights?: string;
};

const ELIG_PRO: D.InvestorClassification[] = ["professional", "accredited", "qualified-purchaser", "institutional", "market-counterparty"];
const ELIG_ALL: D.InvestorClassification[] = ["retail", ...ELIG_PRO];

// Whitworth Park, published 2026/27 room data: 815 standard rooms at GBP 122 a week, 413 rooms with basin at GBP 131, 15 super singles at GBP 145, 41-week contract.
const WPK_GROSS_RENT = 815 * 122 * 41 + 413 * 131 * 41 + 15 * 145 * 41; // 6,384,654
const WPK_NOI = Math.round(WPK_GROSS_RENT * 0.98 * 0.68);
const WPK_VALUE = Math.round(WPK_NOI / 0.0525 / 100_000) * 100_000;

const assetSeeds: AssetSeed[] = [
  {
    id: "ast_tbill", tenantId: T_SRH, name: "SRH Short Duration Treasury Fund", shortName: "Treasury Fund", template: "treasury-fund", status: "live", issuerId: "iss_srhlf",
    description: "Open-ended fund holding US Treasury bills with under 12 months to maturity. Daily NAV, daily subscriptions and same-day redemptions on stablecoin rails.",
    underlying: { description: "US Treasury bills, 0 to 12 month tenor, held at BNY", appraisedValue: 148_200_000, appraiser: "Daily NAV by Apex Group", metrics: [{ label: "Weighted average maturity", value: "71 days" }, { label: "3-month T-bill rate", value: interp(TBILL, NOW).toFixed(2) + "%" }, { label: "Holdings", value: "23 T-bill lines" }, { label: "Cash buffer", value: "3.1%" }] },
    legalEntity: { name: "SRH Liquidity Fund SPC, Class I Segregated Portfolio", structure: "Fund", jurisdiction: "AE-ADGM", registrationNumber: "000004120-SP1" },
    instrument: { type: "fund-unit", votingRights: false },
    valuation: { method: "Daily NAV (amortised cost plus accrued yield)", nav: 148_200_000, navPerToken: TBILL_NAV_NOW, currency: "USD", frequency: "daily", lastUpdated: daysAgo(0), oracle: "Chainlink" },
    income: { type: "Accumulating yield", frequency: "daily-accrual", targetYieldPct: TBILL_YIELD_NOW }, servicer: "Apex Group",
    ownershipModel: "hybrid", jurisdiction: "AE-ADGM", regimes: ["AE-ADGM", "AE-VARA"], oracleMode: "automated",
    rules: { lockupDays: 0, holdingLimitPct: 20, minInvestment: 10_000, eligibleClassifications: ELIG_PRO, blockedCountries: ["US", "KP", "IR", "SY"] },
    createdAt: "2025-05-10T00:00:00Z", launchedAt: "2025-07-01T00:00:00Z", visual: "treasury",
    supply: 141_385_231, chains: ["ethereum", "polygon", "base", "solana"], symbol: "SRHT", standard: "ERC-3643",
    offering: { status: "open", type: "continuous", pricePerToken: TBILL_NAV_NOW, target: 250_000_000, subscribed: 148_200_000, minTicket: 10_000, maxTicket: 25_000_000, rails: ["usdc", "usdt", "swift", "aed-stablecoin", "tokenized-deposit"], settlement: "atomic", closesAt: daysAhead(365) },
    classes: [{ name: "Class I (Institutional)", fee: 15, min: 250_000, cls: ["institutional", "qualified-purchaser", "market-counterparty"] }, { name: "Class P (Professional)", fee: 35, min: 10_000, cls: ["professional", "accredited"] }],
    highlights: ["Daily liquidity", "US government credit", "Same-day redemption in USDC"],
  },
  {
    id: "ast_wpk", tenantId: T_SRH, name: "Whitworth Park Student Residences", shortName: "Whitworth Park", template: "real-estate", status: "live", issuerId: "iss_wpk",
    description: "Long-leasehold income interest in Whitworth Park, the University of Manchester's 1,243-room undergraduate halls on Oxford Road. The University operates the halls under a 35-year lease with index-linked rent.",
    underlying: {
      description: "Eight low-rise residential blocks of 7 to 9 bedroom flats with shared kitchens, a bar, gym, squash court and music room",
      location: "316 Oxford Road, Manchester M13 9WJ, United Kingdom", appraisedValue: WPK_VALUE, appraiser: "Knight Frank (RICS Red Book)",
      metrics: [{ label: "Rooms", value: "1,243" }, { label: "Weekly rent", value: "GBP 122 to 145" }, { label: "Contract", value: "41 weeks, utilities included" }, { label: "Occupancy (2025/26)", value: "98%" }, { label: "Net initial yield", value: "5.25%" }, { label: "Walk to campus", value: "9 minutes" }],
    },
    legalEntity: { name: "Whitworth Park Residences SPV Ltd", structure: "SPV", jurisdiction: "AE-ADGM", registrationNumber: "000013377" },
    instrument: { type: "equity", votingRights: true },
    valuation: { method: "Semi-annual RICS Red Book valuation (income approach)", nav: Math.round(1_642_300 * 10.24 + 1_500_000 * 10.38), navPerToken: 10.24, currency: "GBP", frequency: "quarterly", lastUpdated: daysAgo(9) },
    income: { type: "Rental distributions", frequency: "quarterly", targetYieldPct: 6.25 }, servicer: "The University of Manchester Accommodation Office",
    ownershipModel: "transfer-agent", jurisdiction: "AE-ADGM", regimes: ["AE-ADGM", "GB"], oracleMode: "manual", sponsorName: "The University of Manchester",
    rules: { lockupDays: 180, holdingLimitPct: 10, minInvestment: 10_000, eligibleClassifications: ELIG_PRO, blockedCountries: ["US", "KP", "IR", "SY"] },
    createdAt: "2026-05-06T00:00:00Z", launchedAt: "2026-08-18T00:00:00Z", visual: "tower",
    supply: 1_642_300, chains: ["ethereum", "polygon"], symbol: "WPKS", standard: "ERC-3643", tier: "senior", rights: "6.25% preferred income, paid quarterly, first in the waterfall",
    extraClasses: [{ symbol: "WPKO", name: "Whitworth Park Ordinary Units", tier: "ordinary", targetReturnPct: 9.4, supply: 1_500_000, rights: "Residual income and capital growth after senior units", price: 10.38 }],
    offering: { status: "open", type: "primary", pricePerToken: 10, target: 25_000_000, subscribed: 16_423_000, minTicket: 10_000, maxTicket: 2_500_000, rails: ["swift", "sepa", "usdc", "card"], settlement: "dvp", closesAt: daysAhead(38) },
    debt: undefined,
    profile: [{ label: "Property type", value: "Purpose-built student accommodation" }, { label: "Tenure", value: "Long leasehold income strip, 35 years" }, { label: "Rooms", value: "1,243" }, { label: "Blocks", value: "8" }, { label: "Year built", value: "1970s, refurbished 2015 to 2019" }, { label: "Operator", value: "The University of Manchester" }],
    highlights: ["University-operated halls", "Index-linked rent", "Senior income units"],
  },
  {
    id: "ast_vgld", tenantId: T_SRH, name: "SRH Allocated Gold", shortName: "Allocated Gold", template: "commodity", status: "live", issuerId: "iss_gold",
    description: "Each token is one gram of LBMA Good Delivery gold held allocated and insured at Brink's in Dubai. Physical delivery available from one kilobar.",
    underlying: { description: "Allocated LBMA Good Delivery kilobars and 400 oz bars, serial-numbered", location: "Brink's vault, Dubai, UAE", appraisedValue: Math.round(GOLD_NOW * 343_046), appraiser: "LBMA Gold Price PM", metrics: [{ label: "Gold held", value: "343.0 kg" }, { label: "Bars", value: "27" }, { label: "Last bar audit", value: "18 days ago (Inspectorate)" }, { label: "Proof of reserve", value: "Chainlink, daily" }] },
    legalEntity: { name: "SRH Gold Trust", structure: "Trust", jurisdiction: "AE-ADGM", registrationNumber: "000008841" },
    instrument: { type: "fund-unit", votingRights: false },
    valuation: { method: "LBMA Gold Price PM per gram", nav: Math.round(GOLD_NOW * 343_046), navPerToken: GOLD_NOW, currency: "USD", frequency: "daily", lastUpdated: daysAgo(0), oracle: "LBMA Gold Price" },
    income: { type: "Non-distributing", frequency: "annual", targetYieldPct: 0 }, servicer: "Brink's Global Services",
    ownershipModel: "custodian", jurisdiction: "AE-ADGM", regimes: ["AE-ADGM", "AE-VARA"], oracleMode: "automated",
    rules: { lockupDays: 0, holdingLimitPct: 30, minInvestment: 500, eligibleClassifications: ELIG_ALL, blockedCountries: ["KP", "IR", "SY"] },
    createdAt: "2024-12-09T00:00:00Z", launchedAt: "2025-01-15T00:00:00Z", visual: "gold",
    supply: 343_046, chains: ["ethereum", "solana"], symbol: "SRHG", standard: "ERC-3643",
    offering: { status: "open", type: "continuous", pricePerToken: GOLD_NOW, target: 150_000_000, subscribed: Math.round(GOLD_NOW * 343_046), minTicket: 500, maxTicket: 10_000_000, rails: ["usdc", "aed-stablecoin", "card", "swift"], settlement: "atomic", closesAt: daysAhead(365) },
    profile: [{ label: "Metal", value: "Gold, 995.0 fineness or better" }, { label: "Unit", value: "1 gram per token" }, { label: "Vault", value: "Brink's, Dubai" }, { label: "Insurance", value: "Full replacement value, Lloyd's" }],
    highlights: ["One gram per token", "Allocated, audited bars", "Delivery from 1 kg"],
  },
  {
    id: "ast_ads", tenantId: T_SRH, name: "Al Dhafra Solar Green Sukuk 2031", shortName: "Al Dhafra Sukuk 31", template: "sukuk", status: "live", issuerId: "iss_ads",
    description: "Ijara green sukuk over a share of the 2 GW Al Dhafra Solar PV plant, which sells its output to EWEC under a long-term power purchase agreement.",
    underlying: { description: "Ijara over generation assets of Al Dhafra Solar PV", location: "Al Dhafra, 35 km from Abu Dhabi city", appraisedValue: 210_000_000, appraiser: "Independent technical and financial adviser", metrics: [{ label: "Plant capacity", value: "2 GW (DC)" }, { label: "Panels", value: "About 4 million bifacial" }, { label: "Homes powered", value: "About 200,000" }, { label: "Tariff", value: "1.32 US cents per kWh" }, { label: "Fully operational", value: "June 2023" }] },
    legalEntity: { name: "Al Dhafra Solar Sukuk Ltd", structure: "Sukuk SPV", jurisdiction: "AE-ADGM", registrationNumber: "000011245" },
    instrument: { type: "sukuk-certificate", couponPct: 5.4, maturity: "2031-06-30T00:00:00Z", seniority: "senior", votingRights: false },
    valuation: { method: "Mark to model against the GCC sukuk curve", nav: 75_600_000, navPerToken: 1004.6, currency: "USD", frequency: "daily", lastUpdated: daysAgo(0) },
    income: { type: "Periodic distribution amount", frequency: "semi-annual", targetYieldPct: 5.4 }, servicer: "SRH Registrar Ltd",
    ownershipModel: "csd", jurisdiction: "AE-ADGM", regimes: ["AE-ADGM", "AE-DIFC"], oracleMode: "automated", sponsorName: "Masdar",
    rules: { lockupDays: 0, holdingLimitPct: 25, minInvestment: 50_000, eligibleClassifications: ["professional", "institutional", "market-counterparty", "qualified-purchaser"], blockedCountries: ["KP", "IR", "SY"] },
    createdAt: "2025-12-18T00:00:00Z", launchedAt: "2026-03-02T00:00:00Z", visual: "sukuk",
    supply: 75_000, chains: ["ethereum", "base"], symbol: "ADS31", standard: "ERC-3643",
    offering: { status: "completed", type: "primary", pricePerToken: 1000, target: 75_000_000, subscribed: 75_000_000, minTicket: 50_000, maxTicket: 20_000_000, rails: ["swift", "tokenized-deposit", "aed-stablecoin"], settlement: "dvp", closesAt: daysAgo(220) },
    profile: [{ label: "Sukuk structure", value: "Ijara" }, { label: "Sharia adviser", value: "Dar Al Sharia" }, { label: "Offtaker", value: "EWEC" }, { label: "Green framework", value: "ICMA Green Bond Principles" }],
    highlights: ["Sharia compliant", "Contracted solar revenue", "Semi-annual profit"],
  },
  {
    id: "ast_acred", tenantId: T_SRH, name: "Apollo Diversified Credit (ACRED)", shortName: "Apollo Credit", template: "private-credit", status: "live", issuerId: "iss_acred",
    description: "Tokenised feeder into Apollo Diversified Credit Fund: corporate direct lending, asset-backed lending, performing credit and dislocated credit across Apollo's platform.",
    underlying: { description: "Units of Apollo Diversified Credit Fund", appraisedValue: 95_300_000, appraiser: "Monthly NAV by the fund administrator", metrics: [{ label: "Strategy", value: "Diversified private credit" }, { label: "Sleeves", value: "Direct lending, asset-backed, performing, dislocated" }, { label: "Liquidity", value: "Quarterly, subject to limits" }, { label: "Chains", value: "7 networks" }] },
    legalEntity: { name: "Securitize Tokenized Apollo Diversified Credit Fund, Ltd.", structure: "Fund", jurisdiction: "VG", registrationNumber: "2156443" },
    instrument: { type: "fund-unit", votingRights: false },
    valuation: { method: "Monthly NAV of master fund", nav: 95_300_000, navPerToken: 1109.4, currency: "USD", frequency: "monthly", lastUpdated: daysAgo(6) },
    income: { type: "Accumulating distributions", frequency: "monthly", targetYieldPct: 8.6 }, servicer: "Securitize",
    ownershipModel: "transfer-agent", jurisdiction: "VG", regimes: ["VG", "AE-ADGM"], oracleMode: "manual", sponsorName: "Apollo Global Management",
    rules: { lockupDays: 90, holdingLimitPct: 15, minInvestment: 50_000, eligibleClassifications: ["professional", "qualified-purchaser", "institutional", "market-counterparty"], blockedCountries: ["US", "KP", "IR", "SY"] },
    createdAt: "2025-02-12T00:00:00Z", launchedAt: "2025-03-01T00:00:00Z", visual: "credit",
    supply: 85_903, chains: ["ethereum", "solana", "polygon", "avalanche"], symbol: "ACRED", standard: "ERC-3643",
    offering: { status: "open", type: "continuous", pricePerToken: 1109.4, target: 150_000_000, subscribed: 95_300_000, minTicket: 50_000, maxTicket: 10_000_000, rails: ["usdc", "swift"], settlement: "async", closesAt: daysAhead(300) },
    highlights: ["Apollo-managed master fund", "Monthly subscriptions", "Multi-chain units"],
  },
  {
    id: "ast_hlpaf", tenantId: T_SRH, name: "Hamilton Lane Global Private Assets Fund", shortName: "Hamilton Lane GPA", template: "private-equity", status: "live", issuerId: "iss_hl",
    description: "Evergreen private markets fund investing across direct equity, secondaries and co-investments, with monthly subscriptions and quarterly liquidity. Tokenised units for professional investors.",
    underlying: { description: "Diversified portfolio of private equity, secondaries and co-investments", appraisedValue: 64_000_000, appraiser: "Monthly NAV, IPEV guidelines", metrics: [{ label: "Strategies", value: "Direct equity, secondaries, co-investments" }, { label: "Subscriptions", value: "Monthly" }, { label: "Liquidity", value: "Quarterly, up to 5% of NAV" }, { label: "Vintage diversification", value: "2014 to 2026" }] },
    legalEntity: { name: "Hamilton Lane Global Private Assets Fund", structure: "Fund", jurisdiction: "EU-LU", registrationNumber: "B259102" },
    instrument: { type: "fund-unit", votingRights: false },
    valuation: { method: "Monthly NAV (IPEV guidelines)", nav: 64_000_000, navPerToken: 1.312, currency: "USD", frequency: "monthly", lastUpdated: daysAgo(6) },
    income: { type: "Capital growth", frequency: "annual", targetYieldPct: 11.5 }, servicer: "State Street Bank International",
    ownershipModel: "transfer-agent", jurisdiction: "EU-LU", regimes: ["EU-LU", "EU", "AE-DIFC"], oracleMode: "manual", sponsorName: "Hamilton Lane",
    rules: { lockupDays: 365, holdingLimitPct: 10, minInvestment: 25_000, eligibleClassifications: ["professional", "qualified-purchaser", "institutional"], blockedCountries: ["US", "KP", "IR", "SY"] },
    createdAt: "2025-03-10T00:00:00Z", launchedAt: "2025-05-02T00:00:00Z", visual: "growth",
    supply: 48_780_488, chains: ["ethereum", "polygon"], symbol: "HLGPA", standard: "ERC-3643",
    offering: { status: "open", type: "continuous", pricePerToken: 1.312, target: 120_000_000, subscribed: 64_000_000, minTicket: 25_000, maxTicket: 10_000_000, rails: ["swift", "sepa", "usdc"], settlement: "async", closesAt: daysAhead(240) },
    highlights: ["Evergreen access to private equity", "Monthly entry", "Quarterly liquidity"],
  },
  {
    id: "ast_kafd", tenantId: T_SRH, name: "KAFD Grade-A Office Income Fund", shortName: "KAFD Offices", template: "real-estate", status: "in-review", issuerId: "iss_kafd",
    description: "Grade-A office floors in the King Abdullah Financial District, let to regional headquarters tenants. Riyadh prime office occupancy reached 97% in Q2 2026. Pending CMA approval.",
    underlying: { description: "Twelve office floors across two KAFD towers, 41,200 sqm NLA", location: "King Abdullah Financial District, Riyadh", appraisedValue: 520_000_000, appraiser: "JLL (draft)", metrics: [{ label: "Occupancy", value: "97%" }, { label: "WALE", value: "5.4 years" }, { label: "Prime rent growth (KAFD)", value: "3% year on year" }, { label: "Target distribution yield", value: "6.9%" }] },
    legalEntity: { name: "KAFD Grade-A Office Income Fund", structure: "Fund", jurisdiction: "SA", registrationNumber: "CMA-REF-1147" },
    instrument: { type: "fund-unit", votingRights: true },
    valuation: { method: "Semi-annual independent valuation", nav: 520_000_000, navPerToken: 10.0, currency: "SAR", frequency: "quarterly", lastUpdated: daysAgo(15) },
    income: { type: "Rental distributions", frequency: "quarterly", targetYieldPct: 6.9 }, servicer: "Riyad Capital",
    ownershipModel: "hybrid", jurisdiction: "SA", regimes: ["SA"], oracleMode: "manual", sponsorName: "Riyad Capital",
    rules: { lockupDays: 365, holdingLimitPct: 10, minInvestment: 100_000, eligibleClassifications: ["professional", "institutional", "qualified-purchaser"], blockedCountries: ["US", "KP", "IR", "SY"] },
    createdAt: "2026-06-22T00:00:00Z", visual: "tower",
    supply: 0, chains: ["ethereum", "base"], symbol: "KAFD", standard: "ERC-3643",
    offering: { status: "upcoming", type: "primary", pricePerToken: 10, target: 200_000_000, subscribed: 0, minTicket: 100_000, maxTicket: 20_000_000, rails: ["swift", "local-rail"], settlement: "dvp", opensAt: daysAhead(21), closesAt: daysAhead(80) },
    highlights: ["Regional headquarters tenants", "97% occupied market", "Quarterly income"],
  },
  {
    id: "ast_mbr6", tenantId: T_SRH, name: "MBR Solar Park Phase 6 Notes", shortName: "MBR Solar 6", template: "infrastructure", status: "structuring", issuerId: "iss_mbr",
    description: "Amortising notes financing part of the 1,800 MW sixth phase of the Mohammed bin Rashid Al Maktoum Solar Park, built by Masdar with DEWA as offtaker. Structuring in progress.",
    underlying: { description: "Senior amortising notes secured on project revenues under a 25-year PPA", location: "Seih Al Dahal, Dubai", appraisedValue: 150_000_000, metrics: [{ label: "Phase capacity", value: "1,800 MW" }, { label: "Park target", value: "5,000 MW by 2030" }, { label: "PPA tenor", value: "25 years" }] },
    legalEntity: { name: "MBR Solar Phase 6 Notes Issuer Ltd", structure: "SPV", jurisdiction: "AE-ADGM", registrationNumber: "Pending" },
    instrument: { type: "note", couponPct: 7.25, maturity: "2036-12-31T00:00:00Z", seniority: "senior", votingRights: false },
    valuation: { method: "Discounted cash flow on contracted revenue", nav: 0, navPerToken: 1000, currency: "USD", frequency: "quarterly", lastUpdated: daysAgo(3) },
    income: { type: "Interest plus amortisation", frequency: "semi-annual", targetYieldPct: 7.25 }, servicer: "SRH Registrar Ltd",
    ownershipModel: "csd", jurisdiction: "AE-ADGM", regimes: ["AE-ADGM"], oracleMode: "manual", sponsorName: "Masdar",
    rules: { lockupDays: 0, holdingLimitPct: 20, minInvestment: 100_000, eligibleClassifications: ["professional", "institutional"], blockedCountries: ["US", "KP", "IR", "SY"] },
    createdAt: "2026-09-14T00:00:00Z", visual: "solar",
    supply: 0, chains: ["ethereum"], symbol: "MBR6", standard: "ERC-1400",
  },
  {
    id: "ast_bbr", tenantId: T_SRH, name: "Business Bay Residences", shortName: "Business Bay", template: "spv-shares", status: "live", issuerId: "iss_bbr",
    description: "Shares in an SPV that owns six furnished apartments in Business Bay, Dubai, title registered with the Dubai Land Department. Entry from AED 2,000.",
    underlying: { description: "Six one and two bedroom apartments let on 12-month tenancies", location: "Business Bay, Dubai, UAE", appraisedValue: 14_700_000, appraiser: "Cavendish Maxwell", metrics: [{ label: "Apartments", value: "6" }, { label: "Occupancy", value: "100%" }, { label: "Gross rental yield", value: "7.8%" }, { label: "Title", value: "DLD registered" }] },
    legalEntity: { name: "Business Bay Residences SPV Ltd", structure: "SPV", jurisdiction: "AE-VARA", registrationNumber: "DLD-SPV-2026-0418" },
    instrument: { type: "equity", votingRights: true },
    valuation: { method: "Quarterly valuation, net asset value of the SPV", nav: 13_200_000, navPerToken: 10.42, currency: "AED", frequency: "quarterly", lastUpdated: daysAgo(12) },
    income: { type: "Dividends from net rent", frequency: "quarterly", targetYieldPct: 6.1 }, servicer: "Betterhomes",
    ownershipModel: "transfer-agent", jurisdiction: "AE-VARA", regimes: ["AE-VARA"], oracleMode: "manual",
    rules: { lockupDays: 90, holdingLimitPct: 20, minInvestment: 2_000, eligibleClassifications: ELIG_ALL, blockedCountries: ["US", "KP", "IR", "SY"] },
    createdAt: "2026-06-01T00:00:00Z", launchedAt: "2026-07-20T00:00:00Z", visual: "tower",
    supply: 1_266_800, chains: ["polygon"], symbol: "BBRS", standard: "ERC-3643",
    offering: { status: "open", type: "primary", pricePerToken: 10.42, target: 14_700_000, subscribed: 13_200_000, minTicket: 2_000, maxTicket: 500_000, rails: ["card", "local-rail", "aed-stablecoin"], settlement: "dvp", closesAt: daysAhead(12) },
    profile: [{ label: "Property type", value: "Residential apartments" }, { label: "Units", value: "6" }, { label: "Shares in issue", value: "1,410,000 at completion" }, { label: "Registrar", value: "Dubai Land Department" }],
    highlights: ["From AED 2,000", "DLD registered title", "Quarterly dividends"],
  },
  {
    id: "ast_xyz_res", tenantId: T_XYZ, name: "Dubai Marina Serviced Residences", shortName: "Marina Residences", template: "real-estate", status: "live", issuerId: "iss_xyz",
    description: "Income units over 212 furnished rental apartments in Dubai Marina, managed short and mid-term lets. Distributed by Talara Securities under its own licence.",
    underlying: { description: "212 serviced apartments", location: "Dubai Marina, UAE", appraisedValue: 58_000_000, metrics: [{ label: "Occupancy", value: "88%" }, { label: "Average daily rate", value: "AED 690" }] },
    legalEntity: { name: "Talara Structured Products SPV, Cell 3", structure: "SPV", jurisdiction: "AE-DIFC", registrationNumber: "CL9004-C3" },
    instrument: { type: "revenue-share", votingRights: false },
    valuation: { method: "Quarterly appraisal", nav: 31_200_000, navPerToken: 5.2, currency: "USD", frequency: "quarterly", lastUpdated: daysAgo(10) },
    income: { type: "Net rental revenue share", frequency: "monthly", targetYieldPct: 8.4 }, servicer: "Talara Property Services",
    ownershipModel: "custodian", jurisdiction: "AE-DIFC", regimes: ["AE-DIFC"],
    rules: { lockupDays: 90, holdingLimitPct: 10, minInvestment: 5_000, eligibleClassifications: ELIG_PRO, blockedCountries: ["US", "KP", "IR", "SY"] },
    createdAt: "2026-05-25T00:00:00Z", launchedAt: "2026-07-01T00:00:00Z", visual: "tower",
    supply: 6_000_000, chains: ["polygon"], symbol: "XMCR", standard: "ERC-3643",
    offering: { status: "open", type: "primary", pricePerToken: 5.2, target: 40_000_000, subscribed: 31_200_000, minTicket: 5_000, maxTicket: 2_000_000, rails: ["local-rail", "swift", "card"], settlement: "async", closesAt: daysAhead(40) },
  },
  {
    id: "ast_xyz_zero", tenantId: T_XYZ, name: "Talara Zero Coupon Note 2029", shortName: "Talara Zero 29", template: "bond", status: "live", issuerId: "iss_xyz",
    description: "Three-year zero-coupon note issued at a discount and redeemed at par in June 2029. The return comes from the discount: 6.10% a year compounded.",
    underlying: { description: "Senior unsecured zero-coupon note", appraisedValue: 25_000_000, metrics: [{ label: "Issue price", value: zeroPrice(new Date("2026-06-30").getTime()).toFixed(2) + " per 100" }, { label: "Redemption", value: "100 at maturity" }, { label: "Yield to maturity", value: "6.10%" }] },
    legalEntity: { name: "Talara Structured Products SPV, Cell 5", structure: "SPV", jurisdiction: "AE-DIFC", registrationNumber: "CL9004-C5" },
    instrument: { type: "debt", couponPct: 0, maturity: "2029-06-30T00:00:00Z", seniority: "senior", votingRights: false },
    valuation: { method: "Accreted value at yield to maturity", nav: round(250_000 * zeroPrice(NOW)), navPerToken: zeroPrice(NOW), currency: "USD", frequency: "daily", lastUpdated: daysAgo(0) },
    income: { type: "Discount accretion, paid at maturity", frequency: "annual", targetYieldPct: ZERO_YIELD }, servicer: "Talara Securities LLC",
    ownershipModel: "custodian", jurisdiction: "AE-DIFC", regimes: ["AE-DIFC"],
    rules: { lockupDays: 0, holdingLimitPct: 25, minInvestment: 10_000, eligibleClassifications: ELIG_PRO, blockedCountries: ["US", "KP", "IR", "SY"] },
    createdAt: "2026-06-01T00:00:00Z", launchedAt: "2026-06-30T00:00:00Z", visual: "credit",
    supply: 250_000, chains: ["polygon"], symbol: "TZ29", standard: "ERC-3643",
    offering: { status: "completed", type: "primary", pricePerToken: zeroPrice(new Date("2026-06-30").getTime()), target: 25_000_000, subscribed: 25_000_000, minTicket: 10_000, maxTicket: 5_000_000, rails: ["swift", "local-rail"], settlement: "dvp", closesAt: daysAgo(98) },
  },
  {
    id: "ast_ngt_pc", tenantId: T_NGT, name: "Northgate Senior Private Credit Fund", shortName: "Northgate Credit", template: "private-credit", status: "live", issuerId: "iss_ngt",
    description: "Senior secured lending to mid-market Saudi corporates. Deployed in a dedicated environment with customer-managed keys.",
    underlying: { description: "Portfolio of 18 senior secured loans", appraisedValue: 92_000_000, metrics: [{ label: "Loans", value: "18" }, { label: "Weighted LTV", value: "46%" }] },
    legalEntity: { name: "Northgate Senior Credit Fund", structure: "Fund", jurisdiction: "SA", registrationNumber: "CMA-FND-5512" },
    instrument: { type: "fund-unit", votingRights: false },
    valuation: { method: "Monthly NAV", nav: 92_000_000, navPerToken: 10.47, currency: "SAR", frequency: "monthly", lastUpdated: daysAgo(6) },
    income: { type: "Quarterly distributions", frequency: "quarterly", targetYieldPct: 9.8 }, servicer: "Northgate fund administration",
    ownershipModel: "hybrid", jurisdiction: "SA", regimes: ["SA"],
    rules: { lockupDays: 365, holdingLimitPct: 15, minInvestment: 200_000, eligibleClassifications: ["professional", "institutional"], blockedCountries: ["US", "KP", "IR", "SY"] },
    createdAt: "2026-01-30T00:00:00Z", launchedAt: "2026-04-01T00:00:00Z", visual: "credit",
    supply: 8_786_000, chains: ["ethereum"], symbol: "NSPC", standard: "ERC-3643",
    offering: { status: "open", type: "continuous", pricePerToken: 10.47, target: 150_000_000, subscribed: 92_000_000, minTicket: 200_000, maxTicket: 20_000_000, rails: ["local-rail", "swift"], settlement: "async", closesAt: daysAhead(200) },
  },
  {
    id: "ast_ngt_rcv", tenantId: T_NGT, name: "Lahore Export Receivables 2026-A", shortName: "Receivables 26-A", template: "receivables", status: "live", issuerId: "iss_ngt",
    description: "Short-tenor receivables purchased from Pakistani exporters, dollar-denominated, with first loss retained by the originator.",
    underlying: { description: "Export receivables, 30 to 120 day tenor", location: "Lahore, Pakistan", appraisedValue: 18_000_000, metrics: [{ label: "Originators", value: "9" }, { label: "First loss retained", value: "10%" }] },
    legalEntity: { name: "Northgate Receivables Vehicle 26-A", structure: "SPV", jurisdiction: "SA", registrationNumber: "CMA-SPV-0213" },
    instrument: { type: "note", couponPct: 12.0, maturity: "2027-03-31T00:00:00Z", seniority: "senior", votingRights: false },
    valuation: { method: "Amortised cost", nav: 17_600_000, navPerToken: 98.9, currency: "USD", frequency: "monthly", lastUpdated: daysAgo(6) },
    income: { type: "Interest", frequency: "monthly", targetYieldPct: 12.0 }, servicer: "Indus Trade Servicing",
    ownershipModel: "on-chain", jurisdiction: "SA", regimes: ["SA", "PK"],
    rules: { lockupDays: 30, holdingLimitPct: 25, minInvestment: 100_000, eligibleClassifications: ["professional", "institutional"], blockedCountries: ["US", "KP", "IR", "SY"] },
    createdAt: "2026-04-05T00:00:00Z", launchedAt: "2026-05-01T00:00:00Z", visual: "receivables",
    supply: 177_957, chains: ["ethereum"], symbol: "LRP26A", standard: "ERC-1400",
    offering: { status: "completed", type: "primary", pricePerToken: 100, target: 18_000_000, subscribed: 17_800_000, minTicket: 100_000, maxTicket: 5_000_000, rails: ["swift", "usdc"], settlement: "dvp", closesAt: daysAgo(150) },
  },
  {
    id: "ast_mrd_dep", tenantId: T_MRD, name: "Meridian Tokenized Deposit Note", shortName: "Meridian Deposit", template: "bond", status: "live", issuerId: "iss_mrd",
    description: "Bank-issued tokenised deposit note used for intraday settlement between Meridian corporate clients. Issued through SRH APIs only.",
    underlying: { description: "Deposit liabilities of Meridian Bank", appraisedValue: 120_000_000, metrics: [{ label: "Corporate clients", value: "37" }] },
    legalEntity: { name: "Meridian Bank B.S.C.", structure: "Corporate", jurisdiction: "BH", registrationNumber: "CR-11203" },
    instrument: { type: "note", couponPct: 3.1, votingRights: false },
    valuation: { method: "Par", nav: 120_000_000, navPerToken: 1, currency: "USD", frequency: "daily", lastUpdated: daysAgo(0) },
    income: { type: "Daily accrued interest", frequency: "daily-accrual", targetYieldPct: 3.1 }, servicer: "Meridian Treasury Ops",
    ownershipModel: "custodian", jurisdiction: "BH", regimes: ["BH"],
    rules: { lockupDays: 0, holdingLimitPct: 100, minInvestment: 1, eligibleClassifications: ["institutional", "market-counterparty", "professional"], blockedCountries: ["KP", "IR", "SY"] },
    createdAt: "2026-03-05T00:00:00Z", launchedAt: "2026-04-15T00:00:00Z", visual: "treasury",
    supply: 120_000_000, chains: ["base", "ethereum"], symbol: "MTDN", standard: "ERC-20 Permissioned",
  },
];

/* ---------------------------- token classes ---------------------------- */
const tokenClasses: D.TokenClass[] = [];
const assets: D.Asset[] = [];
const offerings: D.Offering[] = [];

const ISSUANCE_CHECKS: Record<string, string> = {
  "legal-docs": "Offering documents signed and filed",
  spv: "Issuer entity incorporated, registry extract on file",
  title: "Title, lease or custody confirmation in the issuer's name",
  valuation: "Independent valuation on file",
  regulator: "Regulatory approval or exemption confirmed",
  contract: "Token contract configuration reviewed (supply, controls, identity registry)",
};
function issuanceFor(a: AssetSeed, verified: boolean): D.TokenClass["issuance"] {
  const title = a.template === "commodity" ? "Vault certificate and bar list reconciled" : a.template === "real-estate" || a.template === "spv-shares" ? "Title or lease registered in the SPV's name" : a.template === "treasury-fund" || a.template === "private-equity" || a.template === "private-credit" ? "Fund units or assets held by the custodian" : ISSUANCE_CHECKS.title;
  const at = a.launchedAt ? iso(new Date(a.launchedAt).getTime() - 3 * DAY) : undefined;
  const checks: D.IssuanceCheck[] = Object.entries(ISSUANCE_CHECKS).map(([key, label], k) => {
    const lbl = key === "title" ? title : label;
    if (verified) return { key, label: lbl, status: "verified", by: k % 2 ? "Omar Siddiqui" : "Layla Haddad", at };
    // In review: documents and entity done, valuation and regulator outstanding
    const done = key === "legal-docs" || key === "spv" || key === "contract";
    return done ? { key, label: lbl, status: "verified", by: "Layla Haddad", at: daysAgo(int(2, 9)) } : { key, label: lbl, status: "pending", note: key === "valuation" ? "Final JLL report expected this month" : key === "regulator" ? "CMA approval pending" : undefined };
  });
  return verified ? { status: "verified", checks, verifiedBy: "Omar Siddiqui", verifiedAt: at } : { status: "pending", checks };
}

const docSet = (a: AssetSeed): D.AssetDocument[] => {
  const d = (name: string, kind: D.AssetDocument["kind"], version: string, status: D.AssetDocument["status"], age: number, visibility: D.DocumentVisibility, uploadedBy = "Layla Haddad"): D.AssetDocument =>
    ({ id: id("adoc"), name, kind, version, status, updatedAt: daysAgo(age), hash: "0x" + hex(64), visibility, sizeKb: int(180, 4200), uploadedBy });
  const base: D.AssetDocument[] = [
    d(a.template === "treasury-fund" || a.template === "private-equity" || a.template === "private-credit" ? "Offering memorandum and supplement" : "Information memorandum", "offering-memorandum", "v3.2", "final", int(20, 200), "public"),
    d("Term sheet", "term-sheet", "v2.0", "signed", int(20, 200), "public"),
    d(a.legalEntity.structure + " constitutional documents", "spv-constitution", "v1.0", "signed", int(100, 300), "holders"),
    d("Legal opinion on token characterisation", "legal-opinion", "v1.1", "signed", int(40, 250), "internal"),
    d("Latest valuation report", "valuation-report", "Q3 2026", a.status === "live" ? "final" : "draft", int(5, 40), "holders"),
  ];
  if (a.template === "sukuk") base.push(d("Sharia pronouncement (Dar Al Sharia)", "sharia-opinion", "v1.0", "signed", 240, "public"));
  if (a.template === "commodity") base.push(d("Brink's vault certificate and bar list", "vault-certificate", "Sep 2026", "final", 18, "holders"), d("Inspectorate bar audit", "audit-report", "H1 2026", "final", 18, "holders"), d("Insurance certificate (Lloyd's)", "insurance", "2026", "final", 140, "holders"));
  if (a.template === "real-estate" || a.template === "spv-shares") base.push(d(a.id === "ast_bbr" ? "DLD title deeds (6 units)" : "Lease and title documents", "title-deed", "v1.0", "signed", int(60, 160), "internal"), d("Buildings insurance schedule", "insurance", "2026/27", "final", int(30, 90), "holders"));
  if (a.template === "infrastructure" || a.template === "sukuk") base.push(d(a.id === "ast_mbr6" ? "Independent engineer report (DNV)" : "Technical adviser report", "technical-report", "v1.0", a.status === "live" ? "final" : "draft", int(20, 120), "holders"));
  if (a.status === "live") base.push(d("Q2 2026 investor report", "investor-report", "Q2 2026", "final", int(60, 95), "holders", "Sara Kim"));
  return base;
};

/* NAV and price paths: anchored at both ends, moving in cycles with a generally upward trend. */
function cycleSeries(fromT: number, startV: number, endV: number, stepDays: number, amp: number, periodDays: number, noise: number, dp: number) {
  const pts: { date: string; nav: number }[] = [];
  const span = NOW - fromT;
  const phase = rand() * Math.PI * 2;
  for (let t = fromT; t <= NOW; t += stepDays * DAY) {
    const f = span ? (t - fromT) / span : 1;
    const base = startV * Math.pow(endV / startV, f);
    const wave = amp * Math.sin((2 * Math.PI * (t - fromT)) / (periodDays * DAY) + phase) * Math.sin(Math.PI * f);
    pts.push({ date: iso(t), nav: round(base * (1 + wave + between(-noise, noise) * Math.sin(Math.PI * f)), dp) });
  }
  pts[0].nav = round(startV, dp);
  pts.push({ date: iso(NOW), nav: round(endV, dp) });
  return pts;
}
function navHistory(a: AssetSeed): { date: string; nav: number }[] {
  const end = a.valuation.navPerToken;
  const launched = a.launchedAt ? new Date(a.launchedAt).getTime() : NOW - 30 * DAY;
  const from = Math.max(launched, NOW - 400 * DAY);
  switch (a.id) {
    case "ast_tbill": {
      const pts: { date: string; nav: number }[] = [];
      for (let t = from; t < NOW; t += 4 * DAY) pts.push({ date: iso(t), nav: round(tbillNav(t), 4) });
      pts.push({ date: iso(NOW), nav: end });
      return pts;
    }
    case "ast_vgld": {
      const pts: { date: string; nav: number }[] = [];
      for (let t = from; t < NOW; t += 5 * DAY) pts.push({ date: iso(t), nav: round(goldPerGram(t) * (1 + between(-0.008, 0.008)), 2) });
      pts.push({ date: iso(NOW), nav: end });
      return pts;
    }
    case "ast_ads": {
      // Price moves inversely with rates: modified duration about 4.2 against the T-bill curve plus a sukuk spread.
      const px = (t: number) => 1000 + 4.2 * (5.4 - (interp(TBILL, t) + 1.34)) * 10;
      const shift = end - px(NOW);
      const pts: { date: string; nav: number }[] = [];
      for (let t = from; t < NOW; t += 5 * DAY) pts.push({ date: iso(t), nav: round(px(t) + shift * ((t - from) / (NOW - from)) + between(-1.2, 1.2), 2) });
      pts[0].nav = 1000;
      pts.push({ date: iso(NOW), nav: end });
      return pts;
    }
    case "ast_xyz_zero": {
      const pts: { date: string; nav: number }[] = [];
      for (let t = from; t < NOW; t += 4 * DAY) pts.push({ date: iso(t), nav: round(zeroPrice(t, ZERO_YIELD + between(-0.06, 0.06)), 2) });
      pts[0].nav = zeroPrice(from);
      pts.push({ date: iso(NOW), nav: end });
      return pts;
    }
    case "ast_hlpaf": {
      // J-curve: fees and early marks first, then realised gains on secondaries.
      const pts = cycleSeries(from, 1.155, end, 30, 0.012, 150, 0.004, 4);
      if (pts.length > 4) { pts[1].nav = round(pts[0].nav * 0.988, 4); pts[2].nav = round(pts[0].nav * 0.992, 4); }
      return pts;
    }
    case "ast_acred": {
      const pts = cycleSeries(from, end / Math.pow(1.086, (NOW - from) / (365 * DAY)), end, 30, 0.004, 120, 0.002, 2);
      const apr = pts.findIndex((p) => p.date >= "2025-04-01");
      if (apr > 0) pts[apr].nav = round(pts[apr - 1].nav * 0.989, 2); // spread widening in April 2025
      return pts;
    }
    case "ast_kafd":
    case "ast_mbr6":
      return [{ date: a.valuation.lastUpdated, nav: end }];
    case "ast_mrd_dep":
      return cycleSeries(from, 1, 1, 7, 0, 30, 0, 4);
    case "ast_ngt_rcv":
      return cycleSeries(from, 100, end, 14, 0.004, 60, 0.002, 2);
    case "ast_wpk":
      return cycleSeries(from, 10, end, 7, 0.006, 28, 0.003, 2);
    case "ast_bbr":
      return cycleSeries(from, 10, end, 7, 0.008, 35, 0.004, 2);
    default: {
      const start = a.template === "real-estate" ? end / 1.05 : a.template === "private-credit" ? end / 1.04 : end / 1.03;
      return cycleSeries(from, start, end, a.valuation.frequency === "daily" ? 3 : 14, 0.012, 90, 0.004, end < 10 ? 4 : 2);
    }
  }
}

const DEBT: Record<string, D.DebtTerms> = {
  ast_ads: { faceValue: 1000, couponPct: 5.4, couponFrequency: "semi-annual", issueDate: "2026-03-02T00:00:00Z", maturity: "2031-06-30T00:00:00Z", yieldPct: 5.29, issuePrice: 1000, dayCount: "30/360" },
  ast_xyz_zero: { faceValue: 100, couponPct: 0, couponFrequency: "none", issueDate: "2026-06-30T00:00:00Z", maturity: "2029-06-30T00:00:00Z", yieldPct: ZERO_YIELD, issuePrice: zeroPrice(new Date("2026-06-30").getTime()), dayCount: "ACT/365" },
  ast_mbr6: { faceValue: 1000, couponPct: 7.25, couponFrequency: "semi-annual", issueDate: "2027-01-15T00:00:00Z", maturity: "2036-12-31T00:00:00Z", yieldPct: 7.25, issuePrice: 1000, dayCount: "30/360", amortising: true },
  ast_ngt_rcv: { faceValue: 100, couponPct: 12, couponFrequency: "monthly", issueDate: "2026-05-01T00:00:00Z", maturity: "2027-03-31T00:00:00Z", yieldPct: 12.4, issuePrice: 100, dayCount: "ACT/360" },
};

function tokenomicsFor(a: AssetSeed): D.Tokenomics {
  if (a.id === "ast_wpk") return {
    allocation: [{ label: "Senior income units (WPKS), offered", pct: 62.5 }, { label: "Ordinary units (WPKO), offered", pct: 12.5 }, { label: "Ordinary units (WPKO), retained by sponsor vehicle", pct: 25 }],
    fees: [{ label: "Subscription fee", value: "1.00%" }, { label: "Asset management fee", value: "0.50% a year of gross asset value" }, { label: "Platform and registrar fee", value: "0.35% a year" }, { label: "Exit fee", value: "None after lock-up" }],
    lockups: [{ label: "Senior units", detail: "180 days from issue" }, { label: "Sponsor ordinary units", detail: "3 years from issue" }],
    distributionPolicy: "Quarterly from net rent. Senior units are paid 6.25% a year first; ordinary units receive what remains after the reserve top-up.",
    redemption: "No redemption. After the lock-up, units can be sold on the SRH secondary market. Capital is returned on sale of the interest or at the end of the lease.",
    transferRules: "Whitelisted wallets of verified professional investors only. 10% holding limit per investor. US persons excluded.",
  };
  const fee = a.template === "private-equity" ? "1.75% a year" : a.template === "treasury-fund" ? "0.15% to 0.35% a year" : a.template === "commodity" ? "0.25% a year storage and insurance" : "0.75% a year";
  return {
    allocation: [{ label: "Offered to investors", pct: a.template === "commodity" || a.template === "treasury-fund" ? 100 : 90 }, ...(a.template === "commodity" || a.template === "treasury-fund" ? [] : [{ label: "Sponsor co-investment", pct: 10 }])],
    fees: [{ label: "Subscription fee", value: a.template === "treasury-fund" ? "None" : "Up to 1.00%" }, { label: "Management fee", value: fee }, ...(a.template === "private-equity" ? [{ label: "Performance fee", value: "12.5% over an 8% hurdle" }] : [])],
    lockups: a.rules.lockupDays ? [{ label: "All investors", detail: a.rules.lockupDays + " days from subscription" }] : [{ label: "None", detail: "Units can be redeemed or transferred at any time" }],
    distributionPolicy: a.income.targetYieldPct === 0 ? "No distributions. Value follows the underlying." : a.income.frequency === "daily-accrual" ? "Yield accrues daily into the NAV." : a.income.type + ", paid " + a.income.frequency.replace("-", " ") + ".",
    redemption: a.template === "treasury-fund" ? "Same-day redemption in USDC, next-day by SWIFT." : a.template === "commodity" ? "Redeem for cash at the LBMA price, or for physical bars from 1 kg." : a.instrument.maturity ? "Repaid at face value on " + a.instrument.maturity.slice(0, 10) + "." : "Periodic redemption windows, subject to limits.",
    transferRules: "Transfers between verified, whitelisted wallets only. Holding limit " + a.rules.holdingLimitPct + "% per investor.",
  };
}

const WAterfallWPK = (seniorId: string, ordId: string): D.WaterfallStep[] => [
  { label: "Property costs", detail: "Ground rent, insurance, maintenance and the University's operating fee" },
  { label: "SPV expenses", detail: "Trustee, audit, registrar and platform fees" },
  { label: "Senior income units", detail: "6.25% a year on paid-in capital, cumulative", tokenClassId: seniorId },
  { label: "Reserve", detail: "2% of gross rent until the reserve equals 6 months of senior income" },
  { label: "Ordinary units", detail: "All remaining income", tokenClassId: ordId },
  { label: "On exit", detail: "Senior units repaid at par first, then the balance to ordinary units" },
];

function pushTokenClass(a: AssetSeed, c: { id: string; symbol: string; name: string; supply: number; tier?: D.TokenTier; targetReturnPct?: number; rights?: string }, live: boolean) {
  const shares = a.chains.map((_, i) => (i === 0 ? 0.55 : 0.45 / Math.max(1, a.chains.length - 1)));
  const deployments: D.ChainDeployment[] = a.chains.map((chain, i) => ({
    id: id("dep"), chain, contractAddress: addrFor(chain), supply: live ? Math.round(c.supply * shares[i]) : 0,
    holders: 0, status: live ? "live" : a.status === "in-review" ? "pending" : "deploying",
    deployedAt: live ? a.launchedAt! : daysAgo(2), lastBlock: chain === "solana" ? int(312_000_000, 330_000_000) : chain === "ethereum" ? int(23_400_000, 23_600_000) : int(40_000_000, 80_000_000), gasSpendUsd: round(between(40, 4200)),
  }));
  if (live) deployments[0].supply = c.supply - deployments.slice(1).reduce((s, d) => s + d.supply, 0);
  tokenClasses.push({
    id: c.id, assetId: a.id, symbol: c.symbol, name: c.name, standard: a.standard, tier: c.tier, targetReturnPct: c.targetReturnPct, rights: c.rights,
    decimals: a.template === "treasury-fund" || c.symbol === "MTDN" ? 6 : a.template === "commodity" ? 3 : 0,
    canonicalSupply: live ? c.supply : 0,
    maxSupply: a.offering && c.symbol === a.symbol ? Math.max(Math.round(a.offering.target! / a.offering.pricePerToken!), Math.round(c.supply + (a.offering.target! - a.offering.subscribed!) / a.offering.pricePerToken!)) : Math.round(Math.max(c.supply, 1) * 1.5),
    status: "active", deployments, issuance: issuanceFor(a, live),
    controls: { pausable: true, freezable: true, forcedTransfer: true, recovery: true, mintable: true, burnable: true },
    identityRegistry: evmAddr(), complianceModule: evmAddr(), createdAt: a.createdAt,
  });
}

for (const a of assetSeeds) {
  const tcId = "tok_" + a.symbol.toLowerCase();
  const live = a.status === "live";
  const classIds: string[] = [];
  if (a.status !== "structuring") {
    pushTokenClass(a, { id: tcId, symbol: a.symbol, name: a.extraClasses ? a.name + " Senior Units" : a.name + (a.classes ? " Token" : ""), supply: a.supply, tier: a.tier, targetReturnPct: a.tier ? a.income.targetYieldPct : undefined, rights: a.rights }, live);
    classIds.push(tcId);
    for (const x of a.extraClasses ?? []) {
      const xid = "tok_" + x.symbol.toLowerCase();
      pushTokenClass(a, { id: xid, symbol: x.symbol, name: x.name, supply: x.supply, tier: x.tier, targetReturnPct: x.targetReturnPct, rights: x.rights }, live);
      classIds.push(xid);
    }
  }
  const shareClasses: D.ShareClass[] = a.extraClasses
    ? [
        { id: id("scl"), name: "Senior income units", currency: a.valuation.currency, managementFeeBps: 50, minInvestment: a.rules.minInvestment, eligibleClassifications: a.rules.eligibleClassifications, tokenClassId: tcId },
        ...a.extraClasses.map((x) => ({ id: id("scl"), name: x.name.replace(/^Whitworth Park /, ""), currency: a.valuation.currency, managementFeeBps: 50, minInvestment: 50_000, eligibleClassifications: a.rules.eligibleClassifications.filter((c) => c !== "retail"), tokenClassId: "tok_" + x.symbol.toLowerCase() })),
      ]
    : (a.classes ?? [{ name: "Ordinary", fee: a.template === "private-equity" ? 175 : 75, min: a.rules.minInvestment, cls: a.rules.eligibleClassifications }]).map((c) => ({
        id: id("scl"), name: c.name, currency: a.valuation.currency, managementFeeBps: c.fee, performanceFeeBps: a.template === "private-equity" ? 1250 : undefined, minInvestment: c.min, eligibleClassifications: c.cls, tokenClassId: a.status !== "structuring" ? tcId : undefined,
      }));
  const packs = ["pol_global", a.jurisdiction === "AE-ADGM" ? "pol_adgm" : a.jurisdiction === "AE-DIFC" ? "pol_difc" : a.jurisdiction === "AE-VARA" ? "pol_vara" : a.jurisdiction === "SA" ? "pol_cma" : a.jurisdiction === "EU-LU" ? "pol_eu" : a.jurisdiction === "CH" ? "pol_ch" : a.jurisdiction === "BH" ? "pol_cbb" : "pol_global"];
  if (a.template === "sukuk") packs.push("pol_sharia");
  if ((a.regimes ?? []).includes("GB")) packs.push("pol_uk");
  const { supply: _s, chains: _c, symbol: _sy, standard: _st, offering: _o, classes: _cl, tier: _t, extraClasses: _x, rights: _r, ...rest } = a;
  assets.push({
    ...rest, shareClasses, tokenClassIds: classIds, documents: docSet(a), policyPackIds: Array.from(new Set(packs)),
    aum: live ? a.valuation.nav : 0, investorsCount: 0, navHistory: navHistory(a),
    debt: DEBT[a.id], tokenomics: a.status === "structuring" ? undefined : tokenomicsFor(a),
    waterfall: a.extraClasses ? WAterfallWPK(tcId, "tok_" + a.extraClasses[0].symbol.toLowerCase()) : undefined,
  });
  if (a.offering) {
    offerings.push({
      id: "off_" + a.symbol.toLowerCase(), assetId: a.id, tenantId: a.tenantId, name: a.shortName + (a.offering.type === "follow-on" ? " follow-on round" : a.offering.type === "continuous" ? " continuous offering" : " primary offering"),
      type: a.offering.type!, status: a.offering.status, opensAt: a.offering.opensAt ?? (a.launchedAt ?? daysAgo(30)), closesAt: a.offering.closesAt!,
      pricePerToken: a.offering.pricePerToken!, currency: a.valuation.currency, target: a.offering.target!, subscribed: a.offering.subscribed!,
      minTicket: a.offering.minTicket!, maxTicket: a.offering.maxTicket!, investorsCount: 0,
      eligibleJurisdictions: ["AE", "SA", "BH", "KW", "QA", "OM", "SG", "GB", "CH", "LU", "DE", "FR", "PK"].filter((c) => !a.rules.blockedCountries.includes(c)),
      eligibleClassifications: a.rules.eligibleClassifications, rails: a.offering.rails!, settlement: a.offering.settlement!,
      distributor: a.tenantId === T_SRH ? "SRH Markets Ltd" : a.tenantId === T_XYZ ? "Talara Securities LLC" : a.tenantId === T_NGT ? "Northgate Asset Management Co." : "Meridian Bank",
    });
  }
}

/* ------------------------------- holdings ------------------------------ */
const holdings: D.Holding[] = [];
const eligibleFor = (a: D.Asset) => investors.filter((v) => v.tenantId === a.tenantId && v.kycStatus === "approved" && v.profileComplete !== false && a.rules.eligibleClassifications.includes(v.classification) && !a.rules.blockedCountries.includes(v.residency) && !v.sanctionsHit);
const PINNED: Record<string, string[]> = { tok_srht: ["inv_ahmed", "inv_tidewater"], tok_wpks: ["inv_ahmed", "inv_tidewater"], tok_wpko: ["inv_tidewater"], tok_srhg: ["inv_ahmed"], tok_ads31: ["inv_tidewater"] };

for (const a of assets.filter((x) => x.status === "live")) {
  for (const tc of tokenClasses.filter((t) => t.assetId === a.id && t.canonicalSupply > 0)) {
    let pool = eligibleFor(a);
    if (pool.length === 0) pool = investors.filter((v) => v.tenantId === a.tenantId).slice(0, 4);
    const n = Math.min(pool.length, int(Math.min(6, pool.length), Math.min(tc.tier === "ordinary" ? 7 : 18, pool.length)));
    const chosen = [...pool].sort(() => rand() - 0.5).slice(0, n);
    for (const pid of PINNED[tc.id] ?? []) { const v = investors.find((x) => x.id === pid)!; if (!chosen.includes(v)) chosen.push(v); }
    const weights = chosen.map((v) => (v.id === "inv_ahmed" ? 0.12 : v.id === "inv_tidewater" ? 1.8 : between(0.3, 1.6)));
    const wsum = weights.reduce((s, w) => s + w, 0);
    const price = tc.tier === "ordinary" ? 10.38 : a.valuation.navPerToken;
    const remainingByDep = tc.deployments.map((d) => d.supply);
    chosen.forEach((inv, i) => {
      const qtyTotal = Math.floor((tc.canonicalSupply * weights[i]) / wsum);
      let depIdx = remainingByDep.findIndex((r) => r >= qtyTotal);
      if (depIdx < 0) depIdx = remainingByDep.indexOf(Math.max(...remainingByDep));
      const qty = Math.min(qtyTotal, remainingByDep[depIdx]);
      remainingByDep[depIdx] -= qty;
      const dep = tc.deployments[depIdx];
      const wallet = inv.wallets.find((w) => w.chain === dep.chain) ?? inv.wallets[0];
      const custodial = wallet.type === "custodial" || wallet.type === "mpc";
      holdings.push({
        id: id("hld"), investorId: inv.id, investorName: inv.name, assetId: a.id, tokenClassId: tc.id, chain: dep.chain,
        walletAddress: dep.chain === wallet.chain ? wallet.address : addrFor(dep.chain), quantity: qty, costBasis: round(qty * price * between(0.9, 1.0)),
        legalOwner: a.ownershipModel === "custodian" || a.ownershipModel === "csd" ? (wallet.custodian ?? "Komainu") + " (nominee)" : inv.name,
        beneficialOwner: inv.type === "entity" && inv.beneficialOwners[0] ? inv.name + " (UBO " + inv.beneficialOwners[0].name + ")" : inv.name,
        custodian: custodial ? wallet.custodian : undefined, nominee: a.ownershipModel === "csd" ? "CSD nominee account" : undefined,
        lockedUntil: a.rules.lockupDays ? iso(new Date(a.launchedAt!).getTime() + a.rules.lockupDays * DAY + int(0, 60) * DAY) : undefined,
        frozen: inv.sanctionsHit, acquiredAt: iso(Math.min(NOW - DAY, new Date(a.launchedAt!).getTime() + int(0, 40) * DAY)),
      });
    });
    // Ahmed's positions are sized to a personal portfolio; the excess goes back to the pool.
    const ah = holdings.find((x) => x.tokenClassId === tc.id && x.investorId === "inv_ahmed");
    if (ah) {
      const target = ({ tok_srht: 250_000, tok_wpks: 50_000, tok_srhg: 60_000 } as Record<string, number>)[tc.id] ?? 40_000;
      const q = Math.min(ah.quantity, Math.round(target / price));
      const di = tc.deployments.findIndex((d) => d.chain === ah.chain);
      remainingByDep[di] += ah.quantity - q;
      ah.costBasis = round((ah.costBasis * q) / ah.quantity);
      ah.quantity = q;
    }
    remainingByDep.forEach((r, di) => {
      if (r <= 0) return;
      const h = holdings.find((x) => x.tokenClassId === tc.id && x.chain === tc.deployments[di].chain && x.investorId !== "inv_ahmed");
      if (h) h.quantity += r; else { tc.deployments[di].supply -= r; tc.canonicalSupply -= r; }
    });
    tc.deployments.forEach((d) => (d.holders = holdings.filter((h) => h.tokenClassId === tc.id && h.chain === d.chain).length));
  }
  a.investorsCount = new Set(holdings.filter((h) => h.assetId === a.id).map((h) => h.investorId)).size;
  const off = offerings.find((o) => o.assetId === a.id);
  if (off) off.investorsCount = a.investorsCount + int(0, 6);
}
for (const v of investors) {
  const hs = holdings.filter((h) => h.investorId === v.id);
  v.holdingsCount = hs.length;
  v.totalInvested = round(hs.reduce((s, h) => s + h.costBasis, 0));
}

/* -------------------------------- orders ------------------------------- */
const STAGES: D.OrderStage[] = ["submitted", "eligibility", "payment-instructed", "payment-confirmed", "allocated", "settled", "minted", "reconciled"];
const stageActor: Record<D.OrderStage, string> = {
  submitted: "Investor portal", eligibility: "Compliance engine v4.2", "payment-instructed": "Payment orchestrator", "payment-confirmed": "Bank adapter webhook",
  allocated: "Allocation service", settled: "Settlement engine", minted: "Blockchain transaction manager", reconciled: "Reconciliation engine",
};
const orders: D.Order[] = [];
const payments: D.Payment[] = [];
const bankFor = (r: D.PaymentRail, ccy?: D.Currency) =>
  r === "usdc" ? "Circle (USDC)" : r === "usdt" ? "Fireblocks Network (USDT)" : r === "aed-stablecoin" ? "AE Coin" : r === "tokenized-deposit" ? "Meridian Bank tokenised deposits" : r === "card" ? "Checkout.com" : r === "sepa" || ccy === "GBP" ? "HSBC" : "Emirates NBD";

function makeOrder(o: D.Offering, inv: D.Investor, targetStage: D.OrderStage, status: D.OrderStatus, ageDays: number, extra?: Partial<D.Order>, forceRail?: D.PaymentRail) {
  const a = assets.find((x) => x.id === o.assetId)!;
  const rail = forceRail ?? pick(o.rails.filter((r) => r !== "card" || o.minTicket <= 10_000));
  const cap = rail === "card" ? Math.min(o.maxTicket, 25_000) : Math.min(o.maxTicket, o.minTicket * 40);
  const amount = Math.max(o.minTicket, Math.round(between(o.minTicket, cap) / 1000) * 1000);
  const tokens = round(amount / o.pricePerToken, a.template === "treasury-fund" ? 2 : 0);
  const t0 = NOW - ageDays * DAY - int(0, 20) * 3_600_000;
  const upto = STAGES.indexOf(targetStage);
  const asyncRail = rail === "swift" || rail === "local-rail" || rail === "ach" || rail === "sepa";
  const stepMins = [0, 1, 2, asyncRail ? 60 * 26 : rail === "card" ? 1 : 4, 30, 45, 3, 120];
  let t = t0;
  const history: D.StageEvent[] = [];
  for (let i = 0; i <= upto; i++) {
    t += stepMins[i] * 60_000 + int(0, 5) * 60_000;
    history.push({ stage: STAGES[i], at: iso(Math.min(t, NOW - 60_000)), actor: i === 3 && rail === "card" ? "Checkout.com webhook" : stageActor[STAGES[i]], note: i === 1 ? "12 of 12 rules passed" : i === 3 ? (rail === "card" ? "Card payment authorised and captured (3-D Secure)" : rail.toUpperCase() + " credit matched to instruction") : i === 6 ? "Mint confirmed in block" : undefined, ref: i === 6 ? txHash() : undefined });
  }
  const dep = tokenClasses.find((tc) => tc.assetId === a.id)?.deployments[0];
  const order: D.Order = {
    id: "ord_" + (40_000 + orders.length * 7 + int(0, 6)), tenantId: o.tenantId, offeringId: o.id, assetId: a.id, investorId: inv.id, investorName: inv.name,
    side: "subscribe", amount, currency: o.currency, tokens, pricePerToken: o.pricePerToken, rail, settlement: o.settlement, chain: dep?.chain ?? "ethereum",
    stage: targetStage, status, history, idempotencyKey: "idem_" + hex(16), createdAt: iso(t0), updatedAt: history[history.length - 1].at,
    mintTxHash: upto >= 6 ? history[6].ref : undefined, ...extra,
  };
  if (upto >= 2) {
    const p: D.Payment = {
      id: id("pay"), tenantId: o.tenantId, orderId: order.id, direction: "inbound", purpose: "subscription", rail, amount, currency: o.currency,
      status: upto >= 7 ? "reconciled" : upto >= 3 ? "confirmed" : "pending", reference: "SRH-" + order.id.slice(4) + "-" + hex(4).toUpperCase(),
      counterparty: inv.name, bank: bankFor(rail, o.currency), provider: bankFor(rail, o.currency), createdAt: history[2].at, confirmedAt: upto >= 3 ? history[3].at : undefined,
      txHash: rail === "usdc" || rail === "usdt" || rail === "aed-stablecoin" ? txHash() : undefined,
    };
    payments.push(p);
    order.paymentId = p.id;
  }
  orders.push(order);
  return order;
}

const openOfferings = offerings.filter((o) => o.status === "open");
const doneOfferings = offerings.filter((o) => o.status !== "upcoming");
for (let i = 0; i < 46; i++) {
  const o = pick(doneOfferings);
  const pool = eligibleFor(assets.find((a) => a.id === o.assetId)!);
  if (!pool.length) continue;
  const a = assets.find((x) => x.id === o.assetId)!;
  const age = Math.min(int(2, 120), Math.max(2, Math.round((NOW - new Date(a.launchedAt ?? daysAgo(30)).getTime()) / DAY) - 1));
  makeOrder(o, pick(pool), "reconciled", "completed", age);
}
const inflight: [D.OrderStage, D.OrderStatus][] = [
  ["submitted", "active"], ["eligibility", "active"], ["eligibility", "manual-review"], ["payment-instructed", "active"], ["payment-instructed", "active"],
  ["payment-instructed", "active"], ["payment-confirmed", "active"], ["payment-confirmed", "active"], ["allocated", "active"], ["allocated", "active"],
  ["settled", "active"], ["minted", "active"], ["minted", "active"], ["payment-instructed", "exception"], ["settled", "exception"],
];
inflight.forEach(([stage, status], i) => {
  const o = i < 11 ? pick(openOfferings.filter((x) => x.tenantId === T_SRH)) : pick(openOfferings);
  const pool = eligibleFor(assets.find((a) => a.id === o.assetId)!);
  const inv = i === 0 ? investors.find((v) => v.id === "inv_ahmed")! : pick(pool.length ? pool : investors.filter((v) => v.tenantId === o.tenantId && v.kycStatus === "approved"));
  makeOrder(o, inv, stage, status, between(0.05, 2.5), status === "exception" ? { exceptionReason: stage === "payment-instructed" ? "Payment received 1,250.00 short of instructed amount" : "Settlement instruction rejected by custodian: wallet not whitelisted on target chain" } : status === "manual-review" ? { exceptionReason: "Accreditation expires within 30 days of lock-up end" } : undefined);
});
// Accounts opened with items outstanding: orders are accepted and wait for compliance review
investors.filter((v) => v.tenantId === T_SRH && v.profileComplete === false && v.kycStatus === "pending").slice(0, 2).forEach((inv, k) => {
  const o = offerings.find((x) => x.id === (k === 0 ? "off_srhg" : "off_bbrs"))!;
  const missing = (inv.verification ?? []).filter((x) => x.status === "missing" || x.status === "failed").map((x) => x.label.toLowerCase());
  makeOrder(o, inv, "eligibility", "manual-review", between(0.2, 1.5), { exceptionReason: "Profile incomplete: " + (missing.join(", ") || "verification outstanding") + ". Held for compliance review." }, k === 0 ? "card" : undefined);
});
// Card subscriptions on the retail-friendly products
for (let i = 0; i < 4; i++) {
  const o = offerings.find((x) => x.id === (i % 2 ? "off_bbrs" : "off_srhg"))!;
  const pool = eligibleFor(assets.find((a) => a.id === o.assetId)!);
  if (pool.length) makeOrder(o, pick(pool), i === 0 ? "payment-confirmed" : "reconciled", i === 0 ? "active" : "completed", i === 0 ? 0.1 : int(2, 40), undefined, "card");
}
for (let i = 0; i < 4; i++) {
  const o = pick(openOfferings.filter((x) => x.tenantId === T_SRH && x.id !== "off_srhg" && x.id !== "off_bbrs"));
  const inv = pick(investors.filter((v) => v.tenantId === T_SRH && (v.classification === "retail" || v.residency === "US" || v.kycStatus === "rejected" || v.kycStatus === "expired")));
  makeOrder(o, inv, "eligibility", "rejected", int(1, 30), { exceptionReason: inv.residency === "US" ? "Investor residency US is blocked for this product (Reg S offering)" : inv.classification === "retail" ? "Retail investors are not eligible for this offering" : "KYC status is " + inv.kycStatus });
}
orders.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

/* ---------------------------- other payments --------------------------- */
const otherPayments: D.Payment[] = [];

/* ----------------------------- distributions --------------------------- */
const distributions: D.Distribution[] = [];
for (const a of assets.filter((x) => x.status === "live" && x.income.targetYieldPct > 0 && x.income.frequency !== "daily-accrual" && !/^(Accumulating|Capital growth|Discount)/.test(x.income.type))) {
  const tc = tokenClasses.find((t) => t.assetId === a.id)!;
  const per = a.income.frequency === "monthly" ? 12 : a.income.frequency === "quarterly" ? 4 : a.income.frequency === "semi-annual" ? 2 : 1;
  const gap = 365 / per;
  const type: D.DistributionType = a.template === "real-estate" ? "rental-income" : a.template === "sukuk" ? "coupon" : a.template === "spv-shares" ? "dividend" : a.instrument.type === "debt" || a.instrument.type === "note" ? "interest" : "dividend";
  const launched = new Date(a.launchedAt!).getTime();
  const base = a.id === "ast_wpk" ? tc.canonicalSupply * 10 : a.aum;
  for (let k = 3; k >= -1; k--) {
    const payT = NOW - k * gap * DAY;
    if (payT < launched + 25 * DAY) continue;
    const gross = round((base * a.income.targetYieldPct) / 100 / per * (a.id === "ast_wpk" ? Math.min(1, (payT - launched) / (gap * DAY)) : between(0.96, 1.04)));
    const wht = a.jurisdiction === "SA" ? round(gross * 0.05) : 0;
    const holdersCount = holdings.filter((h) => h.tokenClassId === tc.id).length;
    const status: D.Distribution["status"] = k >= 1 ? "paid" : k === 0 ? (a.id === "ast_wpk" ? "pending-approval" : "paid") : "scheduled";
    distributions.push({
      id: a.id === "ast_wpk" && k === 0 ? "dst_wpk_q3" : id("dst"), assetId: a.id, type, status, grossAmount: gross, withholdingTax: wht, netAmount: round(gross - wht), perToken: round(gross / tc.canonicalSupply, 6), currency: a.valuation.currency,
      recordDate: iso(payT - 5 * DAY), paymentDate: iso(payT), rail: a.valuation.currency === "GBP" ? "swift" : pick(["swift", "usdc"]), holdersCount, paidCount: status === "paid" ? holdersCount : 0,
    });
    if (status === "paid") otherPayments.push({ id: id("pay"), tenantId: a.tenantId, direction: "outbound", purpose: "distribution", rail: "swift", amount: round(gross - wht), currency: a.valuation.currency, status: "reconciled", reference: "DST-" + a.shortName.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6) + "-" + hex(4).toUpperCase(), counterparty: holdersCount + " holders", bank: bankFor("swift", a.valuation.currency), provider: bankFor("swift", a.valuation.currency), createdAt: iso(payT), confirmedAt: iso(payT + 3_600_000) });
  }
}
for (let i = 0; i < 8; i++) otherPayments.push({ id: id("pay"), tenantId: T_SRH, direction: "outbound", purpose: pick(["fee", "treasury"]), rail: pick(["swift", "usdc"]), amount: round(between(5_000, 180_000)), currency: "USD", status: pick(["confirmed", "reconciled", "reconciled"]), reference: "OPS-" + hex(6).toUpperCase(), counterparty: pick(["Komainu (custody fee)", "Fireblocks (platform fee)", "Chainlink (data feeds)", "Gas treasury top-up", "Knight Frank (valuation)"]), bank: "Emirates NBD", provider: "Emirates NBD", createdAt: daysAgo(int(1, 60)) });
payments.push(...otherPayments);
payments.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

/* --------------------------- corporate actions ------------------------- */
const corporateActions: D.CorporateAction[] = [
  { id: id("ca"), assetId: "ast_wpk", kind: "vote", title: "Approve 2027/28 room rent schedule", status: "open", effectiveDate: daysAhead(9), detail: "The University proposes a 3.5% rise in weekly rents for the 2027/28 contract year, in line with the lease's index cap. Simple majority of senior and ordinary units, 30% quorum.", votes: { for: 44.6, against: 5.9, abstain: 1.8, quorumPct: 30 } },
  { id: id("ca"), assetId: "ast_wpk", kind: "distribution", title: "First quarterly income distribution", status: "scheduled", effectiveDate: daysAhead(4), detail: "Senior units first under the waterfall, ordinary units from the balance. Paid in GBP by SWIFT, or in USDC on request." },
  { id: id("ca"), assetId: "ast_tbill", kind: "nav-update", title: "Daily NAV struck at " + TBILL_NAV_NOW.toFixed(4), status: "executed", effectiveDate: daysAgo(0), detail: "NAV calculated by Apex Group and published on-chain by Chainlink across 4 networks." },
  { id: id("ca"), assetId: "ast_ads", kind: "coupon", title: "Periodic distribution of USD 27.00 per certificate", status: "scheduled", effectiveDate: "2026-12-31T00:00:00Z", detail: "Semi-annual profit at 5.40% a year on USD 1,000 face value, from the Ijara rentals." },
  { id: id("ca"), assetId: "ast_ads", kind: "maturity", title: "Scheduled dissolution", status: "scheduled", effectiveDate: "2031-06-30T00:00:00Z", detail: "Dissolution at face value with the final periodic distribution." },
  { id: id("ca"), assetId: "ast_acred", kind: "tender-offer", title: "Q4 2026 quarterly repurchase offer", status: "open", effectiveDate: daysAhead(18), detail: "The fund offers to repurchase up to 5% of units at the December NAV. Requests are pro-rated if oversubscribed." },
  { id: id("ca"), assetId: "ast_hlpaf", kind: "notice", title: "Q3 investor letter and capital account statements", status: "executed", effectiveDate: daysAgo(4), detail: "Statements generated for all unit holders and delivered to the investor portal." },
  { id: id("ca"), assetId: "ast_vgld", kind: "notice", title: "Semi-annual bar audit completed", status: "executed", effectiveDate: daysAgo(18), detail: "Inspectorate counted 27 bars at Brink's Dubai and matched serial numbers and weights to the register. No differences." },
  { id: id("ca"), assetId: "ast_bbr", kind: "distribution", title: "Q3 dividend from net rent", status: "scheduled", effectiveDate: daysAhead(22), detail: "AED 0.159 per share, paid to the bank account or wallet on file." },
  { id: id("ca"), assetId: "ast_bbr", kind: "buyback", title: "Sponsor liquidity facility", status: "scheduled", effectiveDate: daysAhead(120), detail: "The sponsor will buy up to 2% of shares at NAV after the 90-day lock-up." },
  { id: id("ca"), assetId: "ast_xyz_zero", kind: "maturity", title: "Redemption at par", status: "scheduled", effectiveDate: "2029-06-30T00:00:00Z", detail: "Each note is redeemed at 100. No interim payments." },
  { id: id("ca"), assetId: "ast_ngt_rcv", kind: "maturity", title: "Final maturity", status: "scheduled", effectiveDate: "2027-03-31T00:00:00Z", detail: "Final interest and principal from collected receivables." },
];

/* ---------------------------- reconciliation --------------------------- */
const supplyOf = (tid: string) => tokenClasses.find((t) => t.id === tid)!.canonicalSupply;
const reconBreaks: D.ReconciliationBreak[] = [
  { id: "brk_1", assetId: "ast_wpk", tokenClassId: "tok_wpks", type: "position-mismatch", severity: "high", status: "open", authoritativeSource: "transfer-agent", values: [{ source: "transfer-agent", value: supplyOf("tok_wpks") }, { source: "blockchain", value: supplyOf("tok_wpks") + 2000 }, { source: "custodian", value: supplyOf("tok_wpks") }], difference: 2000, unit: "tokens", description: "On-chain supply on Polygon exceeds the register by 2,000 WPKS after a bridge retry.", detectedAt: daysAgo(0, 4), assignee: "Layla Haddad" },
  { id: "brk_2", assetId: "ast_tbill", tokenClassId: "tok_srht", type: "cash-mismatch", severity: "medium", status: "investigating", authoritativeSource: "bank", values: [{ source: "bank", value: 1_249_982.5 }, { source: "accounting", value: 1_250_000 }], difference: 17.5, unit: "USD", description: "Correspondent bank fee deducted from an inbound SWIFT subscription at Emirates NBD. The ledger expects the gross amount.", detectedAt: daysAgo(1, 6), assignee: "Imran Sheikh" },
  { id: "brk_3", assetId: "ast_vgld", tokenClassId: "tok_srhg", type: "stale-oracle", severity: "low", status: "open", authoritativeSource: "custodian", values: [{ source: "custodian", value: GOLD_NOW }, { source: "blockchain", value: round(GOLD_NOW * 0.9956, 2) }], difference: round(GOLD_NOW * 0.0044, 2), unit: "USD", description: "Solana price feed lagged the LBMA Gold Price PM by 41 minutes. Heartbeat exceeded tolerance.", detectedAt: daysAgo(0, 2) },
  { id: "brk_4", assetId: "ast_acred", tokenClassId: "tok_acred", type: "unmatched-transfer", severity: "medium", status: "open", authoritativeSource: "transfer-agent", values: [{ source: "blockchain", value: 25 }, { source: "transfer-agent", value: 0 }], difference: 25, unit: "tokens", description: "Peer transfer between whitelisted wallets on Avalanche has no matching instruction from Securitize.", detectedAt: daysAgo(2, 8) },
  { id: "brk_5", assetId: "ast_ads", tokenClassId: "tok_ads31", type: "missing-mint", severity: "high", status: "investigating", authoritativeSource: "csd", values: [{ source: "csd", value: 75_000 }, { source: "blockchain", value: 74_800 }], difference: 200, unit: "tokens", description: "CSD shows an allocation of 200 certificates without the matching on-chain mint on Base.", detectedAt: daysAgo(1, 3), assignee: "Layla Haddad" },
  { id: "brk_6", assetId: "ast_tbill", tokenClassId: "tok_srht", type: "duplicate-event", severity: "low", status: "resolved", authoritativeSource: "blockchain", values: [{ source: "blockchain", value: 1 }, { source: "accounting", value: 2 }], difference: 1, unit: "tokens", description: "Indexer emitted a duplicate Transfer event after an Alchemy RPC failover.", detectedAt: daysAgo(5), resolvedAt: daysAgo(5), resolution: "Duplicate discarded by idempotency key. Ledger entry reversed." },
  { id: "brk_7", assetId: "ast_ads", tokenClassId: "tok_ads31", type: "cash-mismatch", severity: "medium", status: "resolved", authoritativeSource: "bank", values: [{ source: "bank", value: 2_024_400 }, { source: "accounting", value: 2_024_560 }], difference: 160, unit: "USD", description: "FX rounding on the AED leg of the June profit distribution.", detectedAt: daysAgo(98), resolvedAt: daysAgo(97), resolution: "Booked to the FX rounding account with CFO approval." },
  { id: "brk_8", assetId: "ast_hlpaf", tokenClassId: "tok_hlgpa", type: "position-mismatch", severity: "low", status: "resolved", authoritativeSource: "transfer-agent", values: [{ source: "transfer-agent", value: supplyOf("tok_hlgpa") }, { source: "blockchain", value: supplyOf("tok_hlgpa") }], difference: 0, unit: "tokens", description: "Timing difference on the quarter-end snapshot.", detectedAt: daysAgo(20), resolvedAt: daysAgo(20), resolution: "Cleared on the next block. No action." },
];
const reconRuns: D.ReconciliationRun[] = Array.from({ length: 12 }, (_, i) => {
  const breaks = i === 0 ? 3 : i === 1 ? 2 : i === 4 ? 1 : 0;
  const compared = int(18_000, 26_000);
  return { id: id("rcr"), startedAt: iso(NOW - i * 4 * 3_600_000 - 600_000), finishedAt: iso(NOW - i * 4 * 3_600_000 - 420_000), scope: "All live token classes x blockchain, transfer agent, custodian, bank, ledger", recordsCompared: compared, matched: compared - breaks, breaks, status: breaks ? "breaks-found" : "clean" };
});

const ledger: D.LedgerEntry[] = [];
orders.filter((o) => o.stage === "reconciled").slice(0, 10).forEach((o) => {
  const j = id("jrn");
  const at = o.history[3]?.at ?? o.createdAt;
  ledger.push({ id: id("led"), journalId: j, at, account: "1010 Client money: " + o.rail.toUpperCase(), debit: o.amount, credit: 0, currency: o.currency, memo: "Subscription cash received", ref: o.id });
  ledger.push({ id: id("led"), journalId: j, at, account: "2100 Subscriptions pending allocation", debit: 0, credit: o.amount, currency: o.currency, memo: "Subscription cash received", ref: o.id });
  const j2 = id("jrn");
  const at2 = o.history[5]?.at ?? at;
  ledger.push({ id: id("led"), journalId: j2, at: at2, account: "2100 Subscriptions pending allocation", debit: o.amount, credit: 0, currency: o.currency, memo: "Settled to issuer", ref: o.id });
  ledger.push({ id: id("led"), journalId: j2, at: at2, account: "2200 Issuer proceeds payable", debit: 0, credit: o.amount, currency: o.currency, memo: "Settled to issuer", ref: o.id });
});
ledger.sort((a, b) => b.at.localeCompare(a.at));

/* ------------------------------ compliance ----------------------------- */
const rule = (code: string, name: string, layer: D.RuleLayer, description: string, severity: D.PolicyRule["severity"] = "block", params?: D.PolicyRule["params"]): D.PolicyRule => ({ id: id("rul"), code, name, layer, description, enabled: true, severity, params });
const policyPacks: D.PolicyPack[] = [
  { id: "pol_global", jurisdiction: "AE-ADGM", name: "Global core rules", regulator: "Platform", version: "4.2.0", status: "active", effectiveFrom: "2026-08-01T00:00:00Z", updatedAt: daysAgo(66), updatedBy: "Omar Siddiqui", rules: [
    rule("G-001", "KYC or KYB approved", "global", "Investor identity verification must be approved and in date."),
    rule("G-002", "Sanctions screening clear", "global", "No confirmed match on consolidated sanctions lists (UN, OFAC, EU, UK HMT, UAE local list)."),
    rule("G-003", "PEP review", "global", "Politically exposed persons require enhanced due diligence sign-off.", "review"),
    rule("G-004", "AML risk tolerance", "global", "High AML risk investors require MLRO approval per transaction.", "review", { maxAutoApprove: "medium" }),
    rule("G-005", "Wallet risk score", "global", "Destination wallet risk score must be under threshold and wallet whitelisted.", "block", { maxScore: 60 }),
    rule("G-006", "Blocked jurisdictions", "global", "Comprehensive sanctions jurisdictions are blocked platform-wide.", "block", { countries: ["KP", "IR", "SY", "CU"] }),
  ] },
  { id: "pol_adgm", jurisdiction: "AE-ADGM", name: "ADGM FSRA pack", regulator: "FSRA", version: "2.1.0", status: "active", effectiveFrom: "2026-06-01T00:00:00Z", updatedAt: daysAgo(120), updatedBy: "Omar Siddiqui", rules: [
    rule("ADGM-01", "Client classification", "jurisdiction", "Products marked Professional only may not be distributed to Retail Clients."),
    rule("ADGM-02", "Appropriateness assessment", "jurisdiction", "Complex products require a passed appropriateness test for Retail Clients.", "review"),
    rule("ADGM-03", "Client money handling", "jurisdiction", "Subscription cash must be received into designated client money accounts.", "info"),
  ] },
  { id: "pol_difc", jurisdiction: "AE-DIFC", name: "DIFC DFSA pack", regulator: "DFSA", version: "1.8.0", status: "active", effectiveFrom: "2026-04-15T00:00:00Z", updatedAt: daysAgo(160), updatedBy: "Omar Siddiqui", rules: [
    rule("DIFC-01", "Professional client test", "jurisdiction", "Investor must meet the DFSA Professional Client assets or experience test."),
    rule("DIFC-02", "Exempt offer limit", "offering", "Exempt offers limited to Professional Clients with a minimum subscription of USD 100,000 where applicable.", "review", { minUsd: 100000 }),
    rule("DIFC-03", "Investment token rules", "product", "Security tokens must follow the Investment Token regime record-keeping requirements.", "info"),
  ] },
  { id: "pol_vara", jurisdiction: "AE-VARA", name: "VARA virtual asset pack", regulator: "VARA", version: "1.3.0", status: "active", effectiveFrom: "2026-02-01T00:00:00Z", updatedAt: daysAgo(240), updatedBy: "Omar Siddiqui", rules: [
    rule("VARA-01", "Travel rule data", "global", "Transfers above AED 3,500 require originator and beneficiary data.", "block", { thresholdAed: 3500 }),
    rule("VARA-02", "Marketing restrictions", "jurisdiction", "Retail marketing of virtual assets requires risk disclosures.", "info"),
  ] },
  { id: "pol_cma", jurisdiction: "SA", name: "Saudi CMA pack", regulator: "CMA", version: "1.0.4", status: "active", effectiveFrom: "2026-05-01T00:00:00Z", updatedAt: daysAgo(150), updatedBy: "Northgate Compliance", rules: [
    rule("CMA-01", "Sophisticated investor", "jurisdiction", "Private placements limited to Sophisticated Investors under Rules on the Offer of Securities."),
    rule("CMA-02", "Saudi withholding tax", "product", "5% withholding on distributions to non-resident holders.", "info", { whtPct: 5 }),
  ] },
  { id: "pol_eu", jurisdiction: "EU-LU", name: "EU AIFMD and MiFID pack", regulator: "CSSF", version: "2.0.1", status: "active", effectiveFrom: "2026-01-10T00:00:00Z", updatedAt: daysAgo(270), updatedBy: "Omar Siddiqui", rules: [
    rule("EU-01", "AIF marketing passport", "jurisdiction", "AIF units may only be marketed to Professional Investors in notified member states."),
    rule("EU-02", "PRIIPs KID", "product", "Retail access requires a Key Information Document.", "review"),
  ] },
  { id: "pol_ch", jurisdiction: "CH", name: "Swiss DLT pack", regulator: "FINMA", version: "1.1.0", status: "active", effectiveFrom: "2025-09-01T00:00:00Z", updatedAt: daysAgo(400), updatedBy: "Omar Siddiqui", rules: [
    rule("CH-01", "Ledger-based security register", "product", "Register must satisfy DLT Act integrity and access requirements.", "info"),
  ] },
  { id: "pol_cbb", jurisdiction: "BH", name: "CBB pack", regulator: "CBB", version: "1.0.0", status: "active", effectiveFrom: "2026-03-01T00:00:00Z", updatedAt: daysAgo(210), updatedBy: "Meridian Group Compliance", rules: [
    rule("CBB-01", "Accredited investor", "jurisdiction", "Tokenised deposit notes restricted to accredited corporate clients of the bank."),
  ] },
  { id: "pol_us", jurisdiction: "US", name: "US Reg D / Reg S pack", regulator: "SEC", version: "0.9.0", status: "draft", effectiveFrom: "2026-11-01T00:00:00Z", updatedAt: daysAgo(9), updatedBy: "Omar Siddiqui", rules: [
    rule("US-01", "Reg S offshore transaction", "offering", "Reg S offerings may not be sold to US persons during the distribution compliance period."),
    rule("US-02", "Reg D 506(c) verification", "investor", "US persons must be verified accredited investors."),
    rule("US-03", "Rule 144 holding period", "product", "Restricted securities subject to 12 month holding period for resale.", "block", { months: 12 }),
  ] },
  { id: "pol_uk", jurisdiction: "GB", name: "UK FCA pack", regulator: "FCA", version: "1.0.2", status: "active", effectiveFrom: "2026-05-01T00:00:00Z", updatedAt: daysAgo(130), updatedBy: "Omar Siddiqui", rules: [
    rule("UK-01", "Financial promotion", "jurisdiction", "Promotions to UK persons must be approved by an authorised person or meet an exemption.", "review"),
    rule("UK-02", "Restricted mass market", "jurisdiction", "Non-mainstream products limited to certified high net worth or sophisticated investors.", "block"),
  ] },
  { id: "pol_sharia", jurisdiction: "AE-DIFC", name: "Sharia compliance overlay", regulator: "Sharia Supervisory Board", version: "1.2.0", status: "active", effectiveFrom: "2026-01-01T00:00:00Z", updatedAt: daysAgo(280), updatedBy: "Omar Siddiqui", rules: [
    rule("SH-01", "Permissible trading", "product", "Sukuk certificates may only trade at prices consistent with the Sharia pronouncement.", "info"),
    rule("SH-02", "No interest-bearing leverage", "product", "Sukuk may not be used as collateral in interest-bearing lending pools.", "block"),
  ] },
];

const alertTemplates: [D.AlertType, string, string][] = [
  ["sanctions", "Potential name match on consolidated sanctions list", "Fuzzy match (Levenshtein 2) against a designated person. Date of birth differs by 4 years. Nationality differs."],
  ["pep", "Domestic PEP identified", "Beneficial owner holds a senior position in a state-owned enterprise. Enhanced due diligence required."],
  ["adverse-media", "Adverse media: regulatory investigation", "Two articles reference an investigation into a former employer. Investor not named as a subject."],
  ["wallet-risk", "Wallet exposure to high-risk counterparty", "Indirect exposure (3 hops) to a mixer cluster. 0.8% of inflows by value."],
  ["transaction-monitoring", "Unusual subscription velocity", "Five subscriptions within 48 hours totalling 4.2x the declared annual investment amount."],
];
const screeningAlerts: D.ScreeningAlert[] = Array.from({ length: 18 }, (_, i) => {
  const [type, summary, detail] = alertTemplates[i % alertTemplates.length];
  const inv = i === 0 ? investors.find((v) => v.sanctionsHit)! : pick(investors);
  const status: D.ScreeningAlert["status"] = i < 6 ? "open" : i < 8 ? "escalated" : i < 16 ? "cleared" : "confirmed";
  return {
    id: "alt_" + (900 + i), investorId: inv.id, investorName: inv.name, type, severity: type === "sanctions" ? "high" : type === "pep" || type === "transaction-monitoring" ? "medium" : pick<D.RiskLevel>(["low", "medium"]),
    status, provider: type === "wallet-risk" ? "Chainalysis" : "ComplyAdvantage", matchScore: type === "sanctions" ? int(78, 94) : int(55, 88), summary, detail,
    createdAt: daysAgo(i < 6 ? int(0, 3) : int(4, 90), 12), assignee: i < 8 ? pick(["Omar Siddiqui", "Nadia Farah", undefined as unknown as string]) : "Omar Siddiqui",
    resolvedAt: status === "cleared" || status === "confirmed" ? daysAgo(int(1, 60)) : undefined, resolutionNote: status === "cleared" ? "False positive. Identifiers do not match." : status === "confirmed" ? "Confirmed. Account restricted and SAR filed." : undefined,
  };
});


/* --------------------------------- custody ----------------------------- */
const custodyAccounts: D.CustodyAccount[] = [
  { id: "cus_1", custodian: "Komainu", type: "omnibus", label: "Client omnibus, Ethereum", chain: "ethereum", address: evmAddr(), balanceUsd: 182_400_000, assetsHeld: 6, signingPolicy: { quorum: 3, signers: 5, dailyLimitUsd: 25_000_000, whitelistOnly: true }, status: "active" },
  { id: "cus_2", custodian: "Komainu", type: "segregated", label: "Tidewater Pension Trust segregated", chain: "ethereum", address: evmAddr(), balanceUsd: 14_900_000, assetsHeld: 3, signingPolicy: { quorum: 2, signers: 3, dailyLimitUsd: 5_000_000, whitelistOnly: true }, status: "active" },
  { id: "cus_3", custodian: "Fireblocks", type: "mpc-vault", label: "Issuer treasury, Polygon", chain: "polygon", address: evmAddr(), balanceUsd: 48_200_000, assetsHeld: 3, signingPolicy: { quorum: 2, signers: 3, dailyLimitUsd: 10_000_000, whitelistOnly: true }, status: "active" },
  { id: "cus_4", custodian: "Fireblocks", type: "mpc-vault", label: "Distribution payer, Base", chain: "base", address: evmAddr(), balanceUsd: 3_100_000, assetsHeld: 1, signingPolicy: { quorum: 2, signers: 4, dailyLimitUsd: 2_000_000, whitelistOnly: true }, status: "active" },
  { id: "cus_5", custodian: "Thales Luna HSM", type: "hsm-vault", label: "Token admin keys (mint, pause, freeze)", chain: "ethereum", address: evmAddr(), balanceUsd: 0, assetsHeld: 0, signingPolicy: { quorum: 3, signers: 5, dailyLimitUsd: 0, whitelistOnly: true }, status: "active" },
  { id: "cus_6", custodian: "Copper", type: "omnibus", label: "Client omnibus, Solana", chain: "solana", address: solAddr(), balanceUsd: 39_600_000, assetsHeld: 2, signingPolicy: { quorum: 3, signers: 5, dailyLimitUsd: 10_000_000, whitelistOnly: true }, status: "active" },
  { id: "cus_7", custodian: "Fireblocks", type: "mpc-vault", label: "Gas treasury (multi-chain)", chain: "ethereum", address: evmAddr(), balanceUsd: 84_300, assetsHeld: 0, signingPolicy: { quorum: 2, signers: 3, dailyLimitUsd: 50_000, whitelistOnly: false }, status: "active" },
  { id: "cus_8", custodian: "Komainu", type: "segregated", label: "Restricted account (sanctions hold)", chain: "ethereum", address: evmAddr(), balanceUsd: 412_000, assetsHeld: 1, signingPolicy: { quorum: 4, signers: 5, dailyLimitUsd: 0, whitelistOnly: true }, status: "frozen" },
  { id: "cus_9", custodian: "BitGo", type: "segregated", label: "US feeder settlement wallet", chain: "avalanche", address: evmAddr(), balanceUsd: 6_250_000, assetsHeld: 1, signingPolicy: { quorum: 2, signers: 3, dailyLimitUsd: 3_000_000, whitelistOnly: true }, status: "active" },
];

/* -------------------------------- approvals ---------------------------- */
const sanctioned = investors.find((v) => v.sanctionsHit)!;
const bankMismatch = investors.find((v) => v.verification?.some((x) => x.key === "bank-account" && x.status === "failed"))!;
const sgDigital = investors.find((v) => v.residency === "SG" && v.kycStatus === "approved" && v.type === "individual")!;
const wpkDist = distributions.find((d) => d.id === "dst_wpk_q3");
const approvals: D.Approval[] = [
  { id: "apr_301", tenantId: T_SRH, type: "mint", title: "Mint 1,842,105.26 SRHT on Base", summary: "Batch mint for 7 allocated subscriptions in the Treasury Fund continuous offering.", objectType: "TokenClass", objectId: "tok_srht", requestedBy: "Allocation service", requestedAt: daysAgo(0, 2), risk: "medium", status: "pending",
    steps: [{ role: "operations", label: "Operations approval", approver: "Layla Haddad", decision: "approved", at: daysAgo(0, 1) }, { role: "compliance-officer", label: "Compliance approval" }, { role: "authorized-signer", label: "Authorised signer (HSM quorum 3 of 5)" }], payload: { chain: "base", amount: "1,842,105.26", orders: 7 } },
  { id: "apr_302", tenantId: T_SRH, type: "distribution", title: "Approve first quarterly distribution, Whitworth Park", summary: "GBP " + (wpkDist ? Math.round(wpkDist.netAmount).toLocaleString("en-GB") : "0") + " to senior unit holders, paid by SWIFT and USDC.", objectType: "Distribution", objectId: "dst_wpk_q3", requestedBy: "Sara Kim", requestedAt: daysAgo(1, 4), risk: "medium", status: "pending",
    steps: [{ role: "issuer-admin", label: "Issuer approval", approver: "Sara Kim", decision: "approved", at: daysAgo(1, 3) }, { role: "operations", label: "Operations approval" }, { role: "compliance-officer", label: "Compliance approval" }], payload: { amount: wpkDist ? wpkDist.netAmount.toFixed(2) : "0", holders: wpkDist?.holdersCount ?? 0 } },
  { id: "apr_303", tenantId: T_SRH, type: "freeze", title: "Freeze wallets holding SRHG and SRHT", summary: "Investor under a confirmed sanctions match. Freeze positions pending regulator guidance.", objectType: "Investor", objectId: sanctioned.id, requestedBy: "Omar Siddiqui", requestedAt: daysAgo(0, 6), risk: "high", status: "pending",
    steps: [{ role: "compliance-officer", label: "MLRO approval", approver: "Omar Siddiqui", decision: "approved", at: daysAgo(0, 5) }, { role: "operations", label: "Operations approval" }, { role: "authorized-signer", label: "Authorised signer (HSM quorum 3 of 5)" }], payload: { wallets: 2, tokenClasses: "SRHG, SRHT" } },
  { id: "apr_304", tenantId: T_SRH, type: "forced-transfer", title: "Forced transfer 1,250 SRHG (estate succession)", summary: "Court-certified succession. Transfer from the deceased holder's wallet to the executor's wallet.", objectType: "Holding", objectId: "hld_estate", requestedBy: "Layla Haddad", requestedAt: daysAgo(2, 4), risk: "high", status: "pending",
    steps: [{ role: "operations", label: "Operations approval", approver: "Layla Haddad", decision: "approved", at: daysAgo(2, 3) }, { role: "compliance-officer", label: "Compliance approval" }, { role: "platform-admin", label: "Legal sign-off" }, { role: "authorized-signer", label: "Authorised signer" }], payload: { amount: "1,250", chain: "ethereum" } },
  { id: "apr_305", tenantId: T_SRH, type: "policy-change", title: "Raise wallet risk threshold from 60 to 70", summary: "Proposed change to G-005 in Global core rules v4.3.0.", objectType: "PolicyPack", objectId: "pol_global", requestedBy: "Omar Siddiqui", requestedAt: daysAgo(3), risk: "medium", status: "pending",
    steps: [{ role: "compliance-officer", label: "Proposer", approver: "Omar Siddiqui", decision: "approved", at: daysAgo(3) }, { role: "platform-admin", label: "Second line review" }], payload: { rule: "G-005", from: 60, to: 70 } },
  { id: "apr_306", tenantId: T_SRH, type: "asset-launch", title: "Launch KAFD Grade-A Office Income Fund", summary: "Deploy the KAFD token on Ethereum and Base and open the primary offering once CMA approval is received.", objectType: "Asset", objectId: "ast_kafd", requestedBy: "Layla Haddad", requestedAt: daysAgo(4), risk: "high", status: "pending",
    steps: [{ role: "operations", label: "Operations approval", approver: "Layla Haddad", decision: "approved", at: daysAgo(4) }, { role: "compliance-officer", label: "Compliance approval" }, { role: "platform-admin", label: "Regulatory permission confirmed" }], payload: { chains: "ethereum, base", target: "SAR 200,000,000" } },
  { id: "apr_307", tenantId: T_SRH, type: "verification-override", title: "Accept bank account with name mismatch", summary: bankMismatch.name + ": statement shows the name in a different order. Identity and address are verified; the account is held at the investor's own bank.", objectType: "Investor", objectId: bankMismatch.id, requestedBy: "Omar Siddiqui", requestedAt: daysAgo(0, 7), risk: "medium", status: "pending",
    steps: [{ role: "compliance-officer", label: "Compliance approval", approver: "Omar Siddiqui", decision: "approved", at: daysAgo(0, 7), comment: "Name order differs only. Spoke to the investor and the bank." }, { role: "operations", label: "Second approver" }], payload: { item: "bank-account", action: "approve manually" } },
  { id: "apr_308", tenantId: T_SRH, type: "manual-valuation", title: "Q3 valuation for Business Bay Residences", summary: "Cavendish Maxwell valuation of AED 15.1m. NAV per share moves from 10.42 to 10.58 (+1.5%).", objectType: "Asset", objectId: "ast_bbr", requestedBy: "Layla Haddad", requestedAt: daysAgo(1, 2), risk: "low", status: "pending",
    steps: [{ role: "operations", label: "Entered by", approver: "Layla Haddad", decision: "approved", at: daysAgo(1, 2) }, { role: "compliance-officer", label: "Checker" }], payload: { from: 10.42, to: 10.58, source: "Cavendish Maxwell" } },
  { id: "apr_309", tenantId: T_SRH, type: "listing-override", title: "Move MBR Solar 6 to review", summary: "Term sheet signed with Masdar and pre-filing meeting held with FSRA. Valuation report to follow.", objectType: "Asset", objectId: "ast_mbr6", requestedBy: "Layla Haddad", requestedAt: daysAgo(0, 9), risk: "medium", status: "pending",
    steps: [{ role: "operations", label: "Requester", approver: "Layla Haddad", decision: "approved", at: daysAgo(0, 9) }, { role: "compliance-officer", label: "Compliance approval" }], payload: { from: "structuring", to: "in-review" } },
  { id: "apr_293", tenantId: T_SRH, type: "verification-override", title: "Waive proof of address upload", summary: sgDigital.name + ": residential address supplied by Singpass Myinfo, a government source.", objectType: "Investor", objectId: sgDigital.id, requestedBy: "Omar Siddiqui", requestedAt: daysAgo(14), risk: "low", status: "executed",
    steps: [{ role: "compliance-officer", label: "Compliance approval", approver: "Omar Siddiqui", decision: "approved", at: daysAgo(14) }], payload: { item: "address", action: "waive" } },
  { id: "apr_290", tenantId: T_SRH, type: "treasury-movement", title: "Top up gas treasury 25 ETH", summary: "Gas treasury below 7 day runway.", objectType: "CustodyAccount", objectId: "cus_7", requestedBy: "Daniel Reyes", requestedAt: daysAgo(6), risk: "low", status: "executed",
    steps: [{ role: "platform-admin", label: "Requester", approver: "Daniel Reyes", decision: "approved", at: daysAgo(6) }, { role: "operations", label: "Operations approval", approver: "Layla Haddad", decision: "approved", at: daysAgo(6) }], payload: { amount: "25 ETH" }, txHash: txHash() },
  { id: "apr_289", tenantId: T_SRH, type: "pause", title: "Pause ACRED transfers on Avalanche during upgrade", summary: "Compliance module upgrade v2.3.", objectType: "TokenClass", objectId: "tok_acred", requestedBy: "Daniel Reyes", requestedAt: daysAgo(9), risk: "medium", status: "executed",
    steps: [{ role: "platform-admin", label: "Requester", approver: "Daniel Reyes", decision: "approved", at: daysAgo(9) }, { role: "compliance-officer", label: "Compliance approval", approver: "Omar Siddiqui", decision: "approved", at: daysAgo(9) }, { role: "authorized-signer", label: "Authorised signer", approver: "HSM quorum 3/5", decision: "approved", at: daysAgo(9) }], payload: { chain: "avalanche" }, txHash: txHash() },
  { id: "apr_281", tenantId: T_SRH, type: "burn", title: "Burn 120,000 SRHT for same-day redemptions", summary: "Redemption batch settled in USDC.", objectType: "TokenClass", objectId: "tok_srht", requestedBy: "Redemption service", requestedAt: daysAgo(12), risk: "low", status: "executed",
    steps: [{ role: "operations", label: "Operations approval", approver: "Layla Haddad", decision: "approved", at: daysAgo(12) }, { role: "authorized-signer", label: "Authorised signer", approver: "HSM quorum 3/5", decision: "approved", at: daysAgo(12) }], payload: { amount: "120,000" }, txHash: txHash() },
  { id: "apr_276", tenantId: T_SRH, type: "config-change", title: "Enable Base deployment for SRHG", summary: "Add an ERC-3643 deployment on Base with Chainlink Proof of Reserve.", objectType: "TokenClass", objectId: "tok_srhg", requestedBy: "Daniel Reyes", requestedAt: daysAgo(30), risk: "medium", status: "rejected",
    steps: [{ role: "platform-admin", label: "Requester", approver: "Daniel Reyes", decision: "approved", at: daysAgo(30) }, { role: "compliance-officer", label: "Compliance approval", approver: "Omar Siddiqui", decision: "rejected", at: daysAgo(29), comment: "Proof of Reserve feed not yet live on Base. Resubmit when it is." }], payload: { chain: "base" } },
];

/* ---------------------------- market & defi --------------------------- */
const tradables = tokenClasses.filter((t) => ["tok_srht", "tok_ads31", "tok_srhg", "tok_acred", "tok_hlgpa"].includes(t.id));
const venues: D.Venue[] = ["srh-ats", "rfq-desk", "otc", "external-mtf"];
const marketOrders: D.MarketOrder[] = [];
const trades: D.Trade[] = [];
for (const tc of tradables) {
  const a = assets.find((x) => x.id === tc.assetId)!;
  const mid = a.valuation.navPerToken;
  const pool = holdings.filter((h) => h.tokenClassId === tc.id);
  if (!pool.length) continue;
  const lot = (lo: number, hi: number) => Math.max(1, Math.round(between(lo, hi) / (mid > 500 ? 400 : mid > 50 ? 60 : 1)));
  for (let i = 0; i < 8; i++) {
    const side = i % 2 ? "sell" : "buy";
    const px = round(mid * (side === "buy" ? 1 - between(0.001, 0.012) : 1 + between(0.001, 0.012)), mid < 10 ? 4 : 2);
    const h = pick(pool);
    marketOrders.push({ id: id("mo"), tokenClassId: tc.id, assetId: a.id, side, type: i === 7 ? "block" : "limit", quantity: lot(500, 40_000), price: px, filled: 0, status: "open", venue: i === 7 ? "otc" : "srh-ats", investorId: h.investorId, investorName: h.investorName, createdAt: daysAgo(between(0, 3)), complianceDecision: "ALLOW" });
  }
  for (let i = 0; i < 8; i++) {
    const b = pick(pool), s = pick(pool);
    trades.push({ id: id("trd"), tokenClassId: tc.id, assetId: a.id, quantity: lot(200, 25_000), price: round(mid * (1 + between(-0.008, 0.008)), mid < 10 ? 4 : 2), buyer: b.investorName, seller: s.investorName, venue: pick(venues), settlement: pick(["dvp", "atomic"]), status: i === 0 ? "compliance-check" : i === 1 ? "settling" : "settled", executedAt: daysAgo(between(0, 20)), txHash: i > 1 ? txHash() : undefined });
  }
}
const usInv = investors.find((v) => v.residency === "US")!;
marketOrders.push({ id: id("mo"), tokenClassId: "tok_ads31", assetId: "ast_ads", side: "buy", type: "limit", quantity: 40, price: 1001.5, filled: 0, status: "blocked", venue: "srh-ats", investorId: usInv.id, investorName: usInv.name, createdAt: daysAgo(0, 5), complianceDecision: "REJECT" });
trades.sort((a, b) => b.executedAt.localeCompare(a.executedAt));

const defiPositions: D.DefiPosition[] = [
  { id: "dfi_1", protocol: "Permissioned lending pool (SRH Prime)", kind: "lending", assetId: "ast_tbill", tokenSymbol: "SRHT", chain: "ethereum", tvlUsd: 38_400_000, apyPct: round(TBILL_YIELD_NOW + 0.9, 1), utilizationPct: 72, ltvPct: 92, permissioned: true, whitelistedInvestors: 14, status: "active", oracle: "Chainlink", healthFactor: 1.38 },
  { id: "dfi_2", protocol: "Tri-party repo desk", kind: "repo", assetId: "ast_ads", tokenSymbol: "ADS31", chain: "ethereum", tvlUsd: 12_000_000, apyPct: 4.6, utilizationPct: 81, ltvPct: 85, permissioned: true, whitelistedInvestors: 4, status: "paused", oracle: "Chainlink", healthFactor: 1.52 },
  { id: "dfi_3", protocol: "Institutional AMM (SRHT / USDC)", kind: "amm", assetId: "ast_tbill", tokenSymbol: "SRHT", chain: "base", tvlUsd: 9_200_000, apyPct: 1.9, utilizationPct: 44, permissioned: true, whitelistedInvestors: 22, status: "active", oracle: "Chainlink" },
  { id: "dfi_4", protocol: "Gold-backed collateral vault", kind: "collateral", assetId: "ast_vgld", tokenSymbol: "SRHG", chain: "ethereum", tvlUsd: 6_800_000, apyPct: 0, utilizationPct: 37, ltvPct: 70, permissioned: true, whitelistedInvestors: 9, status: "active", oracle: "Chainlink Proof of Reserve", healthFactor: 2.1 },
  { id: "dfi_5", protocol: "Treasury yield vault", kind: "vault", assetId: "ast_tbill", tokenSymbol: "SRHT", chain: "solana", tvlUsd: 15_600_000, apyPct: TBILL_YIELD_NOW, utilizationPct: 100, permissioned: true, whitelistedInvestors: 31, status: "active", oracle: "Chainlink" },
  { id: "dfi_6", protocol: "Private credit lending pool", kind: "lending", assetId: "ast_acred", tokenSymbol: "ACRED", chain: "avalanche", tvlUsd: 0, apyPct: 0, utilizationPct: 0, ltvPct: 60, permissioned: true, whitelistedInvestors: 0, status: "pending-approval", oracle: "Chainlink" },
];

/* --------------------------------- audit ------------------------------- */
const auditRaw: Omit<D.AuditEvent, "hash" | "prevHash">[] = [];
const ips = ["10.20.4.18", "10.20.4.22", "185.42.11.6", "94.200.13.77", "10.20.9.3"];
const sys = { name: "Platform", role: "system" as const, organization: "SRH Inc" };
const persAs = (p: D.Persona) => ({ name: p.name, role: p.role, organization: p.organization });
for (const o of orders.slice(0, 40)) {
  for (const h of o.history) {
    auditRaw.push({ id: id("aud"), tenantId: o.tenantId, at: h.at, actor: h.stage === "submitted" ? { name: o.investorName, role: "investor", organization: o.investorName } : { ...sys, name: h.actor }, action: "order." + h.stage.replace("-", "_"), objectType: "Order", objectId: o.id, reason: h.stage === "submitted" ? "Investor subscription" : "Lifecycle progression", previousState: STAGES[STAGES.indexOf(h.stage) - 1], newState: h.stage, provider: h.stage === "payment-confirmed" ? bankFor(o.rail, o.currency) : h.stage === "eligibility" ? "ComplyAdvantage" : undefined, txHash: h.ref, ip: h.stage === "submitted" ? pick(ips.slice(2, 4)) : "10.20.0.1" });
  }
}
for (const ap of approvals) {
  for (const st of ap.steps.filter((s) => s.decision)) {
    const p = personas.find((x) => x.name === st.approver);
    auditRaw.push({ id: id("aud"), tenantId: ap.tenantId, at: st.at!, actor: p ? persAs(p) : { ...sys, name: st.approver ?? "HSM" }, action: "approval." + st.decision, objectType: ap.objectType, objectId: ap.objectId, reason: ap.title, previousState: "pending", newState: st.decision, approvedBy: st.approver, txHash: ap.txHash, ip: pick(ips.slice(0, 2)) });
  }
}
for (const al of screeningAlerts.filter((a) => a.resolvedAt)) {
  auditRaw.push({ id: id("aud"), tenantId: T_SRH, at: al.resolvedAt!, actor: persAs(personas[1]), action: "screening.alert_" + al.status, objectType: "ScreeningAlert", objectId: al.id, reason: al.resolutionNote ?? "", previousState: "open", newState: al.status, provider: al.provider, ip: ips[1] });
}
for (const tc of tokenClasses.filter((t) => t.issuance?.status === "verified" && t.issuance.verifiedAt)) {
  auditRaw.push({ id: id("aud"), tenantId: assets.find((a) => a.id === tc.assetId)!.tenantId, at: tc.issuance!.verifiedAt!, actor: persAs(personas[1]), action: "issuance.verified", objectType: "TokenClass", objectId: tc.id, reason: "Issuance checks complete for " + tc.symbol, previousState: "pending", newState: "verified", ip: ips[1] });
}
for (const pp of policyPacks) auditRaw.push({ id: id("aud"), tenantId: T_SRH, at: pp.updatedAt, actor: persAs(personas[1]), action: "policy.published", objectType: "PolicyPack", objectId: pp.id, reason: "Policy pack " + pp.name + " published", previousState: "draft", newState: "v" + pp.version, approvedBy: "Daniel Reyes", ip: ips[1] });
auditRaw.push({ id: id("aud"), tenantId: T_SRH, at: daysAgo(1, 2), actor: persAs(personas[2]), action: "tenant.module_enabled", objectType: "Tenant", objectId: T_XYZ, reason: "Talara Securities contract amendment 3: enable Asset Servicing", previousState: "disabled", newState: "enabled", approvedBy: "Layla Haddad", ip: ips[0] });
auditRaw.push({ id: id("aud"), tenantId: T_SRH, at: daysAgo(2, 2), actor: persAs(personas[2]), action: "auth.role_granted", objectType: "User", objectId: "usr_new_ops", reason: "New operations analyst onboarding", previousState: "none", newState: "operations", approvedBy: "Layla Haddad", ip: ips[0] });
auditRaw.push({ id: id("aud"), tenantId: T_SRH, at: daysAgo(14), actor: persAs(personas[1]), action: "verification.waived", objectType: "Investor", objectId: sgDigital.id, reason: "Address supplied by Singpass Myinfo", previousState: "missing", newState: "waived", ip: ips[1] });
auditRaw.sort((a, b) => a.at.localeCompare(b.at));
let prev = "0x" + "0".repeat(64);
const audit: D.AuditEvent[] = auditRaw.map((e) => {
  const h = "0x" + hex(64);
  const out = { ...e, prevHash: prev, hash: h };
  prev = h;
  return out;
}).reverse();

/* -------------------------------- events ------------------------------- */
const sevFor: Record<string, D.PlatformEvent["severity"]> = { "payment.confirmed": "success", "token.minted": "success", "order.submitted": "info", "screening.alert": "warning", "recon.break_detected": "critical", "approval.requested": "info", "provider.degraded": "warning", "distribution.paid": "success", "nav.updated": "info" };
const events: D.PlatformEvent[] = [];
orders.slice(0, 18).forEach((o) => {
  const last = o.history[o.history.length - 1];
  const map: Partial<Record<D.OrderStage, D.PlatformEventType>> = { submitted: "order.submitted", eligibility: "order.eligibility_passed", "payment-instructed": "payment.instructed", "payment-confirmed": "payment.confirmed", allocated: "order.allocated", settled: "settlement.completed", minted: "token.minted", reconciled: "ledger.reconciled" };
  const type = o.status === "rejected" ? "order.rejected" : map[last.stage]!;
  const a = assets.find((x) => x.id === o.assetId)!;
  events.push({ id: id("evt"), type, at: last.at, title: ({ "order.submitted": "Order received", "order.eligibility_passed": "Eligibility passed", "payment.instructed": "Payment instructed", "payment.confirmed": "Payment confirmed", "order.allocated": "Allocated", "settlement.completed": "Settlement completed", "token.minted": "Tokens minted", "ledger.reconciled": "Reconciled", "order.rejected": "Order rejected by policy" } as Record<string, string>)[type] ?? type, detail: `${o.investorName} · ${a.shortName} · ${o.currency} ${o.amount.toLocaleString("en-US")}`, objectType: "Order", objectId: o.id, href: "/orders/" + o.id, severity: o.status === "rejected" ? "warning" : sevFor[type] ?? "info" });
});
events.push({ id: id("evt"), type: "recon.break_detected", at: reconBreaks[0].detectedAt, title: "Reconciliation break detected", detail: reconBreaks[0].description, objectType: "ReconciliationBreak", objectId: "brk_1", href: "/registry/reconciliation", severity: "critical" });
events.push({ id: id("evt"), type: "provider.degraded", at: daysAgo(0, 1), title: "Provider degraded", detail: "Chainalysis p95 latency 1.8s (threshold 1.0s). Wallet screening falls back to Elliptic.", objectType: "Provider", objectId: "prv_chainalysis", href: "/custody/providers", severity: "warning" });
events.push({ id: id("evt"), type: "screening.alert", at: screeningAlerts[0].createdAt, title: "Sanctions screening alert", detail: screeningAlerts[0].investorName + " · match score " + screeningAlerts[0].matchScore, objectType: "ScreeningAlert", objectId: screeningAlerts[0].id, href: "/compliance/screening", severity: "critical" });
events.sort((a, b) => b.at.localeCompare(a.at));

/* -------------------------------- media -------------------------------- */
const slug = (x: string) => x.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
personas.forEach((p) => (p.avatar = `/media/people/${slug(p.name)}.webp`));
investors.forEach((v) => { if (v.type === "individual") v.avatar = `/media/people/${slug(v.name)}.webp`; });
tenants.forEach((t) => (t.brand.logo = t.id === T_SRH ? "/brand/srh-mark.png" : `/logos/tenants/${({ tnt_xyz: "talara", tnt_mrd: "meridian", tnt_ngt: "northgate" } as Record<string, string>)[t.id]}.svg`));
const MEDIA = MEDIA_MAP as Record<string, { images: string[]; videos?: { youtubeId: string; title: string; source: string }[]; credits?: string }>;
assets.forEach((a) => {
  const m = MEDIA[a.id];
  if (m) a.media = { cover: `/media/assets/${m.images[0]}`, gallery: m.images.map((x) => `/media/assets/${x}`), videos: m.videos, credits: m.credits };
});

/* ----------------------------- internal rules --------------------------- */
const internalRules: D.InternalRules = {
  mintApprovalThresholdUsd: 250_000,
  issuanceVerificationRequired: true,
  incompleteProfilesGoToReview: true,
  autoApproveMaxAmlRisk: "medium",
  dualApprovalForHighRiskOverrides: true,
  overrideRoles: { verification: ["compliance-officer"], listing: ["platform-admin", "compliance-officer", "operations"], valuation: ["operations", "issuer-admin"] },
  riskBands: { veryLowMax: 4.5, lowMax: 7, mediumMax: 10 },
  card: { enabled: true, retailLimitUsd: 10_000, professionalLimitUsd: 25_000, feePct: 2.5, threeDSecure: true },
  manualValuationTolerancePct: 5,
  updatedAt: daysAgo(21),
  updatedBy: "Omar Siddiqui",
};

/* --------------------------------- write ------------------------------- */
const out = join(process.cwd(), "src/mocks/data");
mkdirSync(out, { recursive: true });
const files: Record<string, unknown> = {
  tenants, personas, jurisdictions, providers, investors, issuers, assets, tokenClasses, offerings, orders, payments, holdings,
  distributions, corporateActions, reconBreaks, reconRuns, ledger, policyPacks, screeningAlerts, custodyAccounts, approvals,
  marketOrders, trades, defiPositions, audit, events, internalRules,
};
for (const [k, v] of Object.entries(files)) writeFileSync(join(out, k + ".json"), JSON.stringify(v, null, 2));
console.log(Object.entries(files).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.length : "object"}`).join("\n"));
