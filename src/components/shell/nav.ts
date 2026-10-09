import {
  LayoutDashboard, ListChecks, Users, Building2, ShieldCheck, Siren, ScrollText, Layers, Megaphone, Coins, Workflow, Banknote, ChartCandlestick,
  Droplets, BookUser, Scale, CalendarClock, Vault, History, Landmark, Plug, Code2, Settings, Wallet, Store, SlidersHorizontal, LayoutGrid,
  type LucideIcon,
} from "lucide-react";
import type { ModuleKey, Role } from "@/types/domain";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  module?: ModuleKey;
  roles?: Role[];
  badge?: "approvals" | "alerts" | "breaks" | "orders";
}

export interface NavGroup {
  label?: string;
  items: NavItem[];
}

const STAFF: Role[] = ["platform-admin", "operations", "compliance-officer", "issuer-admin", "auditor"];

export const CONSOLE_NAV: NavGroup[] = [
  { items: [
    { href: "/overview", label: "Overview", icon: LayoutDashboard, roles: STAFF },
    { href: "/approvals", label: "Approvals", icon: ListChecks, roles: STAFF, badge: "approvals" },
  ] },
  { label: "Identity & compliance", items: [
    { href: "/identity/investors", label: "Investors", icon: Users, module: "identity", roles: STAFF },
    { href: "/identity/issuers", label: "Issuers", icon: Building2, module: "identity", roles: STAFF },
    { href: "/compliance", label: "Eligibility engine", icon: ShieldCheck, module: "compliance", roles: STAFF },
    { href: "/compliance/screening", label: "Screening", icon: Siren, module: "compliance", roles: STAFF, badge: "alerts" },
    { href: "/compliance/policies", label: "Policy packs", icon: ScrollText, module: "compliance", roles: STAFF },
  ] },
  { label: "Products", items: [
    { href: "/assets", label: "Asset registry", icon: Layers, module: "assets", roles: STAFF },
    { href: "/offerings", label: "Offerings", icon: Megaphone, module: "primary-market" },
    { href: "/tokens", label: "Token factory", icon: Coins, module: "tokenization", roles: STAFF },
  ] },
  { label: "Transactions", items: [
    { href: "/orders", label: "Order lifecycle", icon: Workflow, module: "primary-market", badge: "orders" },
    { href: "/payments", label: "Payments & settlement", icon: Banknote, module: "payments", roles: STAFF },
    { href: "/markets", label: "Secondary markets", icon: ChartCandlestick, module: "secondary-market" },
    { href: "/defi", label: "DeFi gateway", icon: Droplets, module: "defi", roles: STAFF },
  ] },
  { label: "Records & servicing", items: [
    { href: "/registry", label: "Investor register", icon: BookUser, module: "registry", roles: STAFF },
    { href: "/registry/reconciliation", label: "Reconciliation", icon: Scale, module: "registry", roles: STAFF, badge: "breaks" },
    { href: "/servicing", label: "Asset servicing", icon: CalendarClock, module: "servicing", roles: STAFF },
    { href: "/custody", label: "Custody & wallets", icon: Vault, module: "custody", roles: STAFF },
    { href: "/audit", label: "Audit trail", icon: History, roles: STAFF },
  ] },
  { label: "Platform", items: [
    { href: "/platform", label: "Tenant & licences", icon: Landmark, roles: ["platform-admin", "operations", "compliance-officer", "auditor"] },
    { href: "/platform/rules", label: "Internal rules", icon: SlidersHorizontal, roles: ["platform-admin", "compliance-officer", "operations", "auditor"] },
    { href: "/platform/integrations", label: "Integrations", icon: Plug, roles: ["platform-admin", "operations", "auditor"] },
    { href: "/platform/developers", label: "Developers & API", icon: Code2, roles: ["platform-admin", "operations"] },
    { href: "/settings", label: "Settings", icon: Settings },
  ] },
];

export const INVESTOR_NAV: NavGroup[] = [
  { items: [
    { href: "/home", label: "Home", icon: LayoutGrid },
    { href: "/portfolio", label: "Portfolio", icon: Wallet },
    { href: "/offerings", label: "Marketplace", icon: Store, module: "primary-market" },
    { href: "/orders", label: "My orders", icon: Workflow, module: "primary-market" },
    { href: "/markets", label: "Secondary market", icon: ChartCandlestick, module: "secondary-market" },
    { href: "/settings", label: "Settings", icon: Settings },
  ] },
];

const ALL = [...CONSOLE_NAV, ...INVESTOR_NAV].flatMap((g) => g.items);

/** Resolve the nav item that owns a pathname (longest prefix match). */
export function matchNav(pathname: string): NavItem | undefined {
  return ALL.filter((i) => pathname === i.href || pathname.startsWith(i.href + "/")).sort((a, b) => b.href.length - a.href.length)[0];
}

/** Routes outside the nav that still need gating. */
export const EXTRA_ROUTES: { prefix: string; module?: ModuleKey; roles?: Role[] }[] = [
  { prefix: "/identity/onboard", module: "identity", roles: ["platform-admin", "operations", "compliance-officer"] },
  { prefix: "/assets/new", module: "assets", roles: ["platform-admin", "operations", "issuer-admin"] },
  { prefix: "/orders/new", module: "primary-market", roles: ["operations", "investor"] },
  { prefix: "/assets/ast_", module: "assets", roles: [...STAFF, "investor"] },
];
