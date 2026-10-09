/**
 * Country-specific onboarding requirements.
 *
 * Identity documents, address evidence and company documents differ by country. The onboarding flows,
 * the back office checklist and the seed data all read from here, so a new country is one entry.
 */
import type { InvestorDocumentKind } from "@/types/domain";

export interface IdOption {
  key: string;
  label: string;
  /** Document kind recorded on the investor file. */
  kind: InvestorDocumentKind;
  sides: "photo page" | "front and back" | "digital";
  /** Government digital identity that returns verified data without a document scan. */
  digital?: { name: string; provider: string };
}

export interface CountryKyc {
  code: string;
  name: string;
  ids: IdOption[];
  address: string[];
  taxId: string;
}

const PASSPORT: IdOption = { key: "passport", label: "Passport", kind: "passport", sides: "photo page" };

export const KYC_COUNTRIES: Record<string, CountryKyc> = {
  AE: {
    code: "AE", name: "United Arab Emirates", taxId: "TRN (if registered)",
    ids: [
      { key: "uae-pass", label: "UAE Pass", kind: "national-id", sides: "digital", digital: { name: "UAE Pass", provider: "UAE Pass (TDRA)" } },
      { key: "emirates-id", label: "Emirates ID", kind: "national-id", sides: "front and back" },
      PASSPORT,
    ],
    address: ["Ejari tenancy contract", "DEWA, ADDC or SEWA utility bill", "Bank statement under 3 months"],
  },
  SA: {
    code: "SA", name: "Saudi Arabia", taxId: "National ID or Iqama number",
    ids: [
      { key: "nafath", label: "Nafath", kind: "national-id", sides: "digital", digital: { name: "Nafath", provider: "Nafath (NIC)" } },
      { key: "saudi-id", label: "National ID", kind: "national-id", sides: "front and back" },
      { key: "iqama", label: "Iqama (resident ID)", kind: "residence-id", sides: "front and back" },
      PASSPORT,
    ],
    address: ["National Address certificate (SPL)", "Bank statement under 3 months"],
  },
  PK: {
    code: "PK", name: "Pakistan", taxId: "NTN",
    ids: [
      { key: "cnic", label: "CNIC", kind: "national-id", sides: "front and back" },
      PASSPORT,
    ],
    address: ["Utility bill under 3 months", "Bank statement under 3 months"],
  },
  SG: {
    code: "SG", name: "Singapore", taxId: "NRIC or FIN",
    ids: [
      { key: "singpass", label: "Singpass Myinfo", kind: "national-id", sides: "digital", digital: { name: "Singpass Myinfo", provider: "Singpass (GovTech)" } },
      { key: "nric", label: "NRIC", kind: "national-id", sides: "front and back" },
      PASSPORT,
    ],
    address: ["Myinfo registered address", "Utility bill under 3 months"],
  },
  GB: {
    code: "GB", name: "United Kingdom", taxId: "National Insurance number",
    ids: [PASSPORT, { key: "uk-dl", label: "Photocard driving licence", kind: "driving-licence", sides: "front and back" }],
    address: ["Council tax bill", "Utility bill under 3 months", "Bank statement under 3 months"],
  },
  BH: {
    code: "BH", name: "Bahrain", taxId: "CPR number",
    ids: [{ key: "cpr", label: "CPR smart card", kind: "national-id", sides: "front and back" }, PASSPORT],
    address: ["CPR address record", "Utility bill under 3 months"],
  },
  QA: {
    code: "QA", name: "Qatar", taxId: "QID number",
    ids: [{ key: "qid", label: "Qatar ID", kind: "national-id", sides: "front and back" }, PASSPORT],
    address: ["Kahramaa utility bill", "Bank statement under 3 months"],
  },
  KW: {
    code: "KW", name: "Kuwait", taxId: "Civil ID number",
    ids: [{ key: "civil-id", label: "Civil ID", kind: "national-id", sides: "front and back" }, PASSPORT],
    address: ["PACI address record", "Bank statement under 3 months"],
  },
  IN: {
    code: "IN", name: "India", taxId: "PAN",
    ids: [{ key: "aadhaar", label: "Aadhaar", kind: "national-id", sides: "front and back" }, PASSPORT],
    address: ["Aadhaar address", "Utility bill under 3 months"],
  },
  US: {
    code: "US", name: "United States", taxId: "SSN or ITIN",
    ids: [{ key: "us-dl", label: "Driver's licence or state ID", kind: "driving-licence", sides: "front and back" }, PASSPORT],
    address: ["Utility bill under 3 months", "Bank statement under 3 months"],
  },
  CH: {
    code: "CH", name: "Switzerland", taxId: "AHV number",
    ids: [{ key: "ch-id", label: "Swiss identity card", kind: "national-id", sides: "front and back" }, PASSPORT],
    address: ["Residence registration certificate", "Utility bill under 3 months"],
  },
  LU: {
    code: "LU", name: "Luxembourg", taxId: "Matricule",
    ids: [{ key: "lu-id", label: "Luxembourg identity card", kind: "national-id", sides: "front and back" }, PASSPORT],
    address: ["Certificate of residence", "Utility bill under 3 months"],
  },
  DE: {
    code: "DE", name: "Germany", taxId: "Steuer-ID",
    ids: [{ key: "de-id", label: "Personalausweis", kind: "national-id", sides: "front and back" }, PASSPORT],
    address: ["Meldebescheinigung", "Utility bill under 3 months"],
  },
  FR: {
    code: "FR", name: "France", taxId: "Numero fiscal",
    ids: [{ key: "fr-id", label: "Carte nationale d'identite", kind: "national-id", sides: "front and back" }, PASSPORT],
    address: ["Justificatif de domicile under 3 months"],
  },
};

