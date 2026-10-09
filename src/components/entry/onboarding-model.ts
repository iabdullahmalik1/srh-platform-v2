import { z } from "zod";
import type { AssetTemplate, Chain, Currency, InvestorClassification, InvestorDocument, InvestorDocumentKind, NewInvestorInput, RiskProfile, VerificationKey } from "@/types/domain";
import { kybFor, kycFor, type IdOption } from "@/lib/kyc-countries";
import { COUNTRY_NAME } from "@/lib/constants";
import { randomHex } from "@/lib/utils";

export type AccountType = "individual" | "entity";
export type DocType = "passport" | "national-id" | "emirates-id";
export type Experience = "none" | "some" | "extensive";
export type AssetsBand = "under-200k" | "200k-1m" | "1m-5m" | "over-5m";
export type ProStatus = "none" | "finance" | "licensed";
export type WalletMode = "mpc" | "existing";

export interface ExtractedDoc {
  fullName: string;
  number: string;
  nationality: string;
  dob: string;
  expiry: string;
  mrz: string[];
  confidence: number;
}

export interface OnboardingDraft {
  accountType: AccountType;
  name: string;
  email: string;
  phone: string;
  residency: string;
  citizenship: string;
  companyName: string;
  registrationNumber: string;
  incorporationCountry: string;
  docType?: DocType;
  doc?: ExtractedDoc;
  liveness: boolean;
  experience?: Experience;
  assets?: AssetsBand;
  status?: ProStatus;
  walletMode?: WalletMode;
  chain: Chain;
  walletAddress: string;
  consents: { accuracy: boolean; terms: boolean; screening: boolean };
  /** Country-specific identity option chosen (key from kyc-countries), with its label. */
  idKey?: string;
  idLabel?: string;
  /** Government digital identity returned verified data instead of a scan. */
  digitalId?: boolean;
  address?: "provided" | "later";
  addressEvidence?: string;
  /** Steps the applicant chose to complete later. */
  skipped: VerificationKey[];
  interests: AssetTemplate[];
  risk?: RiskProfile;
  /* Company journey */
  kybJurisdiction: string;
  legalForm: string;
  registeredAddress: string;
  registryChecked?: boolean;
  companyDocs: Partial<Record<InvestorDocumentKind, "uploaded" | "later">>;
  people: { name: string; role: "director" | "owner" | "signatory"; pct?: number }[];
  signatoryTitle: string;
  bank?: { bank: string; iban: string; swift: string; currency: Currency };
}

export const EMPTY_DRAFT: OnboardingDraft = {
  accountType: "individual",
  name: "",
  email: "",
  phone: "",
  residency: "",
  citizenship: "",
  companyName: "",
  registrationNumber: "",
  incorporationCountry: "",
  liveness: false,
  chain: "ethereum",
  walletAddress: "",
  consents: { accuracy: false, terms: false, screening: false },
  skipped: [],
  interests: [],
  kybJurisdiction: "",
  legalForm: "",
  registeredAddress: "",
  companyDocs: {},
  people: [],
  signatoryTitle: "Director",
};

/** Scan visual used for a country identity option. */
export function scanTypeFor(o: IdOption): DocType {
  return o.kind === "passport" ? "passport" : o.key === "emirates-id" ? "emirates-id" : "national-id";
}

export function idOptionsFor(d: Pick<OnboardingDraft, "residency" | "citizenship">): IdOption[] {
  const k = kycFor(d.residency || d.citizenship);
  return k.ids;
}

/** Items the applicant has left for later, recorded as missing on the new account. */
export function outstandingKeys(d: OnboardingDraft): VerificationKey[] {
  const out = new Set<VerificationKey>(d.skipped);
  if (!d.doc) out.add("identity-document");
  if (!d.liveness) out.add("liveness");
  if (d.accountType === "individual" && !d.digitalId && d.address !== "provided") out.add("address");
  if (d.accountType === "entity") {
    const req = kybFor(d.kybJurisdiction).docs.filter((x) => x.required);
    if (req.some((x) => d.companyDocs[x.kind] !== "uploaded")) out.add("company-documents");
    if (!d.people.some((p) => p.role === "owner")) out.add("beneficial-owners");
    if (!d.registryChecked) out.add("company-registry");
    if (!d.bank) out.add("bank-account");
  }
  return [...out];
}

