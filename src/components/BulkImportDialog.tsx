import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Layers, Building2, AlertTriangle, Check, X } from "lucide-react";
import { useProperties } from "@/contexts/PropertiesContext";
import { Property } from "@/lib/types";
import { buildNormalized, uid, formatBRL } from "@/lib/property-utils";
import { toast } from "sonner";
import { scanListingPage, extractPropertyData } from "@/services/bulkImportService";

export function BulkImportDialog() {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [phase, setPhase] = useState<"idle" | "discovering" | "extracting" | "preview">("idle");
  const [extractedProperties, setExtractedProperties] = useState<Property[]>([]);
  const [progress, setProgress] = useState(0);
  const { addProperty, properties } = useProperties();

  const discoverLinks = async () => {
    if (!url.trim()) return;
    try { new URL(url); } catch { toast.error("URL inválida"); return; }

    setPhase("discovering");
    try {
      const links = await scanListingPage(url);
      
      if (links.length === 0) {
        toast.error("Nenhum link de imóvel encontrado nesta página.");
        setPhase("idle");
        return;
      }

      startExtraction(links);
    } catch (err) {
      console.error("Discovery error:", err);
      toast.error("Erro ao descobrir links");
      setPhase("idle");
    }
  };

  const startExtraction = async (links: string[]) => {
    setPhase("extracting");
    const extracted: Property[] = [];
    const batchSize = 3;
    
    for (let i = 0; i < links.length; i += batchSize) {
      const batch = links.slice(i, i + batchSize);
      const promises = batch.map(async (link) => {
        try {
          // Check for duplicates
          if (properties.some(p => p.sourceUrl === link)) return null;

          const d = await extractPropertyData(link);
          
          if (!d) return null;

          // Validation
          if (!d.title || !d.price || !d.images?.length) return null;

          const priceValue = typeof d.price === 'number' ? d.price : Number(d.price.toString().replace(/[^0-9]/g, '')) || 0;
          const areaValue = typeof d.area === 'number' ? d.area : Number(d.area.toString().replace(/[^0-9]/g, '')) || 0;
          const bedroomsValue = typeof d.bedrooms === 'number' ? d.bedrooms : Number(d.bedrooms.toString().replace(/[^0-9]/g, '')) || 0;

          const base = {
            title: d.title,
            price: priceValue,
            area: areaValue,
            bedrooms: bedroomsValue,
            description: d.description || "",
            images: d.images,
            city: (d as any).city || d.location?.split(',')[0],
            neighborhood: (d as any).neighborhood || d.location?.split(',')[1],
            type: (d as any).type,
            tags: [(d as any).type?.toLowerCase(), (d as any).neighborhood?.toLowerCase()].filter(Boolean) as string[],
            permuta: { enabled: !!(d as any).permuta, details: (d as any).permutaDetails },
          };

          return {
            id: uid(),
            ...base,
            normalized: buildNormalized(base as any),
            createdAt: Date.now(),
            origin: "import" as const,
            status: "published" as const,
            sourceUrl: link,
          };
        } catch { return null; }
      });

      const results = await Promise.all(promises);
      results.forEach(p => { if (p) extracted.push(p); });
      
      const currentProgress = Math.min(100, Math.round(((i + batch.length) / links.length) * 100));
      setProgress(currentProgress);
      
      // Delay between batches
      if (i + batchSize < links.length) {
        await new Promise(r => setTimeout(r, 1500));
      }
    }

    setExtractedProperties(extracted);
    setPhase("preview");
    if (extracted.length === 0) {
      toast.error("Nenhum novo imóvel válido foi extraído.");
      setPhase("idle");
    }
  };

  const confirmAll = () => {
    extractedProperties.forEach(p => addProperty(p));
    toast.success(`${extractedProperties.length} imóveis importados com sucesso!`);
    reset();
  };

  const reset = () => {
    setOpen(false);
    setUrl("");
    setPhase("idle");
    setExtractedProperties([]);
    setProgress(0);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); setOpen(o); }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="glass rounded-xl gap-2">
          <Layers className="h-4 w-4" /> Importação em massa
        </Button>
      </DialogTrigger>
      <DialogContent className="glass-strong border-glass-border rounded-2xl max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="p-6 pb-2 border-b border-glass-border">
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-accent" /> Importação em Massa
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {phase === "idle" && (
            <div className="space-y-4">
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex gap-3 text-xs text-amber-700">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                <p>
                  Insira o link de uma <strong>página de listagem</strong> (ex: resultados de busca). 
                  O sistema irá escanear a página e importar cada imóvel individualmente com alta qualidade.
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Link da listagem</label>
                <div className="flex gap-2">
                  <Input 
                    placeholder="https://www.imobiliaria.com.br/venda/londrina" 
                    value={url}
                    onChange={e => setUrl(e.target.value)}
                    className="glass"
                  />
                  <Button onClick={discoverLinks} className="bg-gradient-primary text-white">
                    Escanear
                  </Button>
                </div>
              </div>
            </div>
          )}

          {(phase === "discovering" || phase === "extracting") && (
            <div className="py-10 text-center space-y-6">
              <div className="relative h-20 w-20 mx-auto">
                <div className="absolute inset-0 rounded-full border-4 border-accent/20 border-t-accent animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Building2 className="h-8 w-8 text-accent animate-pulse" />
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-lg">
                  {phase === "discovering" ? "Escaneando listagem..." : `Extraindo imóveis... (${extractedProperties.length})`}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {phase === "discovering" ? "Buscando links de imóveis na página." : "Processando cada imóvel com inteligência de dados."}
                </p>
              </div>
              <div className="max-w-xs mx-auto space-y-1">
                <Progress value={progress} className="h-2" />
                <p className="text-[10px] text-muted-foreground text-right">{progress}% completo</p>
              </div>
            </div>
          )}

          {phase === "preview" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Confirmar Importação ({extractedProperties.length})</h3>
                <Button variant="ghost" size="sm" onClick={() => setPhase("idle")} className="text-xs h-7">
                  Trocar link
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {extractedProperties.map((p, i) => (
                  <div key={i} className="glass rounded-xl overflow-hidden flex flex-col border border-glass-border">
                    <div className="h-24 relative overflow-hidden">
                      <img src={p.images[0]} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="p-3 space-y-1">
                      <div className="text-sm font-bold truncate">{formatBRL(p.price)}</div>
                      <div className="text-[10px] text-muted-foreground truncate">{p.title}</div>
                      <div className="text-[10px] flex items-center justify-between pt-1">
                        <span>{p.bedrooms} qtos • {p.area}m²</span>
                        <button onClick={() => setExtractedProperties(cur => cur.filter((_, idx) => idx !== i))}>
                          <X className="h-3 w-3 text-destructive" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 bg-muted/30 border-t border-glass-border flex justify-end gap-2">
          <Button variant="ghost" onClick={reset}>Cancelar</Button>
          {phase === "preview" && (
            <Button onClick={confirmAll} className="bg-gradient-primary text-white gap-2">
              <Check className="h-4 w-4" /> Importar Tudo
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