const DEFAULT_COUNTRY: CountryKyc = {
  code: "XX", name: "Other", taxId: "Tax identification number",
  ids: [PASSPORT, { key: "national-id", label: "National ID card", kind: "national-id", sides: "front and back" }],
  address: ["Utility bill under 3 months", "Bank statement under 3 months"],
};

export function kycFor(country: string | undefined): CountryKyc {
  return (country && KYC_COUNTRIES[country]) || { ...DEFAULT_COUNTRY, code: country ?? "XX" };
}

/** The document most investors in this country would use first. */
export function primaryIdLabel(country: string | undefined): string {
  const c = kycFor(country);
  return (c.ids.find((i) => !i.digital) ?? PASSPORT).label;
}

/* ------------------------------- companies ------------------------------- */

export interface CompanyDocRequirement {
  kind: InvestorDocumentKind;
  label: string;
  required: boolean;
}

export interface CountryKyb {
  code: string;
  name: string;
  registry: string;
  /** Label for the company number field. */
  numberLabel: string;
  numberHint: string;
  /** Registry lookup available as an automated integration. */
  lookup?: string;
  legalForms: string[];
  docs: CompanyDocRequirement[];
}

const CORE_DOCS: CompanyDocRequirement[] = [
  { kind: "register-of-directors", label: "Register of directors", required: true },
  { kind: "register-of-beneficial-owners", label: "Register of beneficial owners", required: true },
  { kind: "board-resolution", label: "Board resolution to invest", required: true },
  { kind: "authorised-signatories", label: "Authorised signatory list", required: true },
  { kind: "bank-statement", label: "Company bank statement under 3 months", required: false },
];

