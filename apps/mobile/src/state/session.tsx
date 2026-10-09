import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import i18n, { LANGUAGES, type Language } from '../i18n';
import type { RecoveryError } from '@facto/crypto';
import { getState, migrate, setState } from '../secure/app-db';
import { recoveryCodeForCase, restoreFromCode } from '../secure/case-keys';
import { backend, dbFiles, keyStore } from '../secure/native';
import { panicWipe } from '../secure/panic';
import type { LocalDb } from '../secure/types';
import { Vault } from '../secure/vault';

type Phase = { name: 'loading' } | { name: 'locked' } | { name: 'ready'; onboardingDone: boolean; pinSet: boolean } | { name: 'error' };

type Session = {
  phase: Phase;
  finishOnboarding(): Promise<void>;
  setLanguage(lang: Language): Promise<void>;
  setPin(pin: string, duressPin: string | null): Promise<void>;
  unlock(pin: string): Promise<'ok' | 'wrong'>;
  /** Panic wipe (PRD 4.8): keys, then data, then back to first launch. */
  wipe(): Promise<void>;
  /** Per-case recovery (PRD 4.7, ADR 0010). */
  restoreCase(code: string): Promise<{ ok: true; caseId: string } | { ok: false; error: RecoveryError }>;
  recoveryCode(caseId: string): Promise<string>;
};

const Ctx = createContext<Session | null>(null);
const vault = new Vault(backend, keyStore);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<Phase>({ name: 'loading' });
  const db = useRef<LocalDb | null>(null);
  const dbKey = useRef<Uint8Array | null>(null);

  const openDb = useCallback(async (key: Uint8Array, pinSet: boolean, forceOnboardingDone = false) => {
    const handle = await dbFiles.open(key);
    await migrate(handle);
    db.current = handle;
    dbKey.current = key;
    if (forceOnboardingDone) await setState(handle, 'onboarding', 'done');
    const lang = await getState(handle, 'lang');
    if (lang && (LANGUAGES as readonly string[]).includes(lang)) await i18n.changeLanguage(lang);
    const done = (await getState(handle, 'onboarding')) === 'done';
    setPhase({ name: 'ready', onboardingDone: done, pinSet });
  }, []);

  const start = useCallback(async () => {
    try {
      const state = await vault.state();
      if (state === 'fresh') return await openDb(await vault.create(), false);
      if (state === 'no-pin') {
        const key = await vault.openWithoutPin();
        if (key) return await openDb(key, false);
      }
      setPhase({ name: 'locked' });
    } catch {
      setPhase({ name: 'error' });
    }
  }, [openDb]);

  useEffect(() => {
    void start();
  }, [start]);

  const lock = useCallback(() => {
    db.current?.close();
    db.current = null;
    if (dbKey.current) backend.memzero(dbKey.current);
    dbKey.current = null;
    setPhase({ name: 'locked' });
  }, []);

  // Lock whenever the app leaves the foreground, if a PIN is set (PRD 4.8, 7.2).
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'background' && phase.name === 'ready' && phase.pinSet) lock();
    });
    return () => sub.remove();
  }, [phase, lock]);

  const wipeAndRestart = useCallback(
    async (normalLooking: boolean) => {
      try {
        await panicWipe(vault, db.current, dbFiles);
      } finally {
        db.current = null;
        if (dbKey.current) backend.memzero(dbKey.current);
        dbKey.current = null;
      }
      // Duress (PRD 7.2): an empty, normal-looking app. Long-press (PRD 4.8): first-launch state.
      await openDb(await vault.create(), false, normalLooking);
    },
    [openDb],
  );

  const value = useMemo<Session>(
    () => ({
      phase,
      finishOnboarding: async () => {
        if (!db.current || phase.name !== 'ready') return;
        await setState(db.current, 'onboarding', 'done');
        setPhase({ ...phase, onboardingDone: true });
      },
      setLanguage: async (lang) => {
        await i18n.changeLanguage(lang);
        if (db.current) await setState(db.current, 'lang', lang);
      },
      setPin: async (pin, duressPin) => {
        if (!dbKey.current || phase.name !== 'ready') throw new Error('no open session');
        await vault.setPin(dbKey.current, pin, duressPin);
        setPhase({ ...phase, pinSet: true });
      },
      unlock: async (pin) => {
        const r = await vault.unlock(pin);
        if (r.kind === 'ok') {
          await openDb(r.dbKey, true);
          return 'ok';
        }
        if (r.kind === 'duress') {
          await wipeAndRestart(true);
          return 'ok';
        }
        if (r.kind === 'exhausted') {
          // ADR 0009: third wrong PIN. Wipe and return to first launch, with no warning shown.
          await wipeAndRestart(false);
          return 'ok';
        }
        return 'wrong';
      },
      wipe: () => wipeAndRestart(false),
      restoreCase: async (code) => {
        if (!db.current) throw new Error('no open session');
        return restoreFromCode(backend, db.current, code);
      },
      recoveryCode: async (caseId) => {
        if (!db.current) throw new Error('no open session');
        return recoveryCodeForCase(backend, vault, db.current, caseId);
      },
    }),
    [phase, openDb, wipeAndRestart],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession(): Session {
  const s = useContext(Ctx);
  if (!s) throw new Error('useSession outside SessionProvider');
  return s;
}
