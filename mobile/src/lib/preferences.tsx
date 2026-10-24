import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';
import en from '../locales/en.json';
import es from '../locales/es.json';
import { storage } from './storage';

export type CopyKey = keyof typeof en;
type Preferences = {
  language: 'en' | 'es';
  saved: string[];
  watchIds: string[];
  pledgeVersion: number;
};
const initial: Preferences = {
  language: 'en',
  saved: ['atx-7', 'atx-19', 'tc-133'],
  watchIds: [],
  pledgeVersion: 0,
};
type Context = Preferences & {
  ready: boolean;
  storageError: boolean;
  activeStormId: string;
  simDriveActive: boolean;
  replayResetToken: number;
  triggerSampleReplay: (stormId: string) => void;
  setActiveStormId: (stormId: string) => void;
  setSimDriveActive: (active: boolean) => void;
  setLanguage: (value: 'en' | 'es') => void;
  toggleSaved: (id: string) => void;
  toggleWatch: (id: string) => void;
  accept: () => void;
  resetPledge: () => void;
  t: (key: CopyKey, vars?: Record<string, string | number>) => string;
};
const PreferencesContext = createContext<Context | null>(null);
export function PreferencesProvider({ children }: PropsWithChildren) {
  const [prefs, setPrefs] = useState(initial);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [activeStormId, setActiveStormId] = useState('halloween-2013');
  const [simDriveActive, setSimDriveActive] = useState(false);
  const [replayResetToken, setReplayResetToken] = useState(0);

  useEffect(() => {
    let mounted = true;
    storage
      .get('fordcast.preferences.v1')
      .then((raw) => {
        if (!raw || !mounted) return;
        const p: unknown = JSON.parse(raw);
        if (p && typeof p === 'object' && 'language' in p && 'saved' in p && 'pledgeVersion' in p) {
          const obj = p as Record<string, unknown>;
          setPrefs({
            language: obj.language === 'es' ? 'es' : 'en',
            saved: Array.isArray(obj.saved)
              ? obj.saved.filter((id): id is string => typeof id === 'string')
              : initial.saved,
            watchIds: Array.isArray(obj.watchIds)
              ? obj.watchIds.filter((id): id is string => typeof id === 'string')
              : [],
            pledgeVersion: obj.pledgeVersion === 1 ? 1 : 0,
          });
        }
      })
      .catch(() => {
        if (mounted) setStorageError(true);
      })
      .finally(() => {
        if (mounted) setReady(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (ready)
      storage
        .set('fordcast.preferences.v1', JSON.stringify(prefs))
        .catch(() => setStorageError(true));
  }, [prefs, ready]);

  const t = (key: CopyKey, vars: Record<string, string | number> = {}) => {
    let text: string = (prefs.language === 'es' ? es : en)[key];
    for (const [name, value] of Object.entries(vars))
      text = text.replaceAll(`{{${name}}}`, String(value));
    return text;
  };

  return (
    <PreferencesContext.Provider
      value={{
        ...prefs,
        ready,
        storageError,
        activeStormId,
        simDriveActive,
        replayResetToken,
        triggerSampleReplay: (stormId) => {
          setActiveStormId(stormId);
          setReplayResetToken((token) => token + 1);
        },
        setActiveStormId,
        setSimDriveActive,
        t,
        setLanguage: (language) => setPrefs((p) => ({ ...p, language })),
        toggleSaved: (id) =>
          setPrefs((p) => ({
            ...p,
            saved: p.saved.includes(id) ? p.saved.filter((v) => v !== id) : [...p.saved, id],
          })),
        toggleWatch: (id) =>
          setPrefs((p) => ({
            ...p,
            watchIds: p.watchIds.includes(id)
              ? p.watchIds.filter((v) => v !== id)
              : [...p.watchIds, id],
          })),
        accept: () => setPrefs((p) => ({ ...p, pledgeVersion: 1 })),
        resetPledge: () => setPrefs((p) => ({ ...p, pledgeVersion: 0 })),
      }}
    >
      {children}
    </PreferencesContext.Provider>
  );
}
export function usePreferences() {
  const value = useContext(PreferencesContext);
  if (!value) throw new Error('PreferencesProvider missing');
  return value;
}
