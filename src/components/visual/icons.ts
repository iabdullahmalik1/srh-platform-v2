/**
 * Icon vocabulary shared by the visual helpers. One icon per concept so the same idea
 * reads the same way on every page.
 */
import {
  ArrowLeftRight, Banknote, BookUser, Briefcase, Building2, CalendarClock, ChartCandlestick, Coins, Database, Droplets, Fingerprint, Flame,
  Gavel, Handshake, Landmark, Layers, Megaphone, Network, Newspaper, OctagonPause, PackagePlus, Radar, Rocket, ScrollText, Send, Settings2,
  ShieldCheck, Siren, Snowflake, Store, UserRound, Users, Vault, Wallet, Waypoints, Workflow, UserCheck, LineChart, ListChecks,
  type LucideIcon,
} from "lucide-react";
import type * as D from "@/types/domain";

export const MODULE_ICON: Record<D.ModuleKey, LucideIcon> = {
  identity: Users,
  compliance: ShieldCheck,
  assets: Layers,
  tokenization: Coins,
  "primary-market": Megaphone,
  payments: Banknote,
  custody: Vault,
  registry: BookUser,
  servicing: CalendarClock,
  "secondary-market": ChartCandlestick,
  defi: Droplets,
};

export const ACTIVITY_ICON: Record<D.RegulatedActivity, LucideIcon> = {
  issuance: PackagePlus,
  distribution: Megaphone,
  brokerage: Handshake,
  custody: Vault,
  "transfer-agency": BookUser,
  "payment-handling": Banknote,
  "marketplace-operation": Store,
  "fund-management": Briefcase,
  settlement: ArrowLeftRight,
  compliance: ShieldCheck,
  "asset-servicing": CalendarClock,
};

export const PROVIDER_ICON: Record<D.ProviderCategory, LucideIcon> = {
  kyc: Fingerprint,
  kyb: Building2,
  aml: Radar,
  custody: Vault,
  banking: Landmark,
  payments: Banknote,
  oracle: Database,
  market: ChartCandlestick,
  blockchain: Network,
  tokenization: Coins,
};

export const APPROVAL_ICON: Record<D.ApprovalType, LucideIcon> = {
  mint: Coins,
  burn: Flame,
  pause: OctagonPause,
  freeze: Snowflake,
  "forced-transfer": Send,
  "config-change": Settings2,
  "treasury-movement": Wallet,
  distribution: CalendarClock,
  "policy-change": ScrollText,
  "asset-launch": Rocket,
  "verification-override": UserCheck,
  "manual-valuation": LineChart,
  "listing-override": ListChecks,
};

export const ALERT_ICON: Record<D.AlertType, LucideIcon> = {
  sanctions: Gavel,
  pep: Landmark,
  "adverse-media": Newspaper,
  "wallet-risk": Wallet,
  "transaction-monitoring": Waypoints,
};

export const OBJECT_ICON: Record<string, LucideIcon> = {
  Order: Workflow,
  Investor: UserRound,
  Approval: ShieldCheck,
  TokenClass: Coins,
  PolicyPack: ScrollText,
  ScreeningAlert: Siren,
  Asset: Layers,
  Tenant: Building2,
  Distribution: CalendarClock,
  ReconciliationBreak: ArrowLeftRight,
};
