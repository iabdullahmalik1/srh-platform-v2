import {
  ArrowLeftRight,
  BadgeCheck,
  Building,
  ChartCandlestick,
  CirclePlus,
  Coins,
  Eye,
  FileText,
  HandCoins,
  History,
  Network,
  PieChart,
  PlugZap,
  Scale,
  ScanFace,
  ScrollText,
  Settings2,
  UserPlus,
  Vote,
  type LucideIcon,
} from "lucide-react";
import type { Persona, Role } from "@/types/domain";
import { ROLE_PERMISSIONS, type Permission } from "@/lib/constants";

type Chip = { icon: LucideIcon; label: string };

const PERMISSION_CHIP: Record<Permission, Chip> = {
  "investors.write": { icon: UserPlus, label: "Onboard" },
  "kyc.decide": { icon: ScanFace, label: "KYC" },
  "compliance.decide": { icon: BadgeCheck, label: "Approvals" },
  "policy.write": { icon: ScrollText, label: "Policy" },
  "assets.write": { icon: Building, label: "Assets" },
  "orders.operate": { icon: ArrowLeftRight, label: "Orders" },
  "orders.subscribe": { icon: CirclePlus, label: "Subscribe" },
  "tokens.request": { icon: Coins, label: "Tokens" },
  "approvals.decide": { icon: BadgeCheck, label: "Approvals" },
  "servicing.write": { icon: HandCoins, label: "Servicing" },
  "recon.resolve": { icon: Scale, label: "Reconcile" },
  "markets.trade": { icon: ChartCandlestick, label: "Trade" },
  "platform.configure": { icon: Settings2, label: "Configure" },
  "defi.configure": { icon: Network, label: "DeFi" },
  "votes.cast": { icon: Vote, label: "Vote" },
  "providers.test": { icon: PlugZap, label: "Integrations" },
  "overrides.decide": { icon: BadgeCheck, label: "Overrides" },
  "listing.override": { icon: Building, label: "Listings" },
  "valuation.enter": { icon: Scale, label: "Valuations" },
  "issuance.verify": { icon: BadgeCheck, label: "Issuance" },
  "rules.write": { icon: Settings2, label: "Rules" },
  "documents.write": { icon: Building, label: "Documents" },
};

/** The permissions that best describe each role, in display order. */
const ROLE_FOCUS: Record<Role, Permission[]> = {
  operations: ["orders.operate", "recon.resolve", "servicing.write"],
  "compliance-officer": ["kyc.decide", "overrides.decide", "policy.write"],
  "platform-admin": ["platform.configure", "tokens.request", "defi.configure"],
  "issuer-admin": ["assets.write", "servicing.write", "approvals.decide"],
  investor: ["orders.subscribe", "markets.trade"],
  auditor: [],
};

/** Read-only capabilities used to fill roles with fewer than three write permissions. */
const READ_CHIPS: Partial<Record<Role, Chip[]>> = {
  investor: [{ icon: PieChart, label: "Portfolio" }],
  auditor: [
    { icon: Eye, label: "Read only" },
    { icon: History, label: "Audit trail" },
    { icon: FileText, label: "Reports" },
  ],
};

/** Three capability chips for a role, derived from ROLE_PERMISSIONS. */
export function roleChips(role: Role): Chip[] {
  const granted = ROLE_PERMISSIONS[role];
  const chips = ROLE_FOCUS[role].filter((p) => granted.includes(p)).map((p) => PERMISSION_CHIP[p]);
  return [...chips, ...(READ_CHIPS[role] ?? [])].slice(0, 3);
}

export const PERSONA_GROUPS: { key: string; label: string; roles: Role[] }[] = [
  { key: "platform", label: "Platform team", roles: ["operations", "compliance-officer", "platform-admin"] },
  { key: "issuer", label: "Issuer", roles: ["issuer-admin"] },
  { key: "investor", label: "Investor", roles: ["investor"] },
  { key: "audit", label: "External audit", roles: ["auditor"] },
];

export function groupPersonas(personas: Persona[]) {
  return PERSONA_GROUPS.map((g) => ({ ...g, personas: g.roles.flatMap((r) => personas.filter((p) => p.role === r)) })).filter((g) => g.personas.length);
}