export const OUTSTANDING_LABEL: Partial<Record<VerificationKey, string>> = {
  "identity-document": "Identity document",
  liveness: "Liveness check",
  address: "Proof of address",
  "bank-account": "Bank account",
  "company-documents": "Company documents",
  "beneficial-owners": "Beneficial owners",
  "company-registry": "Registry check",
  directors: "Directors",
  signatories: "Signatories",
};

/** Sample applicant for demos. Mei Lin Tan has a profile photo, so the console shows her face. */
export function sampleApplicant(type: AccountType): Partial<OnboardingDraft> {
  const tag = randomHex(4);
  return {
    name: "Mei Lin Tan",
    email: `mei.lin.tan.${tag}@example.sg`,
    phone: "+65 9123 4567",
    residency: "SG",
    citizenship: "SG",
    ...(type === "entity" ? { companyName: "Tan Family Holdings Pte Ltd", registrationNumber: `2019${tag.toUpperCase()}K`, incorporationCountry: "SG", kybJurisdiction: "SG", legalForm: "Private company limited by shares (Pte Ltd)" } : {}),
  };
}

const BLOCKED = new Set(["KP", "IR", "SY", "CU"]);
export const COUNTRY_OPTIONS = Object.entries(COUNTRY_NAME)
  .filter(([c]) => !BLOCKED.has(c))
  .sort((a, b) => a[1].localeCompare(b[1]))
  .map(([code, name]) => ({ code, name }));

const phoneRe = /^\+?[0-9 ()-]{7,20}$/;

const personSchema = {
  name: z.string().trim().min(2, "Enter your full legal name as shown on your ID"),
  email: z.email("Enter a valid email address, for example name@example.com"),
  phone: z.string().trim().regex(phoneRe, "Enter the number with country code, for example +971 50 123 4567"),
  residency: z.string().min(2, "Choose your country of residence"),
  citizenship: z.string().min(2, "Choose your citizenship"),
};

export const individualSchema = z.object(personSchema);
export const entitySchema = z.object({
  companyName: z.string().trim().min(2, "Enter the registered company name"),
  registrationNumber: z.string().trim().min(3, "Enter the registration number from the certificate of incorporation"),
  incorporationCountry: z.string().min(2, "Choose the country of incorporation"),
  ...personSchema,
  name: z.string().trim().min(2, "Enter the authorised signatory's full legal name"),
});

export const companySchema = z.object({
  kybJurisdiction: z.string().min(2, "Choose where the company is registered"),
  companyName: z.string().trim().min(2, "Enter the registered company name"),
  registrationNumber: z.string().trim().min(3, "Enter the registration number from the registry record"),
});

export function validateCompany(d: OnboardingDraft): Record<string, string> {
  const r = companySchema.safeParse(d);
  const errors: Record<string, string> = {};
  if (!r.success) for (const i of r.error.issues) errors[String(i.path[0])] ??= i.message;
  return errors;
}

export function validateDetails(d: OnboardingDraft): Record<string, string> {
  const schema = d.accountType === "entity" ? z.object({ ...personSchema, name: z.string().trim().min(2, "Enter the authorised signatory's full legal name") }) : individualSchema;
  const r = schema.safeParse(d);
  const errors: Record<string, string> = {};
  if (!r.success) for (const i of r.error.issues) errors[String(i.path[0])] ??= i.message;
  return errors;
}

/* ------------------------------ classification ----------------------------- */

const BAND_RANK: Record<AssetsBand, number> = { "under-200k": 0, "200k-1m": 1, "1m-5m": 2, "over-5m": 3 };

export function classify(d: Pick<OnboardingDraft, "experience" | "assets" | "status">): InvestorClassification | null {
  if (!d.experience || !d.assets || !d.status) return null;
  const a = BAND_RANK[d.assets];
  if (a === 3 || (a === 2 && d.experience === "extensive")) return "accredited";
  if (a >= 2 || (d.status !== "none" && d.experience !== "none") || (a === 1 && d.experience === "extensive")) return "professional";
  return "retail";
}

