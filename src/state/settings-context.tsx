import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import {
  getPref,
  getSecureKey,
  setPref,
  setSecureKey,
} from "@/src/lib/secure-keys";
import { DEFAULT_CHAT_MODEL } from "@/src/lib/openai-chat";
import type { Engine, LangCode, PanelMode } from "@/src/types";

interface SettingsState {
  sonioxKey: string;
  openaiKey: string;
  qwenKey: string;
  engine: Engine;
  sourceLang: LangCode;
  targetLang: LangCode;
  panelMode: PanelMode;
  fontSize: number;
  chatModel: string;
  loaded: boolean;
}

interface SettingsActions {
  setSonioxKey: (v: string) => Promise<void>;
  setOpenaiKey: (v: string) => Promise<void>;
  setQwenKey: (v: string) => Promise<void>;
  setEngine: (v: Engine) => void;
  setSourceLang: (v: LangCode) => void;
  setTargetLang: (v: LangCode) => void;
  setPanelMode: (v: PanelMode) => void;
  setFontSize: (v: number) => void;
  setChatModel: (v: string) => void;
}

const DEFAULT_STATE: SettingsState = {
  sonioxKey: "",
  openaiKey: "",
  qwenKey: "",
  engine: "soniox",
  // Default "auto" — Soniox/OpenAI auto-detect natively. Qwen LiveTranslate
  // does NOT auto-detect reliably (tested 2026-05-25 on real device: stops
  // after one segment), so for Qwen the UI defaults to a sensible value
  // ("en") and source picker is required.
  sourceLang: "auto",
  targetLang: "vi",
  panelMode: "single",
  fontSize: 18,
  chatModel: DEFAULT_CHAT_MODEL,
  loaded: false,
};

const SettingsContext = createContext<(SettingsState & SettingsActions) | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SettingsState>(DEFAULT_STATE);

  useEffect(() => {
    (async () => {
      const [
        sonioxKey,
        openaiKey,
        qwenKey,
        engine,
        sourceLang,
        targetLang,
        panelMode,
        fontSize,
        chatModel,
      ] = await Promise.all([
        getSecureKey("soniox"),
        getSecureKey("openai"),
        getSecureKey("qwen"),
        getPref("engine"),
        getPref("sourceLang"),
        getPref("targetLang"),
        getPref("panelMode"),
        getPref("fontSize"),
        getPref("chatModel"),
      ]);
      setState({
        sonioxKey: sonioxKey ?? "",
        openaiKey: openaiKey ?? "",
        qwenKey: qwenKey ?? "",
        engine: engine === "openai" || engine === "qwen" ? engine : "soniox",
        sourceLang: sourceLang ?? DEFAULT_STATE.sourceLang,
        targetLang: targetLang ?? DEFAULT_STATE.targetLang,
        panelMode: panelMode === "dual" ? "dual" : "single",
        fontSize: fontSize ? parseInt(fontSize, 10) || DEFAULT_STATE.fontSize : DEFAULT_STATE.fontSize,
        chatModel: chatModel || DEFAULT_STATE.chatModel,
        loaded: true,
      });
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
  const setQwenKey = async (v: string) => {
    await setSecureKey("qwen", v);
    setState((s) => ({ ...s, qwenKey: v }));
  };
  const setEngine = (v: Engine) => {
    setState((s) => ({ ...s, engine: v }));
    setPref("engine", v).catch(() => {});
  };
  const setSourceLang = (v: LangCode) => {
    setState((s) => ({ ...s, sourceLang: v }));
    setPref("sourceLang", v).catch(() => {});
  };
  const setTargetLang = (v: LangCode) => {
    setState((s) => ({ ...s, targetLang: v }));
    setPref("targetLang", v).catch(() => {});
  };
  const setPanelMode = (v: PanelMode) => {
    setState((s) => ({ ...s, panelMode: v }));
    setPref("panelMode", v).catch(() => {});
  };
  const setFontSize = (v: number) => {
    setState((s) => ({ ...s, fontSize: v }));
    setPref("fontSize", String(v)).catch(() => {});
  };
  const setChatModel = (v: string) => {
    setState((s) => ({ ...s, chatModel: v }));
    setPref("chatModel", v).catch(() => {});
  };

  return (
    <SettingsContext.Provider
      value={{
        ...state,
        setSonioxKey,
        setOpenaiKey,
        setQwenKey,
        setEngine,
        setSourceLang,
        setTargetLang,
        setPanelMode,
        setFontSize,
        setChatModel,
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
