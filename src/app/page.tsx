"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Building, KeyRound, UserPlus, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession } from "@/stores/session";
import { PERSONAS, TENANTS_SEED } from "@/hooks/session";
import { BrandPanel, DemoInfo, EnvironmentStep, MobileBrandHeader, RoleStep, SecureStep } from "@/components/entry/sign-in";
import { EntryStepper, useMounted, useStepMotion } from "@/components/entry/parts";

const STEPS = [
  { label: "Environment", icon: Building, title: "Choose a demo environment" },
  { label: "Role", icon: UsersRound, title: "Choose your role" },
  { label: "Sign in", icon: KeyRound, title: "Secure sign-in" },
];

export default function SignInPage() {
  const router = useRouter();
  const mounted = useMounted();
  const motionProps = useStepMotion();
  const storedTenant = useSession((s) => s.tenantId);
  const storedPersona = useSession((s) => s.personaId);
  const setTenant = useSession((s) => s.setTenant);
  const setPersona = useSession((s) => s.setPersona);
  const signIn = useSession((s) => s.signIn);

  // Last choices persist in the session store; defaults render on the server.
  const tenantId = mounted ? storedTenant : "tnt_srh";
  const personaId = mounted ? storedPersona : "usr_ops";
  const tenant = TENANTS_SEED.find((t) => t.id === tenantId) ?? TENANTS_SEED[0];
  const persona = PERSONAS.find((p) => p.id === personaId) ?? PERSONAS[0];

  const [step, setStep] = React.useState(0);
  const [emailOverride, setEmailOverride] = React.useState<{ personaId: string; email: string }>();
  const email = emailOverride?.personaId === persona.id ? emailOverride.email : persona.email;

  const destination = persona.role === "investor" ? "/home" : "/overview";
  React.useEffect(() => {
    if (step === 2) router.prefetch(destination);
  }, [step, destination, router]);

  const complete = React.useCallback(() => {
    signIn(persona.id, tenant.id);
    router.push(destination);
  }, [signIn, persona.id, tenant.id, router, destination]);

  const current = STEPS[step];

  return (
    <div className="min-h-dvh bg-surface lg:grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <BrandPanel />
      <MobileBrandHeader />

      <main className="flex min-h-[calc(100dvh-62px)] flex-col lg:min-h-dvh">
        <div className="mx-auto flex w-full max-w-[640px] flex-1 flex-col px-4 py-6 sm:px-8 lg:py-12">
          <div className="flex items-center justify-between gap-3">
            <span className="hidden items-center gap-1.5 rounded-full border border-border bg-surface-2 px-2.5 py-1 text-[11.5px] font-medium text-muted lg:inline-flex">
              <span className="size-1.5 rounded-full bg-success" aria-hidden />
              Sandbox environment
            </span>
            <span className="lg:hidden" />
            <DemoInfo />
          </div>

          <h1 className="mt-6 text-[26px] font-semibold tracking-[-0.02em] text-foreground lg:mt-10">Sign in to the console</h1>
          <EntryStepper steps={STEPS} current={step} onSelect={setStep} className="mt-5" />

          <div className="mt-7 flex-1">
            <AnimatePresence mode="wait" initial={false}>
              <motion.section key={step} {...motionProps} aria-labelledby="step-title">
                <h2 id="step-title" className="mb-4 flex items-center gap-2 text-[15px] font-semibold text-foreground">
                  <current.icon className="size-4 text-muted" aria-hidden />
                  {current.title}
                </h2>
                {step === 0 && <EnvironmentStep tenants={TENANTS_SEED} value={tenantId} onChange={setTenant} />}
                {step === 1 && <RoleStep personas={PERSONAS} value={personaId} onChange={setPersona} />}
                {step === 2 && <SecureStep tenant={tenant} persona={persona} email={email} onEmail={(v) => setEmailOverride({ personaId: persona.id, email: v })} onEdit={setStep} onSignedIn={complete} />}

                {step < 2 && (
                  <div className="mt-6 flex items-center justify-between gap-3">
                    {step > 0 ? (
                      <Button variant="ghost" onClick={() => setStep(step - 1)}>
                        Back
                      </Button>
                    ) : (
                      <span />
                    )}
                    <Button variant="primary" size="lg" onClick={() => setStep(step + 1)} className="min-w-[160px] max-sm:flex-1">
                      Continue <ArrowRight />
                    </Button>
                  </div>
                )}
              </motion.section>
            </AnimatePresence>
          </div>

          <Link
            href="/open-account"
            className="group mt-10 flex items-center gap-3 rounded-xl border border-border bg-surface p-3.5 transition-[border-color,box-shadow] duration-150 hover:border-border-strong hover:shadow-1"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand-ink">
              <UserPlus className="size-[18px]" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-semibold text-foreground">Open an investor account</span>
              <span className="block truncate text-[12.5px] text-muted">See account opening and KYC as a new investor</span>
            </span>
            <ArrowRight className="size-4 text-muted transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden />
          </Link>
        </div>
      </main>
    </div>
  );
}