export const CLASS_EXPLAIN: Partial<Record<InvestorClassification, string>> = {
  retail: "Retail offerings with suitability checks and investment limits.",
  professional: "Meets the professional client test. Wider product access.",
  accredited: "Meets the wealth test for private placements.",
};

/* ---------------------------------- wallet --------------------------------- */

export const EVM_RE = /^0x[a-fA-F0-9]{40}$/;
export const SOL_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

export function walletError(chain: Chain, address: string): string | undefined {
  const a = address.trim();
  if (!a) return "Enter your wallet address";
  if (chain === "solana") return SOL_RE.test(a) ? undefined : "Enter a Solana address (32 to 44 base58 characters)";
  return EVM_RE.test(a) ? undefined : "Enter an address that starts with 0x followed by 40 hex characters";
}

export function newAddress(chain: Chain): string {
  if (chain !== "solana") return `0x${randomHex(40)}`;
  const bytes = new Uint8Array(44);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => B58[b % 58]).join("");
}

/* --------------------------------- mapping --------------------------------- */

export function toInvestorInput(d: OnboardingDraft, classification: InvestorClassification): NewInvestorInput {
  const entity = d.accountType === "entity";
  const docs: InvestorDocument["kind"][] = [];
  const opt = idOptionsFor(d).find((o) => o.key === d.idKey);
  if (d.doc && opt) docs.push(opt.kind);
  if (!entity && (d.address === "provided" || d.digitalId)) docs.push("proof-of-address");
  if (entity) (Object.entries(d.companyDocs) as [InvestorDocumentKind, string][]).filter(([, v]) => v === "uploaded").forEach(([k]) => docs.push(k));
  if (classification !== "retail") docs.push("accreditation-letter");
  docs.push("source-of-funds");
  const kyb = kybFor(d.kybJurisdiction || d.incorporationCountry);
  return {
    type: entity ? "entity" : "individual",
    name: (entity ? d.companyName : d.name).trim(),
    email: d.email.trim(),
    phone: d.phone.trim() || undefined,
    country: entity ? d.incorporationCountry : d.residency,
    residency: entity ? d.incorporationCountry : d.residency,
    citizenship: entity ? undefined : d.citizenship,
    entityType: entity ? "corporate" : undefined,
    registrationNumber: entity ? d.registrationNumber.trim() : undefined,
    classification,
    wallet: d.walletAddress ? { address: d.walletAddress.trim(), chain: d.chain, type: d.walletMode === "mpc" ? "mpc" : "self-custody", custodian: d.walletMode === "mpc" ? "Fireblocks" : undefined } : undefined,
    documents: docs,
    skipped: outstandingKeys(d),
    idDocumentLabel: d.idLabel,
    interests: d.interests.length || d.risk ? { assetTypes: d.interests, regions: [], risk: d.risk ?? "medium", goal: "income" } : undefined,
    beneficialOwners: entity ? d.people.filter((p) => p.role === "owner").map((p) => ({ name: p.name, ownershipPct: p.pct ?? 0, nationality: d.incorporationCountry, pep: false })) : undefined,
    company: entity
      ? {
          jurisdiction: d.kybJurisdiction || d.incorporationCountry, registry: kyb.registry, legalForm: d.legalForm || kyb.legalForms[0], registeredAddress: d.registeredAddress || undefined,
          directors: d.people.filter((p) => p.role === "director").map((p) => ({ name: p.name, role: "Director", verified: false })),
          signatories: [{ name: d.name.trim(), title: d.signatoryTitle, email: d.email.trim(), verified: false }, ...d.people.filter((p) => p.role === "signatory").map((p) => ({ name: p.name, title: "Authorised signatory", email: "", verified: false }))],
          bankAccounts: d.bank ? [{ ...d.bank, verified: false, method: "Statement review" }] : [],
        }
      : undefined,
  };
}

/* ----------------------------------- MRZ ----------------------------------- */

