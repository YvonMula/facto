import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

/**
 * App state for the shell. Kept in memory only: Phase 3 stores state in the SQLCipher
 * database (PRD 7.2), and nothing is written unencrypted to disk.
 */
type Onboarding = {
  done: boolean;
  finish(): void;
  /**
   * Panic wipe (PRD 4.8): returns the app to first-launch state. The shell holds no keys or
   * stored data yet; Phase 3 destroys keys first, then data, before calling this.
   */
  wipe(): void;
};
const Ctx = createContext<Onboarding>({ done: false, finish: () => {}, wipe: () => {} });

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [done, setDone] = useState(false);
  const value = useMemo(() => ({ done, finish: () => setDone(true), wipe: () => setDone(false) }), [done]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useOnboarding = () => useContext(Ctx);
