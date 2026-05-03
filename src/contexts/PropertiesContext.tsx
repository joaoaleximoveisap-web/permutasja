import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Property } from "@/lib/types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { buildNormalized } from "@/lib/property-utils";

type Ctx = {
  properties: Property[];
  drafts: Property[];
  credits: number;
  creditSystemEnabled: boolean;
  addProperty: (p: Property) => Promise<void>;
  updateProperty: (p: Property) => Promise<void>;
  upsertDraft: (p: Property) => void;
  publishDraft: (id: string) => Promise<void>;
  removeDraft: (id: string) => void;
  removeProperty: (id: string) => Promise<void>;
  getDraft: (id: string) => Property | undefined;
  consumeCredit: () => boolean;
  refillCredits: (n?: number) => void;
  syncFromSupabase: () => Promise<void>;
};

export const CREDIT_SYSTEM_ENABLED = false;

const PropertiesCtx = createContext<Ctx | null>(null);
const DRAFTS_KEY = "permutasja:drafts";
const CREDITS_KEY = "permutasja:credits";

function loadJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; } catch { return fallback; }
}

export function PropertiesProvider({ children }: { children: React.ReactNode }) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [drafts, setDrafts] = useState<Property[]>(() => loadJSON<Property[]>(DRAFTS_KEY, []));
  const [credits, setCredits] = useState<number>(() => {
    if (typeof window === "undefined") return 50;
    const v = localStorage.getItem(CREDITS_KEY);
    return v == null ? 50 : Number(v);
  });

  const syncFromSupabase = useCallback(async () => {
    const { data, error } = await supabase.from("properties").select("*").order("created_at", { ascending: false });
    if (error) {
      console.error("Error syncing properties:", error);
      return;
    }
    
    const mapped: Property[] = (data || []).map(p => {
      const base = {
        title: p.title,
        price: Number(p.price),
        area: Number(p.area),
        bedrooms: p.bedrooms || 0,
        bathrooms: p.bathrooms || 0,
        parking: p.parking || 0,
        description: p.description || "",
        images: p.images || [],
        sourceUrl: p.source_url || "",
        city: p.city || "",
        neighborhood: p.neighborhood || "",
        type: p.type || "",
        tags: p.tags || [],
        permuta: { enabled: p.permuta_enabled, details: p.permuta_details || "" }
      };

      return {
        id: p.id,
        ...base,
        status: p.status as any,
        origin: "import",
        createdAt: new Date(p.created_at).getTime(),
        normalized: buildNormalized(base as any)
      };
    });
    setProperties(mapped);
  }, []);

  useEffect(() => {
    syncFromSupabase();
  }, [syncFromSupabase]);

  useEffect(() => { localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts)); }, [drafts]);
  useEffect(() => { localStorage.setItem(CREDITS_KEY, String(credits)); }, [credits]);

  const addProperty = useCallback(async (p: Property) => {
    const { error } = await supabase.from("properties").upsert({
      title: p.title,
      description: p.description,
      price: p.price,
      area: p.area,
      bedrooms: p.bedrooms,
      bathrooms: p.bathrooms,
      parking: p.parking,
      city: p.city,
      neighborhood: p.neighborhood,
      type: p.type,
      images: p.images,
      source_url: p.sourceUrl,
      permuta_enabled: p.permuta.enabled,
      permuta_details: p.permuta.details,
      tags: p.tags,
      status: "published",
      original_data: p.originalData as any
    }, { onConflict: "source_url" });

    if (error) {
      toast.error("Erro ao salvar imóvel");
      console.error(error);
      return;
    }
    await syncFromSupabase();
  }, [syncFromSupabase]);

  const removeProperty = useCallback(async (id: string) => {
    const { error } = await supabase.from("properties").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao remover imóvel");
      return;
    }
    await syncFromSupabase();
  }, [syncFromSupabase]);

  const updateProperty = useCallback(async (p: Property) => {
    const { error } = await supabase.from("properties").update({
      title: p.title,
      description: p.description,
      price: p.price,
      area: p.area,
      bedrooms: p.bedrooms,
      bathrooms: p.bathrooms,
      parking: p.parking,
      city: p.city,
      neighborhood: p.neighborhood,
      type: p.type,
      images: p.images,
      permuta_enabled: p.permuta.enabled,
      permuta_details: p.permuta.details,
      tags: p.tags
    }).eq("id", p.id);

    if (error) {
      toast.error("Erro ao atualizar imóvel");
      return;
    }
    await syncFromSupabase();
  }, [syncFromSupabase]);

  const upsertDraft = useCallback((p: Property) => setDrafts((cur) => {
    const idx = cur.findIndex(d => d.id === p.id);
    if (idx === -1) return [{ ...p, status: "draft" }, ...cur];
    const copy = [...cur]; copy[idx] = { ...p, status: "draft" }; return copy;
  }), []);

  const removeDraft = useCallback((id: string) => setDrafts((cur) => cur.filter(d => d.id !== id)), []);
  const getDraft = useCallback((id: string) => drafts.find(d => d.id === id), [drafts]);

  const publishDraft = useCallback(async (id: string) => {
    const d = drafts.find(x => x.id === id);
    if (d) {
      await addProperty(d);
      setDrafts(cur => cur.filter(x => x.id !== id));
    }
  }, [drafts, addProperty]);

  const consumeCredit = useCallback(() => {
    if (!CREDIT_SYSTEM_ENABLED) return true;
    let ok = false;
    setCredits((c) => { if (c > 0) { ok = true; return c - 1; } return c; });
    return ok;
  }, []);
  const refillCredits = useCallback((n = 50) => setCredits(n), []);

  const value = useMemo(() => ({
    properties, drafts, credits,
    creditSystemEnabled: CREDIT_SYSTEM_ENABLED,
    addProperty, upsertDraft, publishDraft, removeDraft, getDraft,
    removeProperty, updateProperty, consumeCredit, refillCredits,
    syncFromSupabase
  }), [properties, drafts, credits, addProperty, upsertDraft, publishDraft, removeDraft, getDraft, removeProperty, updateProperty, consumeCredit, refillCredits, syncFromSupabase]);

  return <PropertiesCtx.Provider value={value}>{children}</PropertiesCtx.Provider>;
}

export function useProperties() {
  const ctx = useContext(PropertiesCtx);
  if (!ctx) throw new Error("useProperties must be used within PropertiesProvider");
  return ctx;
}
