# SRH Tokenization OS, version 2: frontend

Institutional console for the SRH Tokenization Operating System, built from the "SRH Inc Tokenization: Specs and Requirements" brief (October 2026). It covers every domain in the brief and runs fully interactive against an in-browser simulation, so the backend can be plugged in later without changing UI code.

This is version 2, kept in its own folder and repository. Version 1 is unchanged. `docs/V2-SCOPE.md` lists what version 2 adds, and `docs/ROLES-AND-ACCESS.md` is the roles paper for team discussion.

## Run it

```bash
npm install
npm run dev          # http://localhost:3000
npm run build && npm start   # production build
npm run build:static # static site in ./out for GitHub Pages or any static host
npm run lint
npm run typecheck
```

Node 20 or later. Sign in on the first screen by choosing an environment and a role, or open an investor account from the same screen. Everything is simulated and can be reset from Settings.

## Share it online

`docs/HOSTING.md` walks through publishing the console on GitHub Pages with a shareable link (about 15 minutes the first time). The workflow in `.github/workflows/deploy.yml` rebuilds and republishes the site on every push to `main`. Vercel is covered as an alternative.

## What is in it

| Area | Routes | Brief section |
|---|---|---|
| Overview | `/overview` | Platform position, live settlement pipeline, decisions waiting, event stream |
| Identity and investors | `/identity/investors`, `/identity/investors/[id]`, `/identity/onboard`, `/identity/issuers` | Party and identity, KYC, KYB, beneficial owners, wallets |
| Compliance | `/compliance`, `/compliance/screening`, `/compliance/policies` | Eligibility engine, AML and sanctions screening, jurisdiction policy packs |
| Asset structuring | `/assets`, `/assets/[id]`, `/assets/new` | Template architecture, canonical asset model, documents, cap table |
| Primary market | `/offerings`, `/orders`, `/orders/[id]`, `/orders/new` | Offerings, subscriptions, lifecycle Order to Reconciliation |
| Tokenization | `/tokens`, `/tokens/[id]` | Token factory, multi-chain deployments, mint, burn, pause, freeze, forced transfer, recovery |
| Payments and settlement | `/payments` | Fiat and digital rails, double-entry ledger, DvP and atomic settlement |
| Ownership and registry | `/registry`, `/registry/reconciliation` | Legal vs beneficial vs on-chain ownership, five-source reconciliation |
| Servicing | `/servicing` | Distributions with approval, corporate actions and voting, NAV |
| Secondary markets | `/markets` | Order book, RFQ with live quotes, pre-trade compliance, venue permissions |
| DeFi | `/defi` | Permissioned DeFi gateway, proof of reserves |
| Custody | `/custody` | Custody abstraction, MPC and HSM vaults, signing policies |
| Control | `/approvals`, `/audit` | Multi-approval with segregation of duties, hash-chained audit trail |
| Platform | `/platform`, `/platform/integrations`, `/platform/developers`, `/settings` | Tenants, module entitlements, licences, responsibility matrix, capability engine, white-label branding, provider adapters, API explorer, API keys |
| Investor portal | `/home`, `/portfolio`, product pages, marketplace, orders, markets | Investor persona: customisable home, recommendations, risk profile, card payments |
| Internal rules | `/platform/rules` | Thresholds, override authority, risk bands, card limits, valuation tolerance |

### Things worth trying

1. **Dual business model.** Switch tenant from the top of the sidebar. SRH Markets (own regulated platform), XYZ Securities (white-label, its own licences and teal brand), Meridian Bank (headless API), Northgate (dedicated deployment). Modules a tenant has not licensed are locked; the capability engine in Tenant and licences gives different answers per tenant because licences differ.
2. **Order lifecycle.** New subscription, choose the Treasury Fund, an institutional investor and USDC. Watch it move through eligibility, payment, allocation, settlement, minting and reconciliation. Choose SWIFT and it waits for the bank webhook (or an operator confirms receipt). Orders of USD 1m or more stop for mint approval.
3. **Four-eyes control.** Open Approvals as Operations, approve the first step, then switch persona (account menu) to the Compliance officer for the next one. The same person cannot approve two steps.
4. **Failure handling.** Settings, Simulation: set failure injection to 25% and use the app. Reads show retry states; writes show a toast with a Retry action.

## Architecture

```
src/
  app/                    Next.js App Router
    page.tsx              Sign in
    (console)/            Shell layout, route error boundary, one folder per module
  services/
    api.ts                Single entry point: export const api (mock or http)
    contracts.ts          PlatformApi interface: the contract between UI and backend
    http/                 REST adapter and fetch client (auth, tenant header, idempotency keys, timeouts)
    mock/                 In-browser backend: db (seeded, persisted), rules engine, lifecycle engine, audit chain, event bus
    errors.ts, config.ts
  hooks/api.ts            React Query hooks for every capability (cache keys, invalidation, toasts)
  stores/                 Zustand: session (tenant, persona, theme, simulation), events (live feed), workflows (wizard drafts)
  types/domain.ts         Canonical domain model
  mocks/data/*.json       Seed data (generated by scripts/generate-mocks.ts, deterministic)
  components/ui           Radix based UI kit
  components/domain       Lifecycle rail, decision views, canonical chain, charts, asset art, network background
  components/shell        Sidebar, top bar, command palette (Ctrl or Cmd + K), notifications, route gating
docs/CONVENTIONS.md       Rules for adding pages
```

### Connecting the backend

1. Implement the endpoints listed in `src/services/http/adapter.ts` (paths follow the brief's API-first list: `/investors`, `/kyc`, `/eligibility/check`, `/assets`, `/offerings`, `/subscriptions`, `/payments`, `/settlements`, `/tokens`, `/transfers`, `/redemptions` and the rest). Request and response shapes are the types in `src/types/domain.ts`.
2. Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_API_MODE=http` and `NEXT_PUBLIC_API_BASE_URL`.
3. Provide platform events over Server-Sent Events at `NEXT_PUBLIC_EVENTS_URL` (JSON `PlatformEvent` frames). The UI already subscribes, refreshes affected data and raises notifications.
4. Wire real authentication with `setTokenProvider()` in `src/services/http/client.ts`, and replace the persona directory in `src/hooks/session.ts` with identity provider claims.

No page or component imports the mock directly, so nothing else changes.

### Design principles carried from the brief

- Order, payment, settlement and minting are separate states, each with an event, an owner and an audit record.
- The financial product is modelled separately from the token class and from chain deployments; deployments reconcile to one canonical supply.
- Compliance is a decision layer (global core, jurisdiction pack, product, offering, investor) consumed by subscriptions, transfers and DeFi.
- Every regulated activity has a named responsible entity, so the same platform runs under SRH's licences or a customer's.
- Every mutation is permission-checked, idempotent and written to a hash-chained audit trail.

### Regenerating seed data

```bash
npx tsx scripts/generate-mocks.ts
```

Bump `DB_VERSION` in `src/services/mock/db.ts` after changing seeds so browsers drop their saved state. Service providers, issuers and several products (for example Whitworth Park, Masdar, Securitize ACRED, Hamilton Lane) refer to real, licensed companies so the demo reads like a live pipeline. Investors, holdings, orders and figures are illustrative and do not describe any real transaction or mandate. Images and videos are credited on each product page.
