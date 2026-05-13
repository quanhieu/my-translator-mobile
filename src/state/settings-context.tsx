import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { getSecureKey, setSecureKey } from "@/src/lib/secure-keys";
import type { Engine, LangCode, PanelMode } from "@/src/types";

interface SettingsState {
  sonioxKey: string;
  openaiKey: string;
  engine: Engine;
  sourceLang: LangCode;
  targetLang: LangCode;
  panelMode: PanelMode;
  fontSize: number;
  loaded: boolean;
}

interface SettingsActions {
  setSonioxKey: (v: string) => Promise<void>;
  setOpenaiKey: (v: string) => Promise<void>;
  setEngine: (v: Engine) => void;
  setSourceLang: (v: LangCode) => void;
  setTargetLang: (v: LangCode) => void;
  setPanelMode: (v: PanelMode) => void;
  setFontSize: (v: number) => void;
}

const DEFAULT_STATE: SettingsState = {
  sonioxKey: "",
  openaiKey: "",
  engine: "soniox",
  sourceLang: "en",
  targetLang: "vi",
  panelMode: "single",
  fontSize: 18,
  loaded: false,
};

const SettingsContext = createContext<(SettingsState & SettingsActions) | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SettingsState>(DEFAULT_STATE);

  useEffect(() => {
    (async () => {
      const [sonioxKey, openaiKey] = await Promise.all([
        getSecureKey("soniox"),
        getSecureKey("openai"),
      ]);
      setState((s) => ({
        ...s,
        sonioxKey: sonioxKey ?? "",
        openaiKey: openaiKey ?? "",
        loaded: true,
      }));
    })();
  }, []);

  const setSonioxKey = async (v: string) => {
    await setSecureKey("soniox", v);
    setState((s) => ({ ...s, sonioxKey: v }));
  };
  const setOpenaiKey = async (v: string) => {
    await setSecureKey("openai", v);
    setState((s) => ({ ...s, openaiKey: v }));
  };
  const setEngine = (v: Engine) => setState((s) => ({ ...s, engine: v }));
  const setSourceLang = (v: LangCode) => setState((s) => ({ ...s, sourceLang: v }));
  const setTargetLang = (v: LangCode) => setState((s) => ({ ...s, targetLang: v }));
  const setPanelMode = (v: PanelMode) => setState((s) => ({ ...s, panelMode: v }));
  const setFontSize = (v: number) => setState((s) => ({ ...s, fontSize: v }));

  return (
    <SettingsContext.Provider
      value={{
        ...state,
        setSonioxKey,
        setOpenaiKey,
        setEngine,
        setSourceLang,
        setTargetLang,
        setPanelMode,
        setFontSize,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used inside SettingsProvider");
  return ctx;
}
