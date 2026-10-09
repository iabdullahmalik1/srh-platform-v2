# Frontend conventions

Read this before adding a page. Reference implementations: `src/app/(console)/overview/page.tsx`, `src/app/(console)/orders/page.tsx`, `src/app/(console)/orders/[id]/page.tsx`, `src/app/(console)/orders/new/page.tsx`.

## Architecture

- Next.js 16 App Router, React 19, TypeScript strict. Console pages live in `src/app/(console)/<module>/page.tsx` and are client components (`"use client"` at top). The shell (sidebar, top bar, module and role gating) is applied by `(console)/layout.tsx`; pages render only their content.
- Dynamic routes: read params with `useParams<{ id: string }>()` from `next/navigation`. Pages that read `useSearchParams()` must wrap their content in `<React.Suspense>` (see `orders/page.tsx`).
- **Data access only through hooks in `src/hooks/api.ts`** (React Query over `src/services/api.ts`). Never import `services/mock/*` from UI code. If a hook you need is missing, add it to `hooks/api.ts` following the existing pattern (mutation hooks use `useApiMutation` which toasts errors and invalidates keys).
- Domain types: `src/types/domain.ts`. Labels and metadata: `src/lib/constants.ts`. Formatting: `fmt` in `src/lib/utils.ts` (never `toLocaleString` ad hoc).
- Global state: Zustand stores in `src/stores` (`session`, `events`, `workflows`). Multi-step wizards keep their draft in `useWorkflows` so drafts survive navigation.
- Permissions: `useCan("permission")` from `src/hooks/session.ts`; hide or disable actions the persona cannot perform, and say why in a tooltip or note. The mock adapter also enforces permissions (403), like the backend will.
- Current tenant: `useCurrentTenant()`; current persona: `usePersona()`.

## UI kit (import paths)

- `@/components/ui/button`: `Button` (variants primary, secondary, tonal, ghost, danger, success, link; sizes sm, md, lg, icon, icon-sm; `isLoading`, `loadingText`, `asChild` for links).
- `@/components/ui/primitives`: `Card`, `CardHeader` (title, description, action, icon), `CardBody`, `Badge` (tones), `Input`, `Textarea`, `NativeSelect`, `Field` (label, hint, error, required), `Switch`, `Checkbox`, `Skeleton`, `Spinner`, `Progress`, `Separator`, `EmptyState`, `ErrorState`, `Tip` (tooltip), `Avatar`, `CopyText` (hashes, addresses, ids), `Kbd`, `PageHeader` (title, description, actions, eyebrow), `Stat`, `KeyValue`, `Segmented`.
- `@/components/ui/overlays`: `Dialog`, `DialogTrigger`, `DialogClose`, `DialogContent` (title, description, footer, size), `SheetContent` (side panel; use inside `Dialog`), `Menu*` dropdown, `Popover*`, `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`.
- `@/components/ui/data-table`: `DataTable` with `Column<T>[]` (sort, align, hideBelow), loading skeleton rows, error state, empty state, pagination, row click with keyboard support.
- `@/components/ui/stepper`: `Stepper` for wizards.
- Domain: `@/components/domain/status` (`StatusBadge`, `DecisionBadge`, `RiskBadge`, `StageBadge`, `ChainBadge`, `ChainGlyph`, `RailBadge`, `ClassificationBadge`, `Money`, `Flag`, `LiveDot`), `lifecycle-rail`, `decision-views` (`EligibilityResultView`, `CapabilityResultView`, `ApprovalSteps`), `canonical-chain`, `asset-art` (generated cover art per asset, prop `visual`), `charts` (`TrendArea`, `GroupedBars`, `Sparkline`, `BarList`, `SERIES`).

## Brand, media and logos (v2)

