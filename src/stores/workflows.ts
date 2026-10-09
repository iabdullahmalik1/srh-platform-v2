"use client";

/**
 * Multi-step workflow state. Drafts persist so an operator can leave a wizard
 * and come back without losing input. Each workflow tracks its step and payload.
 */
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { AssetTemplate, Chain, ID, NewAssetInput, NewInvestorInput, PaymentRail } from "@/types/domain";

export interface SubscriptionDraft {
  offeringId?: ID;
  investorId?: ID;
  amount?: number;
  rail?: PaymentRail;
  chain?: Chain;
  walletId?: ID;
  acceptedTerms: boolean;
}

export type AssetDraft = Partial<Omit<NewAssetInput, "template">> & { template?: AssetTemplate };

interface WorkflowState {
  subscription: { step: number; draft: SubscriptionDraft; submittedOrderId?: ID };
  asset: { step: number; draft: AssetDraft; createdAssetId?: ID };
  onboarding: { step: number; draft: Partial<NewInvestorInput>; createdInvestorId?: ID };

  setSubscription: (patch: Partial<SubscriptionDraft>, step?: number) => void;
  completeSubscription: (orderId: ID) => void;
  resetSubscription: (preset?: Partial<SubscriptionDraft>) => void;

  setAsset: (patch: AssetDraft, step?: number) => void;
  completeAsset: (assetId: ID) => void;
  resetAsset: () => void;

  setOnboarding: (patch: Partial<NewInvestorInput>, step?: number) => void;
  completeOnboarding: (investorId: ID) => void;
  resetOnboarding: () => void;
}

const emptySub: SubscriptionDraft = { acceptedTerms: false };

export const useWorkflows = create<WorkflowState>()(
  persist(
    (set) => ({
      subscription: { step: 0, draft: emptySub },
      asset: { step: 0, draft: {} },
      onboarding: { step: 0, draft: { type: "individual", documents: [] } },

      setSubscription: (patch, step) => set((s) => ({ subscription: { ...s.subscription, draft: { ...s.subscription.draft, ...patch }, step: step ?? s.subscription.step } })),
      completeSubscription: (orderId) => set((s) => ({ subscription: { ...s.subscription, submittedOrderId: orderId } })),
      resetSubscription: (preset) => set({ subscription: { step: 0, draft: { ...emptySub, ...preset } } }),

      setAsset: (patch, step) => set((s) => ({ asset: { ...s.asset, draft: { ...s.asset.draft, ...patch }, step: step ?? s.asset.step } })),
      completeAsset: (assetId) => set((s) => ({ asset: { ...s.asset, createdAssetId: assetId } })),
      resetAsset: () => set({ asset: { step: 0, draft: {} } }),

      setOnboarding: (patch, step) => set((s) => ({ onboarding: { ...s.onboarding, draft: { ...s.onboarding.draft, ...patch }, step: step ?? s.onboarding.step } })),
      completeOnboarding: (investorId) => set((s) => ({ onboarding: { ...s.onboarding, createdInvestorId: investorId } })),
      resetOnboarding: () => set({ onboarding: { step: 0, draft: { type: "individual", documents: [] } } }),
    }),
    {
      name: "srh2.workflows",
      storage: createJSONStorage(() => {
        try {
          return window.localStorage;
        } catch {
          const m = new Map<string, string>();
          return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) };
        }
      }),
    },
  ),
);
