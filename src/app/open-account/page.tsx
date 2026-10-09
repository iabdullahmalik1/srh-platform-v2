"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, BadgeCheck, Building2, CircleAlert, ClipboardCheck, Contact, FileStack, IdCard, Landmark, LockKeyhole, RotateCcw, ScanFace, Send, ShieldCheck, UserRound, UserRoundCheck, Users, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCreateInvestor } from "@/hooks/api";
import { useSession } from "@/stores/session";
import { avatarFor, asset } from "@/lib/assets";
import { errorMessage } from "@/services/errors";
import { ThemedLockup, StepHeading, useStepMotion } from "@/components/entry/parts";
import { ProgressBarCompact, ProgressRail, type RailStep } from "@/components/entry/progress-rail";
import { AccountTypeStep, DetailsStep, DocumentStep, ProfileStep, ReviewStep } from "@/components/entry/open-account-steps";
import { LivenessCheck } from "@/components/entry/liveness";
import { WalletSetup } from "@/components/entry/wallet-setup";
import { ReviewStatus, VerificationTracker, type CheckProvider } from "@/components/entry/verification";
import { kybFor } from "@/lib/kyc-countries";
import { asOnboardingService } from "@/components/entry/self-service";
import { EMPTY_DRAFT, OUTSTANDING_LABEL, classify, outstandingKeys, sampleApplicant, toInvestorInput, validateCompany, validateDetails, walletError, type OnboardingDraft } from "@/components/entry/onboarding-model";
import { BankStep, CompanyDocsStep, CompanyStep, PeopleStep } from "@/components/entry/company-steps";

type StepKey = "type" | "company" | "docs" | "people" | "details" | "document" | "liveness" | "profile" | "bank" | "wallet" | "review" | "verify";
type Step = RailStep & { key: StepKey; title: string; sub: string; skippable?: boolean };

const S: Record<StepKey, Step> = {
  type: { key: "type", label: "Account type", icon: UserRound, title: "Open an investor account", sub: "Choose the type of account you need." },
  company: { key: "company", label: "Company", icon: Building2, title: "Company details", sub: "Requirements follow the registry where the company is incorporated." },
  docs: { key: "docs", label: "Company documents", icon: FileStack, title: "Company documents", sub: "Upload now, or add any of them later from your account.", skippable: true },
  people: { key: "people", label: "Owners and directors", icon: Users, title: "Owners, directors and signatories", sub: "Who owns, runs and signs for the company.", skippable: true },
  details: { key: "details", label: "Your details", icon: Contact, title: "Your details", sub: "Exactly as shown on your identity document." },
  document: { key: "document", label: "Identity", icon: IdCard, title: "Verify your identity", sub: "Use a digital ID or scan a government-issued photo ID.", skippable: true },
  liveness: { key: "liveness", label: "Liveness", icon: ScanFace, title: "Liveness check", sub: "Confirms a real person is present.", skippable: true },
  profile: { key: "profile", label: "Investor profile", icon: BadgeCheck, title: "Investor profile", sub: "Three questions set your classification. Your interests shape what we show you." },
  bank: { key: "bank", label: "Bank account", icon: Landmark, title: "Settlement bank account", sub: "Where distributions and redemptions are paid.", skippable: true },
  wallet: { key: "wallet", label: "Wallet", icon: Wallet, title: "Your wallet", sub: "Where your tokenised assets will be held.", skippable: true },
  review: { key: "review", label: "Review", icon: ClipboardCheck, title: "Review and submit", sub: "Check your application before you submit." },
  verify: { key: "verify", label: "Verification", icon: ShieldCheck, title: "Verification in progress", sub: "Our providers are checking your application." },
};
const PERSON: StepKey[] = ["type", "details", "document", "liveness", "profile", "wallet", "review", "verify"];
const COMPANY: StepKey[] = ["type", "company", "docs", "people", "details", "document", "liveness", "profile", "bank", "wallet", "review", "verify"];
const DEFAULT_PHOTO = "/media/people/mei-lin-tan.webp";