export const KYB_COUNTRIES: Record<string, CountryKyb> = {
  "AE-ML": {
    code: "AE-ML", name: "UAE mainland", registry: "Department of Economy and Tourism", numberLabel: "Trade licence number", numberHint: "e.g. 1234567",
    legalForms: ["Limited liability company", "Sole establishment", "Public joint stock company"],
    docs: [
      { kind: "trade-licence", label: "Trade licence", required: true },
      { kind: "memorandum", label: "Memorandum of association", required: true },
      { kind: "tax-certificate", label: "Corporate tax registration (TRN)", required: false },
      ...CORE_DOCS,
    ],
  },
  "AE-FZ": {
    code: "AE-FZ", name: "UAE free zone (DMCC, JAFZA, DAFZA and others)", registry: "Free zone authority", numberLabel: "Licence number", numberHint: "e.g. DMCC-123456",
    legalForms: ["Free zone company (FZCO)", "Free zone establishment (FZE)"],
    docs: [
      { kind: "trade-licence", label: "Free zone licence", required: true },
      { kind: "incorporation", label: "Certificate of incorporation", required: true },
      { kind: "memorandum", label: "Memorandum and articles", required: true },
      { kind: "register-of-members", label: "Share certificate or register of members", required: true },
      ...CORE_DOCS,
    ],
  },
  "AE-ADGM": {
    code: "AE-ADGM", name: "ADGM (Abu Dhabi Global Market)", registry: "ADGM Registration Authority", numberLabel: "Registration number", numberHint: "e.g. 000012345", lookup: "ADGM public register",
    legalForms: ["Private company limited by shares", "Special purpose vehicle", "Foundation", "Limited partnership"],
    docs: [
      { kind: "incorporation", label: "Certificate of incorporation", required: true },
      { kind: "memorandum", label: "Articles of association", required: true },
      { kind: "register-of-members", label: "Register of members", required: true },
      ...CORE_DOCS,
    ],
  },
  "AE-DIFC": {
    code: "AE-DIFC", name: "DIFC (Dubai International Financial Centre)", registry: "DIFC Registrar of Companies", numberLabel: "Registration number", numberHint: "e.g. CL1234", lookup: "DIFC public register",
    legalForms: ["Private company", "Prescribed company", "Foundation", "Limited partnership"],
    docs: [
      { kind: "incorporation", label: "Certificate of incorporation", required: true },
      { kind: "trade-licence", label: "Commercial licence", required: true },
      { kind: "memorandum", label: "Articles of association", required: true },
      ...CORE_DOCS,
    ],
  },
  GB: {
    code: "GB", name: "United Kingdom", registry: "Companies House", numberLabel: "Company number", numberHint: "8 characters, e.g. 01234567", lookup: "Companies House API",
    legalForms: ["Private limited company (Ltd)", "Public limited company (plc)", "Limited liability partnership (LLP)", "Pension scheme trust"],
    docs: [
      { kind: "incorporation", label: "Certificate of incorporation", required: true },
      { kind: "memorandum", label: "Articles of association", required: true },
      { kind: "register-of-beneficial-owners", label: "PSC register (people with significant control)", required: true },
      { kind: "register-of-directors", label: "Officers list from Companies House", required: true },
      { kind: "board-resolution", label: "Board resolution to invest", required: true },
      { kind: "authorised-signatories", label: "Authorised signatory list", required: true },
    ],
  },
  SG: {
    code: "SG", name: "Singapore", registry: "ACRA", numberLabel: "UEN", numberHint: "e.g. 201912345K", lookup: "ACRA BizFile",
    legalForms: ["Private company limited by shares (Pte Ltd)", "Variable capital company (VCC)", "Limited partnership"],
    docs: [
      { kind: "incorporation", label: "ACRA business profile (BizFile)", required: true },
      { kind: "memorandum", label: "Company constitution", required: true },
      { kind: "register-of-beneficial-owners", label: "Register of registrable controllers", required: true },
      ...CORE_DOCS.filter((d) => d.kind !== "register-of-beneficial-owners"),
    ],
  },
  SA: {
    code: "SA", name: "Saudi Arabia", registry: "Ministry of Commerce", numberLabel: "Commercial Registration (CR) number", numberHint: "10 digits", lookup: "Wathq CR service",
    legalForms: ["Limited liability company", "Closed joint stock company", "Simplified joint stock company"],
    docs: [
      { kind: "trade-licence", label: "Commercial Registration certificate", required: true },
      { kind: "memorandum", label: "Articles of association", required: true },
      { kind: "tax-certificate", label: "ZATCA VAT certificate", required: false },
      ...CORE_DOCS,
    ],
  },
  PK: {
    code: "PK", name: "Pakistan", registry: "SECP", numberLabel: "Incorporation number", numberHint: "e.g. 0123456", lookup: "SECP eServices",
    legalForms: ["Private limited company", "Public limited company", "Single member company"],
    docs: [
      { kind: "incorporation", label: "SECP certificate of incorporation", required: true },
      { kind: "memorandum", label: "Memorandum and articles", required: true },
      { kind: "register-of-directors", label: "Form A or Form 29 (directors)", required: true },
      { kind: "tax-certificate", label: "NTN certificate (FBR)", required: true },
      { kind: "register-of-beneficial-owners", label: "Beneficial ownership declaration", required: true },
      { kind: "board-resolution", label: "Board resolution to invest", required: true },
      { kind: "authorised-signatories", label: "Authorised signatory list", required: true },
    ],
  },
  KY: {
    code: "KY", name: "Cayman Islands", registry: "Cayman Registrar of Companies", numberLabel: "Registration number", numberHint: "e.g. 123456",
    legalForms: ["Exempted company", "Segregated portfolio company", "Exempted limited partnership"],
    docs: [
      { kind: "incorporation", label: "Certificate of incorporation", required: true },
      { kind: "memorandum", label: "Memorandum and articles", required: true },
      { kind: "good-standing", label: "Certificate of good standing", required: true },
      { kind: "register-of-members", label: "Register of members", required: true },
      ...CORE_DOCS,
    ],
  },
  VG: {
    code: "VG", name: "British Virgin Islands", registry: "BVI Registry of Corporate Affairs", numberLabel: "Company number", numberHint: "e.g. 1234567",
    legalForms: ["BVI business company", "Limited partnership"],
    docs: [
      { kind: "incorporation", label: "Certificate of incorporation", required: true },
      { kind: "memorandum", label: "Memorandum and articles", required: true },
      { kind: "good-standing", label: "Certificate of good standing", required: true },
      { kind: "register-of-members", label: "Register of members", required: true },
      ...CORE_DOCS,
    ],
  },
  LU: {
    code: "LU", name: "Luxembourg", registry: "Luxembourg Business Registers (RCS)", numberLabel: "RCS number", numberHint: "e.g. B123456", lookup: "LBR extract",
    legalForms: ["Societe anonyme (SA)", "Societe a responsabilite limitee (Sarl)", "SCSp", "SICAV"],
    docs: [
      { kind: "incorporation", label: "RCS extract", required: true },
      { kind: "memorandum", label: "Articles of association", required: true },
      { kind: "register-of-beneficial-owners", label: "RBE extract (beneficial owners)", required: true },
      ...CORE_DOCS.filter((d) => d.kind !== "register-of-beneficial-owners"),
    ],
  },
  CH: {
    code: "CH", name: "Switzerland", registry: "Commercial register (Zefix)", numberLabel: "UID", numberHint: "CHE-123.456.789", lookup: "Zefix",
    legalForms: ["Aktiengesellschaft (AG)", "GmbH", "Foundation"],
    docs: [
      { kind: "incorporation", label: "Commercial register extract", required: true },
      { kind: "memorandum", label: "Articles of association", required: true },
      ...CORE_DOCS,
    ],
  },
  BH: {
    code: "BH", name: "Bahrain", registry: "Sijilat (MOIC)", numberLabel: "CR number", numberHint: "e.g. 12345-1", lookup: "Sijilat",
    legalForms: ["With limited liability (WLL)", "Bahraini shareholding company (BSC)"],
    docs: [
      { kind: "trade-licence", label: "Commercial Registration certificate", required: true },
      { kind: "memorandum", label: "Memorandum of association", required: true },
      ...CORE_DOCS,
    ],
  },
  US: {
    code: "US", name: "United States", registry: "Secretary of State (state of formation)", numberLabel: "EIN", numberHint: "12-3456789",
    legalForms: ["Limited liability company (LLC)", "Corporation", "Limited partnership"],
    docs: [
      { kind: "incorporation", label: "Certificate of formation or incorporation", required: true },
      { kind: "memorandum", label: "Operating agreement or bylaws", required: true },
      { kind: "tax-certificate", label: "IRS EIN letter and W-9", required: true },
      ...CORE_DOCS,
    ],
  },
};

