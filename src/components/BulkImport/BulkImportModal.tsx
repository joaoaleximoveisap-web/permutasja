import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Layers, Loader2, Check, X, Building2, AlertTriangle, ArrowRight, Sparkles } from "lucide-react";
import { useBulkImport } from './useBulkImport';
import { Progress } from "@/components/ui/progress";
import { formatBRL } from '@/lib/property-utils';
import { useProperties } from '@/contexts/PropertiesContext';
import { toast } from 'sonner';
import { uid, buildNormalized } from '@/lib/property-utils';

export function BulkImportModal() {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const { step, session, jobs, selectedJobIds, setSelectedJobIds, startScan, setStep } = useBulkImport();
  const { addProperty } = useProperties();

  const handleStartScan = async () => {
    if (!url.trim()) return;
    
    setIsValidating(true);
    try {
      // Basic format validation
      const urlObj = new URL(url);
      if (!urlObj.protocol.startsWith('http')) throw new Error();
    } catch (e) {
      toast.error("URL inválida", { description: "Certifique-se de incluir http:// ou https://" });
      setIsValidating(false);
      return;
    }

    await startScan(url);
    setIsValidating(false);
  };

  const handleSave = async () => {
    const toSave = jobs.filter(j => j.status === 'done' && (selectedJobIds.size === 0 || selectedJobIds.has(j.id)));
    
    toSave.forEach(job => {
      const d = job.raw_data!;
      const base = {
        title: d.title,
        price: Number(d.price) || 0,
        area: Number(d.area) || 0,
        bedrooms: Number(d.bedrooms) || 0,
        description: d.description,
        images: d.images,
        city: d.location?.split(',')[0] || "",
        neighborhood: d.location?.split(',')[1] || "",
        type: "Apartamento",
        tags: ["importação em massa"],
        permuta: { enabled: false, details: "" }
      };

      addProperty({
        id: uid(),
        ...base,
        normalized: buildNormalized(base as any),
        createdAt: Date.now(),
        origin: "import",
        status: "published"
      });
    });

    toast.success(`${toSave.length} imóveis salvos com sucesso!`);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="glass rounded-xl gap-2 hover:bg-accent/10 transition-smooth">
          <Layers className="h-4 w-4 text-accent" /> Importação em massa
        </Button>
      </DialogTrigger>
      <DialogContent className="glass-strong border-glass-border rounded-2xl max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="p-6 pb-4 border-b border-glass-border">
          <DialogTitle className="flex items-center gap-2 text-2xl font-semibold">
            <Sparkles className="h-6 w-6 text-accent animate-pulse" /> Extração de Dados
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6">
          {step === 'input' && (
            <div className="max-w-xl mx-auto space-y-8 py-10">
              <div className="text-center space-y-2">
                <h3 className="text-xl font-medium">Qual página deseja escanear?</h3>
                <p className="text-muted-foreground">Insira o link de uma listagem ou resultados de busca de qualquer portal imobiliário.</p>
              </div>
              
              <div className="space-y-4">
                <div className="relative">
                  <Input 
                    placeholder="https://www.portalexemplo.com.br/venda/londrina" 
                    value={url}
                    onChange={e => setUrl(e.target.value)}
                    className="glass h-14 px-4 rounded-2xl text-lg focus:ring-accent"
                  />
                </div>
                <Button 
                  onClick={handleStartScan} 
                  disabled={!url.includes('http') || isValidating || (step as string) !== 'input'}
                  className="w-full h-14 bg-gradient-primary text-white text-lg rounded-2xl shadow-lg hover:opacity-90 transition-smooth gap-2"
                >
                  {isValidating || (step as string) === 'scanning' ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <ArrowRight className="h-5 w-5" />
                  )}
                  {isValidating ? "Validando URL..." : (step as string) === 'scanning' ? "Iniciando..." : "Iniciar Varredura Inteligente"}
                </Button>
              </div>

              <div className="bg-accent/5 border border-accent/10 rounded-2xl p-4 flex gap-3 text-sm">
                <AlertTriangle className="h-5 w-5 text-accent shrink-0" />
                <p className="text-muted-foreground">
                  Nossa IA irá identificar cada card de imóvel, abrir os links e extrair todos os detalhes automaticamente. Este processo pode levar alguns minutos dependendo da quantidade de itens.
                </p>
              </div>
            </div>
          )}

          {(step === 'scanning' || step === 'processing') && (
            <div className="py-16 text-center space-y-10 max-w-md mx-auto">
              <div className="relative h-32 w-32 mx-auto">
                <div className="absolute inset-0 rounded-full border-4 border-accent/10 border-t-accent animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Building2 className="h-12 w-12 text-accent animate-pulse" />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-2xl font-semibold">
                  {step === 'scanning' ? "Identificando imóveis..." : "Extraindo detalhes com IA..."}
                </h3>
                {session && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm font-medium">
                      <span>{session.total_done} de {session.total_found} processados</span>
                      <span>{Math.round((session.total_done / (session.total_found || 1)) * 100)}%</span>
                    </div>
                    <Progress value={(session.total_done / (session.total_found || 1)) * 100} className="h-3 rounded-full" />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="glass p-3 rounded-xl">
                  <div className="text-xl font-bold text-accent">{session?.total_found || 0}</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Encontrados</div>
                </div>
                <div className="glass p-3 rounded-xl">
                  <div className="text-xl font-bold text-green-500">{session?.total_done || 0}</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Sucesso</div>
                </div>
                <div className="glass p-3 rounded-xl">
                  <div className="text-xl font-bold text-destructive">{session?.total_failed || 0}</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Falhas</div>
                </div>
              </div>
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-md py-2 z-10">
                <div>
                  <h3 className="text-xl font-bold">Revisar Resultados</h3>
                  <p className="text-sm text-muted-foreground">Selecione quais imóveis deseja salvar na sua carteira.</p>
                </div>
                <div className="flex gap-2">
                   <Button onClick={handleSave} className="bg-gradient-primary text-white gap-2 rounded-xl">
                    <Check className="h-4 w-4" /> Salvar Selecionados
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {jobs.filter(j => j.status === 'done').map((job) => (
                  <div key={job.id} className="glass rounded-2xl overflow-hidden border border-glass-border group relative">
                    <div className="aspect-video relative overflow-hidden">
                      <img src={job.raw_data?.images?.[0]} alt="" className="w-full h-full object-cover transition-smooth group-hover:scale-110" />
                      <div className="absolute top-2 left-2">
                        <input 
                          type="checkbox" 
                          checked={selectedJobIds.size === 0 || selectedJobIds.has(job.id)}
                          onChange={() => {
                            const next = new Set(selectedJobIds);
                            if (next.has(job.id)) next.delete(job.id);
                            else next.add(job.id);
                            setSelectedJobIds(next);
                          }}
                          className="h-5 w-5 rounded border-glass-border bg-black/20 accent-accent"
                        />
                      </div>
                    </div>
                    <div className="p-4 space-y-2">
                      <div className="text-lg font-bold text-accent">{formatBRL(Number(job.raw_data?.price) || 0)}</div>
                      <div className="text-sm font-medium line-clamp-1">{job.raw_data?.title}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <span>{job.raw_data?.bedrooms} qtos</span>
                        <span>•</span>
                        <span>{job.raw_data?.area}m²</span>
                        <span>•</span>
                        <span className="truncate">{job.raw_data?.location}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}