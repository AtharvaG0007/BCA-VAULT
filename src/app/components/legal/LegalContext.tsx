import { createContext, useContext, useState, ReactNode } from "react";
import {
  checkLocalAcceptance,
  setLocalAcceptance,
  saveLegalAcceptance,
} from "../../../lib/supabase/legalService";
import { useAuth } from "@/app/components/auth/AuthContext";

interface LegalContextValue {
  hasAccepted: boolean;
  accept: () => Promise<void>;
}

const LegalContext = createContext<LegalContextValue | null>(null);

export function LegalProvider({ children }: { children: ReactNode }) {
  const [hasAccepted, setHasAccepted] = useState<boolean>(() =>
    checkLocalAcceptance()
  );
  const { appUser } = useAuth();

  async function accept() {
    setLocalAcceptance();
    setHasAccepted(true);
    if (appUser?.uid) {
      await saveLegalAcceptance(appUser.uid);
    }
  }

  return (
    <LegalContext.Provider value={{ hasAccepted, accept }}>
      {children}
    </LegalContext.Provider>
  );
}

export function useLegal() {
  const ctx = useContext(LegalContext);
  if (!ctx) throw new Error("useLegal must be used inside LegalProvider");
  return ctx;
}
