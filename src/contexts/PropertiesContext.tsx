import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Property } from "@/lib/types";

type Ctx = {
  properties: Property[];
  drafts: Property[];
  credits: number;
  addProperty: (p: Property) => void;
  upsertDraft: (p: Property) => void;
  publishDraft: (id: string) => void;
  removeDraft: (id: string) => void;
  removeProperty: (id: string) => void;
  getDraft: (id: string) => Property | undefined;
  consumeCredit: () => boolean;
  refillCredits: (n?: number) => void;
};

const PropertiesCtx = createContext<Ctx | null>(null);
const PROPS_KEY = "permutasja:properties";
const DRAFTS_KEY = "permutasja:drafts";
const CREDITS_KEY = "permutasja:credits";

function loadJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; } catch { return fallback; }
}

export function PropertiesProvider({ children }: { children: React.ReactNode }) {
  const [properties, setProperties] = useState<Property[]>(() => loadJSON<Property[]>(PROPS_KEY, []));
  const [drafts, setDrafts] = useState<Property[]>(() => loadJSON<Property[]>(DRAFTS_KEY, []));
  const [credits, setCredits] = useState<number>(() => {
    if (typeof window === "undefined") return 50;
    const v = localStorage.getItem(CREDITS_KEY);
    return v == null ? 50 : Number(v);
  });

  useEffect(() => { localStorage.setItem(PROPS_KEY, JSON.stringify(properties)); }, [properties]);
  useEffect(() => { localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts)); }, [drafts]);
  useEffect(() => { localStorage.setItem(CREDITS_KEY, String(credits)); }, [credits]);

  const addProperty = useCallback((p: Property) => setProperties((cur) => [{ ...p, status: "published" }, ...cur]), []);
  const removeProperty = useCallback((id: string) => setProperties((cur) => cur.filter(p => p.id !== id)), []);

  const upsertDraft = useCallback((p: Property) => setDrafts((cur) => {
    const idx = cur.findIndex(d => d.id === p.id);
    if (idx === -1) return [{ ...p, status: "draft" }, ...cur];
    const copy = [...cur]; copy[idx] = { ...p, status: "draft" }; return copy;
  }), []);
  const removeDraft = useCallback((id: string) => setDrafts((cur) => cur.filter(d => d.id !== id)), []);
  const getDraft = useCallback((id: string) => drafts.find(d => d.id === id), [drafts]);
  const publishDraft = useCallback((id: string) => {
    setDrafts((cur) => {
      const d = cur.find(x => x.id === id);
      if (d) setProperties((ps) => [{ ...d, status: "published" }, ...ps]);
      return cur.filter(x => x.id !== id);
    });
  }, []);

  const consumeCredit = useCallback(() => {
    let ok = false;
    setCredits((c) => { if (c > 0) { ok = true; return c - 1; } return c; });
    return ok;
  }, []);
  const refillCredits = useCallback((n = 50) => setCredits(n), []);

  const value = useMemo(() => ({
    properties, drafts, credits,
    addProperty, upsertDraft, publishDraft, removeDraft, getDraft,
    removeProperty, consumeCredit, refillCredits,
  }), [properties, drafts, credits, addProperty, upsertDraft, publishDraft, removeDraft, getDraft, removeProperty, consumeCredit, refillCredits]);

  return <PropertiesCtx.Provider value={value}>{children}</PropertiesCtx.Provider>;
}

export function useProperties() {
  const ctx = useContext(PropertiesCtx);
  if (!ctx) throw new Error("useProperties must be used within PropertiesProvider");
  return ctx;
}
