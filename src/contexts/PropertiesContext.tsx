import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Property } from "@/lib/types";

type Ctx = {
  properties: Property[];
  credits: number;
  addProperty: (p: Property) => void;
  removeProperty: (id: string) => void;
  consumeCredit: () => boolean;
  refillCredits: (n?: number) => void;
};

const PropertiesCtx = createContext<Ctx | null>(null);
const PROPS_KEY = "permutasja:properties";
const CREDITS_KEY = "permutasja:credits";

export function PropertiesProvider({ children }: { children: React.ReactNode }) {
  const [properties, setProperties] = useState<Property[]>(() => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(localStorage.getItem(PROPS_KEY) || "[]"); } catch { return []; }
  });
  const [credits, setCredits] = useState<number>(() => {
    if (typeof window === "undefined") return 50;
    const v = localStorage.getItem(CREDITS_KEY);
    return v == null ? 50 : Number(v);
  });

  useEffect(() => { localStorage.setItem(PROPS_KEY, JSON.stringify(properties)); }, [properties]);
  useEffect(() => { localStorage.setItem(CREDITS_KEY, String(credits)); }, [credits]);

  const addProperty = useCallback((p: Property) => setProperties((cur) => [p, ...cur]), []);
  const removeProperty = useCallback((id: string) => setProperties((cur) => cur.filter(p => p.id !== id)), []);
  const consumeCredit = useCallback(() => {
    let ok = false;
    setCredits((c) => { if (c > 0) { ok = true; return c - 1; } return c; });
    return ok;
  }, []);
  const refillCredits = useCallback((n = 50) => setCredits(n), []);

  const value = useMemo(() => ({ properties, credits, addProperty, removeProperty, consumeCredit, refillCredits }),
    [properties, credits, addProperty, removeProperty, consumeCredit, refillCredits]);

  return <PropertiesCtx.Provider value={value}>{children}</PropertiesCtx.Provider>;
}

export function useProperties() {
  const ctx = useContext(PropertiesCtx);
  if (!ctx) throw new Error("useProperties must be used within PropertiesProvider");
  return ctx;
}
