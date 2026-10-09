# Roles and access: discussion paper

Status: draft for the team to review. Version 2 of the platform implements what is written here, so any change agreed in discussion is a small code change in `src/lib/constants.ts` (permissions) and the Internal rules page (authorities that can change at run time).

## 1. Principles

1. **Least privilege.** Each role gets only what its daily work needs.
2. **Maker and checker.** Anything that moves money, mints or burns tokens, changes a valuation, overrides a check or changes a listing stage needs a second person. The person who raises a request can never approve it.
3. **Tenant isolation.** Staff of one customer never see another customer's records. Records outside the tenant are reported as "not found".
4. **Investor self-scope.** An investor sees only their own account, orders, holdings and the documents they are entitled to.
5. **Everything is recorded.** Every decision, override and configuration change is written to the hash-chained audit trail with the person, the reason, the before and after values.
6. **Authority lives in two places.** Fixed permissions per role (code), and run-time authorities set on the Internal rules page (who may override, thresholds, dual approval).

## 2. Roles

| Role | Who holds it | Main purpose |
| --- | --- | --- |
| Platform admin | SRH technology team, or the customer's platform owner | Tenants, modules, integrations, API keys, internal rules |
| Operations | Operations desk of the operator | Onboarding, orders, settlement, valuations, servicing, reconciliation |
| Compliance officer | MLRO and compliance team | KYC and KYB decisions, screening, policy packs, overrides, issuance verification |
| Issuer admin | The issuer or sponsor of a product | Structuring its own products, documents, valuations and distributions |
| Investor | Individual or company account (a company can have several authorised signatories) | Subscribe, hold, trade, vote, manage preferences |
| Auditor | External or internal auditor | Read-only access to records, documents and the audit trail |
| Authorised signer | Not a login role; a quorum of key holders (HSM or MPC) | Signs on-chain operations after approvals are complete |

## 3. Permission matrix

| Capability | Platform admin | Operations | Compliance | Issuer admin | Investor | Auditor |
| --- | :-: | :-: | :-: | :-: | :-: | :-: |
| Onboard or edit investors | ✓ | ✓ | ✓ | | | |
| Approve or reject KYC and KYB | | | ✓ | | | |
| Approve manually or waive a verification item | | | ✓ (1) | | | |
| Resolve screening alerts, edit policy packs | | | ✓ | | | |
| Structure products, submit for launch | ✓ | ✓ | | ✓ (own) | | |
| Move a product between listing stages | ✓ (2) | ✓ (2) | ✓ (2) | | | |
| Enter a manual valuation | | ✓ (2) | | ✓ (own, 2) | | |
| Upload documents, set who can see them | ✓ | ✓ | | ✓ (own) | | |
| Verify token issuance checks | | ✓ | ✓ | | | |
| Request mint, burn, pause, freeze | ✓ | ✓ | | | | |
| Decide approvals | ✓ | ✓ | ✓ | ✓ | | |
| Operate orders and payments | ✓ | ✓ | | | | |
| Distributions and corporate actions | | ✓ | | ✓ (own) | | |
| Reconciliation | ✓ | ✓ | | | | |
| Internal rules | ✓ | read | ✓ | | | read |
| Integrations and API keys | ✓ | read and test | | | | read |
| Subscribe and trade | | on behalf | | | ✓ (self) | |
| Vote | ✓ | ✓ | ✓ | ✓ | ✓ | |
| Read audit trail | ✓ | ✓ | ✓ | ✓ | | ✓ |

(1) High-risk items (sanctions, PEP, wallet risk, source of funds, identity document, beneficial owners) need a second approver when "dual approval for high-risk overrides" is on.
(2) Only roles listed for that area on the Internal rules page. Default: listing stages by platform admin, compliance and operations; valuations by operations and issuer admin.

## 4. Approval chains

| Action | Steps | Notes |
| --- | --- | --- |
| Mint below the threshold | Automatic after settlement | Threshold set in Internal rules (default USD 250,000) |
| Mint at or above the threshold | Operations, Compliance, Authorised signer (HSM 3 of 5) | |
| Mint before issuance is verified | Blocked | Every issuance check must be verified or waived |
| Burn, pause | Operations, Compliance, Authorised signer | |
| Freeze, forced transfer, recovery | Operations, Compliance, Legal sign-off, Authorised signer | |
| Distribution | Issuer or Operations, then Operations or Compliance | |
| Manual valuation | Maker (Operations or Issuer), Compliance checker | Platform admin added when the change exceeds the tolerance (default 5%) |
| Listing stage override | Requester, Compliance (or Platform admin if Compliance requested) | |
| Verification override, high risk | Compliance, then Operations | |
| Policy change | Compliance proposer, Platform admin | |
| Asset launch | Compliance, Platform admin confirms regulatory permission | |

## 5. Company accounts

A company investor is one account with several people:

- **Authorised signatories** can subscribe, redeem and vote for the company.
- **Directors and beneficial owners** are verified but do not need logins.
- A second signatory approval for company orders above a limit is a candidate for the next version (see questions).

## 6. Questions for discussion

1. Should Operations keep the right to move listing stages, or should that sit with Compliance and Platform admin only?
2. Should the issuer admin be able to enter valuations for its own products, given the conflict of interest? Today a compliance checker always approves.
3. Do we want a separate **MLRO** role distinct from Compliance officer (for example, only the MLRO confirms sanctions matches and files reports)?
4. Do we need a **Relationship manager** role that can see its own clients but cannot approve anything?
5. Should company accounts require two signatories for orders above a set amount?
6. What should the auditor see of investor personal data: full records or masked identifiers?
7. Which approvals must be signed with a hardware key rather than a password and one-time code?
8. Should a customer on the white-label model (for example Talara) be able to change its own internal rules, or only SRH?
