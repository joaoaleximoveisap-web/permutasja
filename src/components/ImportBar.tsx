import { useState } from "react";
import { Link2, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useProperties } from "@/contexts/PropertiesContext";
import { buildNormalized, uid } from "@/lib/property-utils";
import { Property } from "@/lib/types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function ImportBar({ onImported }: { onImported?: () => void }) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const { addProperty, credits, consumeCredit } = useProperties();

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    try { new URL(url); } catch { toast.error("URL inválida"); return; }
    if (credits <= 0) { toast.error("Sem créditos. Faça upgrade para continuar importando."); return; }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("scrape-property", {
        body: { url },
      });

      if (error || data?.error) {
        const msg = (data?.error as string) || error?.message || "Não conseguimos importar este link.";
        toast.error("Falha na importação", { description: msg });
        return;
      }

      const ok = consumeCredit();
      if (!ok) { toast.error("Sem créditos disponíveis."); return; }

      const d = data.data as {
        title: string; price: number; area: number; bedrooms: number;
        bathrooms?: number; parking?: number; description: string; images: string[];
        city?: string; neighborhood?: string; type?: string;
        permuta?: boolean; permutaDetails?: string;
      };

      const tags = [
        d.type?.toLowerCase(),
        d.bedrooms ? `${d.bedrooms} quartos` : null,
        d.neighborhood?.toLowerCase(),
        d.price > 1500000 ? "alto padrão" : null,
        d.area > 150 ? "amplo" : null,
      ].filter(Boolean) as string[];

      const base = {
        title: d.title,
        price: d.price,
        area: d.area,
        bedrooms: d.bedrooms,
        bathrooms: d.bathrooms,
        parking: d.parking,
        description: d.description,
        images: d.images?.length ? d.images : [],
        sourceUrl: url,
        city: d.city,
        neighborhood: d.neighborhood,
        type: d.type,
        tags,
        permuta: { enabled: !!d.permuta, details: d.permutaDetails },
      };

      const property: Property = {
        id: uid(),
        ...base,
        normalized: buildNormalized(base as any),
        createdAt: Date.now(),
        origin: "import",
      };

      addProperty(property);
      toast.success("Imóvel importado!", { description: d.title });
      setUrl("");
      onImported?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro inesperado";
      toast.error("Falha na importação", { description: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handle} className="glass-strong rounded-2xl p-2 flex flex-col sm:flex-row gap-2">
      <div className="flex-1 flex items-center gap-2 px-3">
        <Link2 className="h-4 w-4 text-muted-foreground shrink-0" />
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Cole o link do imóvel (qualquer portal)"
          className="border-0 bg-transparent focus-visible:ring-0 px-0 text-sm"
        />
      </div>
      <Button type="submit" disabled={loading} className="rounded-xl bg-gradient-primary text-primary-foreground hover:opacity-90 transition-smooth">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {loading ? "Analisando link..." : "Importar"}
      </Button>
    </form>
  );
}
