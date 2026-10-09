# SRH Tokenization OS, version 2: scope

Version 2 is a separate copy of version 1. Version 1 stays unchanged in its own folder and repository. Everything that worked in version 1 is kept; this file lists what version 2 adds or changes, after merging the team's notes and removing repeats.

The working rule for every change: the capability exists and can be shown when needed, but the interface does not announce it.

## 1. Onboarding and identity

| Note | What version 2 does |
| --- | --- |
| Company onboarding journey, improve KYB, company documents, company accounts | One streamlined company journey: company details by jurisdiction, registry lookup, country-specific document checklist, directors and beneficial owners, authorised signatories, settlement bank accounts and wallets, review. |
| KYC varies by country; do not always ask for an Emirates ID | Identity documents, address proof and company documents are driven by country. Examples: Emirates ID or UAE Pass in the UAE, CNIC in Pakistan, NRIC or Singpass in Singapore, National ID or Nafath in Saudi Arabia, passport everywhere. Company documents follow the registry of the country (trade licence, Companies House, ACRA, CR, SECP and others). |
| Register users even with gaps; let them explore and transact; staff see what is missing and can override | Accounts open as soon as the basics are in. The investor can browse, save and subscribe; orders from incomplete accounts go to compliance review. The back office shows each outstanding item with request, approve manually or waive actions. |
| We should be able to approve (companies) | KYB approval and rejection for company accounts, with reasons. |

## 2. Manual override and internal rules

| Note | What version 2 does |
| --- | --- |
| Override and manual approval with relevant authorisation | Verification items (identity, liveness, address, bank statement match, source of funds, screening, wallet risk, registry, beneficial owners) can be approved manually or waived by authorised roles. High-risk overrides need a second approver. Every override is audited. |
| Manual override across project listing stages | Authorised staff can move a project between listing stages with a recorded reason. |
| Manual oracle flows and manual providers where automation is not available | Each asset chooses an automated feed or a manual valuation desk; manual NAV entries follow maker-checker. Integrations include manual desks per category and region, so a missing provider never blocks a flow. |
| Verification of token issuance, manual, is a must for RWA | Each token class carries an issuance verification checklist (legal documents, SPV, title or custody confirmation, valuation, contract configuration). Minting waits until it is verified. |
| Internal rules setting | One place for thresholds: mint approval limit, override authority, dual-approval triggers, risk profile bands, card payment limits, auto-approval tolerance. The engine reads these values. |

## 3. Roles

Roles are defined more precisely in the console and in a separate discussion document, `docs/ROLES-AND-ACCESS.md`.

## 4. Assets, structuring and tokens

| Note | What version 2 does |
| --- | --- |
| Asset types with different journeys (real estate, SPV shares, private equity, commodities and others) | Templates for real estate, SPV shares, private equity, private credit, bonds and notes, sukuk, commodities, treasury funds, receivables and infrastructure. Each type has its own fields and steps. |
| Regulations and jurisdictions selection | Jurisdiction and regime selection: ADGM (FSRA), DIFC (DFSA), VARA, Luxembourg (CSSF), Singapore (MAS), EU (MiCA and the DLT Pilot Regime), Switzerland (FINMA), Saudi Arabia (CMA), Bahrain (CBB), Pakistan (SECP and PVARA), United Kingdom (FCA), United States (Reg D and Reg S), and offshore (BVI, Cayman, Jersey). |
| Debt option with coupon, including 0% | Coupon rates from 0% upward. Regular coupons produce a payment schedule. A zero coupon is issued at a discount to face value from the yield to maturity. |
| Risk profiling | Very Low, Low, Medium and High (Opportunistic), assigned from the target return using bands set in internal rules. |
| Present offerings as digital assets | Offerings show their token, standard and network as part of the product identity. |
| Token economics tab | Supply, price, allocation, lock-ups, fees and distribution policy per asset. |
| Multiple token types with a distribution waterfall | Several token classes per asset (for example senior income and ordinary units) with a defined payment waterfall. |
| Project documents and token holder visibility | Documents are uploaded per project and marked public, token holders only, or internal. |
| Corporate actions (voting, yield and others) | Distributions, coupons, votes, redemptions, tender offers, NAV notices and splits. |
| NAV and charts | Price and NAV histories move in cycles with a generally upward trend. Gold and Treasury bills follow actual market history. |

## 5. Real-world credibility

- Whitworth Park, the University of Manchester's halls at 316 Oxford Road, as a real-estate project with its published room count and rents.
- Other assets use real market data: LBMA gold, US Treasury bill yields, Al Dhafra Solar PV, Riyadh Grade A offices, Dubai residential.
- Real, licensed and commonly used providers: Sumsub, Onfido, Jumio, UAE Pass, Singpass, ComplyAdvantage, LSEG World-Check, Chainalysis, Elliptic, TRM Labs, Fireblocks, Copper, BitGo, Komainu, Chainlink, Stripe, Checkout.com, Adyen, Circle and others.
- Real photographs and video where available.

Note on Fireblocks: Fireblocks provides custody, MPC wallets and tokenisation infrastructure. Identity checks are handled by KYC providers such as Sumsub, Onfido or Jumio.

## 6. Payments

Card checkout (Visa, Mastercard, American Express, Apple Pay, Google Pay) through Stripe, Checkout.com, Adyen or Network International, with limits and 3-D Secure.

## 7. Investor experience

- A customisable home screen with widgets the investor can show, hide and reorder.
- A separate portfolio tab.
- Recommendations based on the investor's stated interests and risk appetite.