/** The providers that run for this applicant: national digital ID where used, the company registry for companies. */
function checkProviders(d: OnboardingDraft): CheckProvider[] {
  const id: CheckProvider = d.digitalId && d.idLabel
    ? { name: d.idLabel, role: "Digital identity", checks: ["Government record match", "Face match in app"] }
    : { name: "Sumsub", role: "Identity", checks: d.doc ? ["Document authenticity", "Face match", "Liveness"] : ["Identity on hold until uploaded"] };
  const list: CheckProvider[] = [id, { name: "ComplyAdvantage", role: "Screening", checks: ["Sanctions lists", "PEP screening", "Adverse media"] }];
  if (d.accountType === "entity") {
    const reg = kybFor(d.kybJurisdiction);
    list.unshift({ name: reg.lookup ?? "Sumsub KYB", role: "Company registry", checks: [d.registryChecked ? "Registry record matched" : "Registry check queued", "Ownership structure"] });
  }
  if (d.walletAddress) list.push({ name: "Chainalysis", role: "Wallet risk", checks: ["Address exposure", "Risk score 9 of 100"] });
  return list;
}

export default function OpenAccountPage() {
  const router = useRouter();
  const motionProps = useStepMotion();
  const signIn = useSession((s) => s.signIn);
  const create = useCreateInvestor();

  const [draft, setDraft] = React.useState<OnboardingDraft>(EMPTY_DRAFT);
  const [step, setStep] = React.useState(0);
  const [maxVisited, setMaxVisited] = React.useState(0);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [stepError, setStepError] = React.useState<string>();
  const [submitError, setSubmitError] = React.useState<string>();
  const [submitting, setSubmitting] = React.useState(false);
  const [investorId, setInvestorId] = React.useState<string>();
  const [checksDone, setChecksDone] = React.useState(false);

  const STEPS = (draft.accountType === "entity" ? COMPANY : PERSON).map((k) => S[k]);
  const FINAL = STEPS.length - 1;
  const key = STEPS[step]?.key ?? "type";
  const goKey = (k: string) => go(Math.max(0, STEPS.findIndex((x) => x.key === k)));
  const classification = classify(draft);
  const photo = avatarFor(draft.name) ?? asset(DEFAULT_PHOTO);
  const locked = step === FINAL;
  const headingRef = React.useRef<HTMLDivElement>(null);

  const patch = React.useCallback((p: Partial<OnboardingDraft>) => {
    setDraft((d) => ({ ...d, ...p }));
    setStepError(undefined);
    setErrors((e) => {
      const keys = Object.keys(p).filter((k) => e[k]);
      if (!keys.length) return e;
      const next = { ...e };
      keys.forEach((k) => delete next[k]);
      return next;
    });
  }, []);

  function go(i: number) {
    setStep(i);
    setMaxVisited((m) => Math.max(m, i));
    setStepError(undefined);
    setSubmitError(undefined);
    requestAnimationFrame(() => {
      headingRef.current?.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  async function submit() {
    if (!classification) return;
    setSubmitting(true);
    setSubmitError(undefined);
    try {
      const inv = await asOnboardingService(() => create.mutateAsync(toInvestorInput(draft, classification)));
      setInvestorId(inv.id);
      go(FINAL);
    } catch (e) {
      setSubmitError(errorMessage(e));
    } finally {
      setSubmitting(false);
    }
  }

  function next() {
    switch (key) {
      case "company": {
        const errs = validateCompany(draft);
        setErrors(errs);
        const first = Object.keys(errs)[0];
        if (first) {
          document.getElementById(`oa-${first}`)?.focus();
          return;
        }
        break;
      }
      case "details": {
        const errs = validateDetails(draft);
        setErrors(errs);
        const first = Object.keys(errs)[0];
        if (first) {
          document.getElementById(`oa-${first}`)?.focus();
          return;
        }
        if (draft.doc && draft.doc.fullName !== draft.name.trim()) patch({ doc: undefined, liveness: false });
        break;
      }
      case "document":
        if (!draft.idKey) return setStepError("Choose how to verify, or skip for now.");
        if (!draft.doc) return setStepError(draft.digitalId ? "Approve the request in the app to continue, or skip for now." : "Scan your document to continue, or skip for now.");
        break;
      case "liveness":
        if (!draft.liveness) return setStepError("Complete the liveness check, or skip for now.");
        break;
      case "profile":
        if (!classification) return setStepError("Answer the three questions to continue.");
        break;
      case "wallet": {
        if (!draft.walletMode) return setStepError("Choose how you want to hold your assets, or skip for now.");
        if (draft.walletMode === "mpc" && !draft.walletAddress) return setStepError("Create your MPC wallet to continue.");
        if (draft.walletMode === "existing") {
          const err = walletError(draft.chain, draft.walletAddress);
          if (err) {
            setStepError(err);
            document.getElementById("wallet-address")?.focus();
            return;
          }
        }
        break;
      }
      case "review": {
        const c = draft.consents;
        if (!c.accuracy || !c.terms || !c.screening) return setSubmitError("Confirm all three declarations to submit.");
        void submit();
        return;
      }
    }
    go(step + 1);
  }

  /** Leave this step for later. The account still opens; the item shows as outstanding. */
  function skip() {
    const k = ({ document: "identity-document", liveness: "liveness", bank: "bank-account", docs: "company-documents", people: "beneficial-owners" } as const)[key as "document"];
    if (k && !draft.skipped.includes(k)) patch({ skipped: [...draft.skipped, k] });
    if (key === "wallet") patch({ walletMode: undefined, walletAddress: "" });
    go(step + 1);
  }

  function restart() {
    setDraft(EMPTY_DRAFT);
    setErrors({});
    setInvestorId(undefined);
    setChecksDone(false);
    setMaxVisited(0);
    go(0);
  }

  function openAs(personaId: string, href: string) {
    signIn(personaId, "tnt_srh");
    router.push(href);
  }

  const current = STEPS[step];
  const outstanding = outstandingKeys(draft);
  const title = locked && checksDone ? "Application submitted" : current.title;
  const sub = locked && checksDone ? (outstanding.length ? "Application received. You can add the outstanding items from your account at any time." : "Identity checks passed. A compliance officer will review your application.") : current.sub;

  return (
    <div className="relative min-h-dvh">
      <div aria-hidden className="app-backdrop" />

      <header className="glass sticky top-0 z-30 border-b border-border">
        <div className="mx-auto flex h-16 max-w-[1180px] items-center justify-between gap-3 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-3 rounded-lg" aria-label="SRH home">
            <ThemedLockup height={30} animate />
            <span aria-hidden className="hidden h-6 w-px bg-border-strong sm:block" />
            <span className="hidden text-[13.5px] font-medium text-muted sm:block">Investor account</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-[12px] font-medium text-muted sm:inline-flex">
              <LockKeyhole className="size-3.5 text-success" aria-hidden /> Secure application
            </span>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/">Sign in</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto grid max-w-[1180px] gap-8 px-4 py-6 sm:px-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-12 lg:py-12">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <ProgressRail steps={STEPS} current={step} maxVisited={maxVisited} locked={locked} complete={locked && checksDone} onSelect={go} />
          <ProgressBarCompact steps={STEPS} current={step} complete={locked && checksDone} />
        </div>

        <section className="min-w-0 max-w-[760px]">
          <div className="rounded-2xl border border-border bg-surface p-5 shadow-2 sm:p-8">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={step} {...motionProps}>
                <div ref={headingRef} tabIndex={-1} className="outline-none">
                  <StepHeading icon={locked && checksDone ? UserRoundCheck : current.icon} title={title} sub={sub} />
                </div>

                <div className="mt-7">
                  {key === "type" && <AccountTypeStep value={draft.accountType} onChange={(t) => patch({ accountType: t })} journey={STEPS.slice(0, FINAL)} />}
                  {key === "company" && <CompanyStep draft={draft} errors={errors} onChange={patch} />}
                  {key === "docs" && <CompanyDocsStep draft={draft} onChange={patch} />}
                  {key === "people" && <PeopleStep draft={draft} onChange={patch} />}
                  {key === "bank" && <BankStep draft={draft} onChange={patch} />}
                  {key === "details" && <DetailsStep draft={draft} errors={errors} onChange={patch} onSample={() => patch(sampleApplicant(draft.accountType))} />}
                  {key === "document" && <DocumentStep draft={draft} photo={photo} error={stepError} onChange={patch} />}
                  {key === "liveness" && (
                    <>
                      <LivenessCheck photo={photo} confirmed={draft.liveness} onComplete={() => patch({ liveness: true })} onReset={() => patch({ liveness: false })} />
                      {stepError && <p role="alert" className="mt-3 text-[12.5px] text-danger">{stepError}</p>}
                    </>
                  )}
                  {key === "profile" && <ProfileStep draft={draft} classification={classification} error={stepError} onChange={patch} />}
                  {key === "wallet" && (
                    <WalletSetup
                      mode={draft.walletMode}
                      chain={draft.chain}
                      address={draft.walletAddress}
                      error={draft.walletMode === "existing" ? stepError : undefined}
                      onMode={(m) => patch({ walletMode: m, walletAddress: "" })}
                      onChain={(c) => patch({ chain: c })}
                      onAddress={(a) => patch({ walletAddress: a })}
                    />
                  )}
                  {key === "wallet" && stepError && draft.walletMode !== "existing" && <p role="alert" className="mt-3 text-[12.5px] text-danger">{stepError}</p>}
                  {key === "review" && <ReviewStep draft={draft} classification={classification} onEdit={goKey} onConsent={(k, v) => patch({ consents: { ...draft.consents, [k]: v } })} />}
                  {step === FINAL && (
                    <div className="space-y-5">
                      <VerificationTracker complete={checksDone} onDone={() => setChecksDone(true)} providers={checkProviders(draft)} />
                      {checksDone && investorId && <ReviewStatus reference={investorId} name={toInvestorInput(draft, classification ?? "retail").name} outstanding={outstanding.map((k) => OUTSTANDING_LABEL[k] ?? k)} />}
                    </div>
                  )}
                </div>

                {key === "review" && submitError && (
                  <div role="alert" className="mt-5 flex flex-wrap items-center gap-3 rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-[13px] text-danger">
                    <CircleAlert className="size-4 shrink-0" aria-hidden />
                    <span className="min-w-0 flex-1">{submitError}</span>
                    {/already exists/i.test(submitError) ? (
                      <Button variant="secondary" size="sm" onClick={() => goKey("details")}>
                        Edit email
                      </Button>
                    ) : (
                      draft.consents.accuracy && draft.consents.terms && draft.consents.screening && (
                        <Button variant="secondary" size="sm" onClick={() => void submit()} isLoading={submitting} loadingText="Retrying…">
                          <RotateCcw /> Retry
                        </Button>
                      )
                    )}
                  </div>
                )}

                {step < FINAL ? (
                  <div className="mt-8 flex items-center justify-between gap-3 border-t border-border pt-5">
                    {step > 0 ? (
                      <Button variant="ghost" onClick={() => go(step - 1)} disabled={submitting}>
                        <ArrowLeft /> Back
                      </Button>
                    ) : (
                      <span />
                    )}
                    <span className="flex items-center gap-2 max-sm:flex-1">
                    {current.skippable && (
                      <Button variant="ghost" onClick={skip} disabled={submitting}>
                        Skip for now
                      </Button>
                    )}
                    <Button variant="primary" size="lg" onClick={next} isLoading={submitting} loadingText="Submitting…" className="min-w-[180px] max-sm:flex-1">
                      {key === "review" ? (
                        <>
                          <Send /> Submit application
                        </>
                      ) : (
                        <>
                          Continue <ArrowRight />
                        </>
                      )}
                    </Button>
                    </span>
                  </div>
                ) : (
                  checksDone && (
                    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.15 }} className="mt-8 flex flex-col gap-2.5 border-t border-border pt-5 sm:flex-row sm:items-center">
                      <Button variant="primary" size="lg" onClick={() => openAs("usr_inv", "/home")}>
                        Open the investor portal demo <ArrowRight />
                      </Button>
                      {investorId && (
                        <Button variant="secondary" size="lg" onClick={() => openAs("usr_cco", `/identity/investors/${investorId}`)}>
                          <UserRoundCheck /> Review as compliance officer
                        </Button>
                      )}
                      <Button variant="ghost" onClick={restart} className="sm:ml-auto">
                        <RotateCcw /> Start again
                      </Button>
                    </motion.div>
                  )
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </section>
      </main>
    </div>
  );
}