- **Every public file path goes through `asset()`** from `@/lib/assets` (the site may be served under a sub-path on GitHub Pages). Never hard-code `src="/..."`.
- People: `PersonAvatar`, `PersonName` (photo + name + sub line), `PartyName` (investor: photo for individuals, logo for entities) from `@/components/domain/logos`. Photos resolve automatically by name for all personas and individual investors (`avatarFor`).
- Companies: `CompanyLogo`, `CompanyName` (bespoke logos for SRH, Talara, Meridian, Northgate; deterministic generated marks for every other company name). Use them wherever a company appears: tenants, issuers, sponsors, custodians, providers, banks, dealers, entity investors.
- Networks and money: `NetworkLogo` (official Ethereum, Solana, Polygon, Base, Avalanche marks), `TokenLogo` (USDC, USDT), `RailLogo` (all payment rails). `ChainBadge` and `RailBadge` already include them.
- Assets: `AssetCover` (real photography with gallery index, falls back to generated art), `AssetThumb` for tables, from `@/components/domain/media`. Asset photos live in `asset.media.cover` and `asset.media.gallery`.
- Editorial cards: `FeatureCard` (Circle-style tall photo card with logo, headline and CTA). Use in rows of three on investor-facing pages and walkthroughs only where it helps; never as filler. Feature images: `/media/features/{marina-skyline,investor-tablet,gold,boardroom,tower-abstract,riyadh-night,vault,trading-desk}.webp`.
- Brand: `SrhMark` (vector tiger, `animate` draws it in), `SrhLockup` (mark + wordmark, `tone` light/dark), `SrhSplash` from `@/components/brand/srh-logo`.
- Backdrop: the console already renders one living gradient backdrop (`.app-backdrop`). Do not add other page backgrounds. Navy brand panels may use `.app-aurora`. `.glass` gives a translucent surface.
- Motion: `motion/react` is installed (`import { motion, AnimatePresence } from "motion/react"`). Use it for meaningful transitions (state changes, flows), 150 to 400ms, ease `[0.2, 0, 0, 1]`, and respect reduced motion (`useReducedMotion`).

## Visual over text (client requirement, v2)

- Cut copy hard. Page descriptions: one short line (12 words or fewer) or none. No explanatory paragraphs inside cards.
- Explain with visuals: icon + label rows, small flow diagrams (nodes and arrows), stat tiles, progress, logos, photos. Put any extra detail in a `Tip` tooltip or a collapsible.
- Each card has at most one sentence of supporting text.
- Prefer a diagram to a list whenever the content is a process or a relationship.

## Every page must

1. Start with `<PageHeader title description actions />`. Detail pages add a back link above it (see `orders/[id]`).
2. Handle three states for every query: loading (skeletons shaped like the content, never a blank page), error (`ErrorState` with retry), empty (`EmptyState` with a title, one line and an action).
3. Use real interactions: every button does something through a mutation hook or navigation. Destructive actions confirm in a `Dialog`. Mutations show `isLoading` on the triggering button. Forms validate inline (`Field error`), focus stays sensible, labels are visible.
4. Be responsive from 360px: grids collapse to one column, tables scroll inside their card (`DataTable` handles this), no horizontal page scroll. Use `hideBelow` on secondary table columns.
5. Use only design tokens through Tailwind classes: `bg-surface`, `bg-surface-2`, `bg-surface-3`, `text-foreground`, `text-muted`, `text-subtle`, `border-border`, `border-border-strong`, `bg-brand`, `text-brand-ink`, `bg-brand-soft`, `text-success|warning|danger|info`, `bg-*-soft`, `shadow-1|2|3`, `bg-navy-*`. No raw hex colours, no arbitrary greys. Figures use `tabular`. Radius: `rounded-lg` controls, `rounded-xl` cards. Icons from `lucide-react` at `size-4` inline with text.
6. Charts: use `components/domain/charts.tsx`. One axis only. Two or more series need a legend. Colours from `SERIES` in fixed order.

## Copy rules (client requirement)

- No em dashes or en dashes anywhere (use commas, colons, "to", or full stops). Use "…" for loading labels.
- No AI or marketing words: seamless, robust, leverage, comprehensive, end-to-end, cutting-edge, unlock, empower, elevate, streamline, game-changing.
- Complete, plain sentences. Buttons start with a verb and say what happens ("Approve and execute", "Run reconciliation"). An action keeps its name through the flow (button "Publish", toast "Published").
- Errors say what happened and how to fix it. No "Oops", no apologies.
- Sentence case for headings and buttons. No ALL CAPS labels. No eyebrow label above every heading. Do not number things unless they are a real sequence.
- Domain vocabulary from the brief: tokenised (UK spelling in copy), eligibility, policy pack, jurisdiction, canonical token class, deployment, DvP, transfer agent, custodian, beneficial owner, reconciliation break, authorised signer.