const A3: Record<string, string> = {
  AE: "ARE", SA: "SAU", BH: "BHR", KW: "KWT", QA: "QAT", OM: "OMN", GB: "GBR", SG: "SGP", CH: "CHE", LU: "LUX", DE: "D<<", FR: "FRA",
  PK: "PAK", US: "USA", KY: "CYM", IN: "IND", JO: "JOR", EG: "EGY", CA: "CAN", JP: "JPN", SE: "SWE", BG: "BGR",
};

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function check(s: string) {
  const w = [7, 3, 1];
  let t = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    const v = c === "<" ? 0 : /\d/.test(c) ? +c : c.charCodeAt(0) - 55;
    t += v * w[i % 3];
  }
  return String(t % 10);
}

const pad = (s: string, n: number) => (s + "<".repeat(n)).slice(0, n);
const clean = (s: string) => s.toUpperCase().normalize("NFD").replace(/[^A-Z ]/g, "").trim();
const ymd = (d: Date) => `${String(d.getUTCFullYear()).slice(2)}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;
const human = (d: Date) => new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(d);

/** Deterministic, checksum-valid document data for the simulated scan. */
export function buildDocument(d: OnboardingDraft, type: DocType): ExtractedDoc {
  const h = hash(`${d.name}|${type}`);
  const nat = type === "emirates-id" ? "AE" : d.citizenship || "AE";
  const issuer = A3[nat] ?? "XXX";
  const natA3 = A3[d.citizenship] ?? issuer;
  const dob = new Date(Date.UTC(1972 + (h % 24), (h >> 5) % 12, 1 + ((h >> 9) % 28)));
  const expiry = new Date(Date.UTC(new Date().getUTCFullYear() + 2 + ((h >> 13) % 6), (h >> 3) % 12, 1 + ((h >> 7) % 28)));
  const parts = clean(d.name).split(/\s+/).filter(Boolean);
  const surname = parts.length > 1 ? parts[parts.length - 1] : parts[0] ?? "APPLICANT";
  const given = parts.slice(0, -1).join("<");
  const nameField = `${surname}<<${given}`;

  if (type === "passport") {
    const num = `${String.fromCharCode(65 + (h % 26))}${String(10_000_000 + (h % 89_999_999)).slice(0, 8)}`;
    const l1 = pad(`P<${issuer}${nameField}`, 44);
    const docPart = `${pad(num, 9)}${check(pad(num, 9))}`;
    const dobPart = `${ymd(dob)}${check(ymd(dob))}`;
    const expPart = `${ymd(expiry)}${check(ymd(expiry))}`;
    const personal = pad("", 14);
    const composite = check(docPart + dobPart + expPart + personal + check(personal));
    const l2 = `${docPart}${natA3}${dobPart}<${expPart}${personal}${check(personal)}${composite}`;
    return { fullName: d.name.trim(), number: num, nationality: COUNTRY_NAME[d.citizenship] ?? d.citizenship, dob: human(dob), expiry: human(expiry), mrz: [l1, l2], confidence: 98.7 };
  }

  const serial = String(100_000_000 + (h % 899_999_999)).slice(0, 9);
  const display = type === "emirates-id" ? `784-${dob.getUTCFullYear()}-${String(h % 10_000_000).padStart(7, "0")}-${check(serial)}` : serial;
  const code = type === "emirates-id" ? "IL" : "ID";
  const l1 = pad(`${code}${issuer}${serial}${check(serial)}`, 30);
  const l2core = `${ymd(dob)}${check(ymd(dob))}<${ymd(expiry)}${check(ymd(expiry))}${natA3}${pad("", 11)}`;
  const l2 = `${l2core}${check(l1.slice(5, 30) + l2core.slice(0, 7) + l2core.slice(8, 15) + l2core.slice(18, 29))}`;
  const l3 = pad(nameField, 30);
  return { fullName: d.name.trim(), number: display, nationality: COUNTRY_NAME[d.citizenship] ?? d.citizenship, dob: human(dob), expiry: human(expiry), mrz: [l1, l2, l3], confidence: 99.1 };
}

export const DOC_META: Record<DocType, { label: string; short: string }> = {
  passport: { label: "Passport", short: "Photo page" },
  "national-id": { label: "National ID card", short: "Front and back" },
  "emirates-id": { label: "Emirates ID", short: "Front and back" },
};
