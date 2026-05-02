import { useState } from "react";
import { Link2, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useProperties } from "@/contexts/PropertiesContext";
import { mockScrape } from "@/lib/property-utils";
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
      const ok = consumeCredit();
      if (!ok) { toast.error("Sem créditos disponíveis."); return; }
      const p = await mockScrape(url);
      addProperty(p);
      toast.success("Imóvel importado!", { description: p.title });
      setUrl("");
      onImported?.();
    } catch {
      toast.error("Não conseguimos importar este link.");
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
        {loading ? "Importando..." : "Importar"}
      </Button>
    </form>
  );
}
