import { useState } from "react";
import { Link2, Loader2, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useProperties } from "@/contexts/PropertiesContext";
import { buildNormalized, uid } from "@/lib/property-utils";
import { Property } from "@/lib/types";
import { toast } from "sonner";
import { extractSingleProperty } from "@/services/singlePropertyExtractor";

export function ImportBar({ onImported }: { onImported?: () => void }) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const { upsertDraft, credits, consumeCredit } = useProperties();
  const navigate = useNavigate();

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    try { new URL(url); } catch { toast.error("URL inválida"); return; }
    if (credits <= 0) { toast.error("Sem créditos. Faça upgrade para continuar importando."); return; }

    console.log('=== STEP 1: Starting import for:', url);
    setLoading(true);
    
    try {
      const apiKey = import.meta.env.VITE_FIRECRAWL_API_KEY;
      console.log('=== STEP 2: API key exists:', !!apiKey);
      
      if (!apiKey) {
        toast.error("API key não configurada");
        return;
      }

      console.log('=== STEP 3: Calling Firecrawl...');
      const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          url: url.trim(),
          formats: ['html'],
          waitFor: 5000
        })
      });

      console.log('=== STEP 4: Firecrawl status:', response.status);
      
      if (!response.ok) {
        const errText = await response.text();
        console.error('Firecrawl error:', errText);
        toast.error('Erro ao acessar página: ' + response.status);
        return;
      }

      const result = await response.json();
      const html = result?.data?.html || '';
      
      console.log('=== STEP 5: HTML received, length:', html.length);
      console.log('=== STEP 5b: HTML preview:', html.substring(0, 500));
      
      if (!html || html.length < 100) {
        toast.error('Página retornou vazia. Tente novamente.');
        return;
      }

      // STEP 6: Extract images from HTML
      console.log('=== STEP 6: Extracting images...');
      const d = await extractSingleProperty(url); // This now uses internal parsePropertyFromHTML
      console.log('=== STEP 6b: Extracted data:', JSON.stringify(d, null, 2));

      if (!d) {
        toast.error("Falha na extração", { description: "Não conseguimos processar os dados da página." });
        return;
      }

      const ok = consumeCredit();
      if (!ok) { toast.error("Sem créditos disponíveis."); return; }

      const priceValue = typeof d.price === 'number' ? d.price : Number(d.price.toString().replace(/[^0-9]/g, '')) || 0;
      const areaValue = typeof d.area === 'number' ? d.area : Number(d.area.toString().replace(/[^0-9]/g, '')) || 0;
      const bedroomsValue = typeof d.bedrooms === 'number' ? d.bedrooms : Number(d.bedrooms.toString().replace(/[^0-9]/g, '')) || 0;

      const tags = [
        bedroomsValue ? `${bedroomsValue} quartos` : null,
        priceValue > 1500000 ? "alto padrão" : null,
        areaValue > 150 ? "amplo" : null,
      ].filter(Boolean) as string[];

      const base = {
        title: d.title || "",
        price: priceValue,
        area: areaValue,
        bedrooms: bedroomsValue,
        bathrooms: Number(d.bathrooms) || 0,
        parking: Number(d.parking) || 0,
        suites: Number(d.suites) || 0,
        description: d.description || "",
        images: d.images || [],
        coverIndex: 0,
        sourceUrl: url,
        city: d.location?.split(',')[0]?.trim() || "",
        neighborhood: d.location?.split(',')[1]?.trim() || "",
        address: d.address || d.location || "",
        condominiumFee: d.condoFee || "",
        propertyCode: d.property_code || "",
        type: d.propertyType || "",
        tags,
        permuta: { enabled: false, details: "" },
      };

      const fieldSources: Record<string, "imported" | "user_corrected" | "manual"> = {};
      ["title", "price", "area", "bedrooms", "bathrooms", "parking", "description", "city", "neighborhood", "images"].forEach((k) => {
        const v = (d as any)[k];
        if (v !== undefined && v !== null && v !== "" && v !== 0 && !(Array.isArray(v) && v.length === 0)) {
          fieldSources[k] = "imported";
        }
      });

      const draft: Property = {
        id: uid(),
        ...base,
        normalized: buildNormalized(base as any),
        createdAt: Date.now(),
        origin: "import",
        status: "draft",
        originalData: d as unknown as Record<string, unknown>,
        fieldSources,
        missingFields: [],
      };

      console.log('=== STEP 9: Final property:', JSON.stringify({
        title: draft.title,
        price: draft.price,
        images_count: draft.images.length,
        area: draft.area
      }));

      upsertDraft(draft);
      toast.success(`Imóvel extraído: ${draft.images.length} fotos`);
      setUrl("");
      onImported?.();
      navigate(`/revisar/${draft.id}`);
    } catch (err: any) {
      console.error('=== IMPORT CRASHED ===', err);
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