const DEFAULT_KYB: CountryKyb = {
  code: "XX", name: "Other jurisdiction", registry: "Company registry", numberLabel: "Registration number", numberHint: "As shown on the certificate",
  legalForms: ["Limited company", "Partnership", "Trust", "Foundation"],
  docs: [
    { kind: "incorporation", label: "Certificate of incorporation", required: true },
    { kind: "memorandum", label: "Constitutional documents", required: true },
    { kind: "good-standing", label: "Certificate of good standing", required: false },
    ...CORE_DOCS,
  ],
};

export function kybFor(code: string | undefined): CountryKyb {
  if (!code) return DEFAULT_KYB;
  if (KYB_COUNTRIES[code]) return KYB_COUNTRIES[code];
  if (code === "AE") return KYB_COUNTRIES["AE-ML"];
  return { ...DEFAULT_KYB, code };
}

export const KYB_OPTIONS = Object.values(KYB_COUNTRIES).map((c) => ({ value: c.code, label: c.name }));

/** Typical settlement bank for a company in each country, used for sample data. */
export const SAMPLE_BANK: Record<string, { bank: string; swift: string; iban: (n: string) => string }> = {
  AE: { bank: "Emirates NBD", swift: "EBILAEAD", iban: (n) => `AE07 0260 0010 ${n.slice(0, 4)} ${n.slice(4, 8)} 001` },
  GB: { bank: "HSBC UK", swift: "HBUKGB4B", iban: (n) => `GB29 HBUK 4012 3456 ${n.slice(0, 8)}` },
  SG: { bank: "DBS Bank", swift: "DBSSSGSG", iban: (n) => `DBS ${n.slice(0, 3)}-${n.slice(3, 9)}-0` },
  SA: { bank: "Saudi National Bank", swift: "NCBKSAJE", iban: (n) => `SA03 1000 0000 ${n.slice(0, 4)} ${n.slice(4, 8)} 0001` },
  KY: { bank: "Butterfield Bank (Cayman)", swift: "BNTBKYKY", iban: (n) => `ACCT ${n.slice(0, 8)}` },
  CH: { bank: "UBS Switzerland", swift: "UBSWCHZH80A", iban: (n) => `CH93 0076 2011 ${n.slice(0, 4)} ${n.slice(4, 8)} 1` },
  LU: { bank: "BGL BNP Paribas", swift: "BGLLLULL", iban: (n) => `LU28 0030 ${n.slice(0, 4)} ${n.slice(4, 8)} 0000` },
  BH: { bank: "National Bank of Bahrain", swift: "NBOBBHBM", iban: (n) => `BH67 NBOB 0000 ${n.slice(0, 8)} 01` },
  PK: { bank: "HBL", swift: "HABBPKKA", iban: (n) => `PK36 HABB 0000 ${n.slice(0, 8)} 0103` },
  US: { bank: "JPMorgan Chase", swift: "CHASUS33", iban: (n) => `ACCT ${n.slice(0, 9)}` },
};
