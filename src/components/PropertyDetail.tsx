import { Property } from "@/lib/types";
import { formatBRL } from "@/lib/property-utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Bed, Maximize2, MapPin, Repeat2, Tag, ExternalLink, Trash2, ChevronLeft, ChevronRight, Pencil, Sparkles, X, ZoomIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProperties } from "@/contexts/PropertiesContext";
import { useState, useEffect, useCallback } from "react";
import { EditPropertyDialog } from "./EditPropertyDialog";

export function PropertyDetail({ property, open, onOpenChange }: { property: Property | null; open: boolean; onOpenChange: (v: boolean) => void; }) {
  const { removeProperty } = useProperties();
  const [active, setActive] = useState(0);
  const [editOpen, setEditOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  const nextImg = useCallback(() => {
    if (!property) return;
    setActive(prev => (prev < property.images.length - 1 ? prev + 1 : 0));
  }, [property]);

  const prevImg = useCallback(() => {
    if (!property) return;
    setActive(prev => (prev > 0 ? prev - 1 : property.images.length - 1));
  }, [property]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!fullscreen) return;
      if (e.key === "ArrowRight") nextImg();
      if (e.key === "ArrowLeft") prevImg();
      if (e.key === "Escape") setFullscreen(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [fullscreen, nextImg, prevImg]);

  if (!property) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => {
      if (!editOpen) onOpenChange(v);
    }}>
      <DialogContent className="max-w-6xl glass-strong border-glass-border rounded-3xl p-0 overflow-hidden max-h-[95vh] overflow-y-auto z-50">
        <div className="flex flex-col relative">
          {/* Hero Section Style Netflix */}
          <div 
            className="relative w-full aspect-video md:aspect-[21/9] bg-black overflow-hidden group cursor-zoom-in"
            onClick={() => setFullscreen(true)}
          >
            <img 
              src={property.images[active]} 
              alt={property.title} 
              className="w-full h-full object-cover transition-smooth group-hover:scale-105" 
            />
            
            {/* Dark Gradient Overlay Style Netflix */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
            
            {/* Immersive Badge */}
            <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0">
              <div className="glass-strong bg-white/10 backdrop-blur-md border-white/20 rounded-xl px-4 py-2 flex items-center gap-2 text-white font-bold text-sm">
                <ZoomIn className="h-4 w-4" /> Ver em tela cheia
              </div>
            </div>

            {/* Navigation Arrows */}
            {property.images.length > 1 && (
              <>
                <button 
                  onClick={(e) => { e.stopPropagation(); prevImg(); }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/40 text-white hover:bg-black/60 backdrop-blur-md transition-all z-20 sm:opacity-0 sm:group-hover:opacity-100"
                  aria-label="Imagem anterior"
                >
                  <ChevronLeft className="h-8 w-8" />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); nextImg(); }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/40 text-white hover:bg-black/60 backdrop-blur-md transition-all z-20 sm:opacity-0 sm:group-hover:opacity-100"
                  aria-label="Próxima imagem"
                >
                  <ChevronRight className="h-8 w-8" />
                </button>
              </>
            )}
            
            {/* Gallery Counter */}
            <div className="absolute top-6 right-6 bg-black/60 text-white text-xs font-bold px-3 py-1.5 rounded-full backdrop-blur-md z-10 border border-white/10">
              {active + 1} / {property.images.length}
            </div>
          </div>


          <div className="p-8 md:p-12 grid md:grid-cols-3 gap-12">
            <div className="md:col-span-2 space-y-8">
              <section className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {property.permuta.enabled && (
                    <div className="bg-accent text-white rounded-lg px-3 py-1 text-xs font-bold uppercase tracking-widest shadow-lg">
                      Aceita Permuta
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    {property.isExclusive && (
                      <div className="bg-accent/10 text-accent border border-accent/20 rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                        Exclusivo
                      </div>
                    )}
                    {property.price > 1500000 && (
                      <div className="bg-primary/10 text-primary border border-primary/20 rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                        Alto Padrão
                      </div>
                    )}
                  </div>
                  <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground">
                    {property.title}
                  </h2>
                  <div className="text-3xl md:text-4xl font-bold text-accent">
                    {formatBRL(property.price)}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-6 text-muted-foreground font-medium text-lg border-b border-border pb-6">
                  <span className="flex items-center gap-2"><MapPin className="h-5 w-5 text-accent" />{property.neighborhood}, {property.city}</span>
                  <span className="flex items-center gap-2"><Bed className="h-5 w-5 text-accent" />{property.bedrooms} Quartos</span>
                  <span className="flex items-center gap-2"><Maximize2 className="h-5 w-5 text-accent" />{property.area} m²</span>
                </div>
              </section>

              <section>
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-foreground">
                  <Sparkles className="h-5 w-5 text-accent" /> Sobre este imóvel
                </h3>
                <p className="text-lg leading-relaxed text-muted-foreground font-medium italic border-l-4 border-accent pl-6 py-2">
                  {property.description}
                </p>
              </section>

              {property.permuta.enabled && (
                <section className="glass rounded-3xl p-6 border border-accent/20 bg-accent/5">
                  <h3 className="text-lg font-bold mb-2 flex items-center gap-2 text-accent">
                    <Repeat2 className="h-5 w-5" /> Detalhes da Permuta
                  </h3>
                  <p className="text-muted-foreground font-medium">
                    {property.permuta.details || "Este proprietário avalia propostas de permuta. Entre em contato para saber quais bens podem ser aceitos como parte do pagamento."}
                  </p>
                </section>
              )}

              {property.tags.length > 0 && (
                <section>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4">Tags em destaque</h3>
                  <div className="flex flex-wrap gap-2">
                    {property.tags.map(t => (
                      <span key={t} className="glass border-white/5 rounded-xl px-4 py-2 text-sm font-bold flex items-center gap-2 text-foreground/80">
                        <Tag className="h-4 w-4 text-accent" />{t}
                      </span>
                    ))}
                  </div>
                </section>
              )}
            </div>

            <div className="space-y-6">
              <div className="glass-strong rounded-3xl p-6 border border-white/5 space-y-4 sticky top-6">
                <h3 className="font-bold text-center text-sm uppercase tracking-widest text-muted-foreground">Ações Rápidas</h3>
                <Button 
                  onClick={() => setEditOpen(true)}
                  className="w-full rounded-2xl h-12 bg-white/5 hover:bg-white/10 border-white/10 text-foreground font-bold"
                  variant="outline"
                >
                  <Pencil className="h-4 w-4 mr-2 text-accent" /> Editar Imóvel
                </Button>

                {property.sourceUrl && (
                  <Button asChild variant="outline" className="w-full rounded-2xl h-12 bg-white/5 hover:bg-white/10 border-white/10 text-foreground font-bold">
                    <a href={property.sourceUrl} target="_blank" rel="noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2 text-accent" /> Ver Link Original
                    </a>
                  </Button>
                )}
                
                <div className="pt-4 border-t border-white/5">
                  <Button
                    variant="ghost"
                    className="w-full rounded-2xl h-12 text-destructive hover:bg-destructive/10 font-bold"
                    onClick={() => { removeProperty(property.id); onOpenChange(false); }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" /> Excluir da Carteira
                  </Button>
                </div>
              </div>

              {/* Gallery List (Social Style) */}
              <div className="pt-6">
                <div className="flex items-center justify-between mb-4 px-1">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Galeria Completa</h3>
                  <button 
                    onClick={() => setFullscreen(true)}
                    className="text-[10px] font-bold text-accent hover:underline flex items-center gap-1"
                  >
                    Ver Imersivo <ExternalLink className="h-3 w-3" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
                  {property.images.map((src, i) => (
                    <button 
                      key={i} 
                      onClick={() => setActive(i)} 
                      className={`aspect-video rounded-xl overflow-hidden ring-2 transition-all group ${i === active ? "ring-accent" : "ring-transparent opacity-60 hover:opacity-100 hover:scale-[1.02]"}`}
                    >
                      <img src={src} alt="" className="h-full w-full object-cover transition-smooth group-hover:scale-110" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {editOpen && (
          <EditPropertyDialog 
            property={property} 
            open={editOpen} 
            onOpenChange={setEditOpen} 
          />
        )}
      </DialogContent>
      {/* Fullscreen Immersive Viewer */}
      {fullscreen && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl animate-in fade-in duration-300 flex flex-col">
          {/* Header */}
          <div className="p-6 flex items-center justify-between z-10">
            <div className="text-white space-y-1">
              <h3 className="font-bold text-lg leading-none">{property.title}</h3>
              <p className="text-white/60 text-xs font-medium">{active + 1} de {property.images.length} fotos</p>
            </div>
            <button 
              onClick={() => setFullscreen(false)}
              className="p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Main Content */}
          <div className="flex-1 relative flex items-center justify-center p-4 md:p-12 overflow-hidden">
            <img 
              src={property.images[active]} 
              alt="" 
              className="max-w-full max-h-full object-contain select-none shadow-2xl rounded-sm transition-all duration-500 animate-in zoom-in-95" 
            />

            {/* Navigation */}
            {property.images.length > 1 && (
              <>
                <button 
                  onClick={prevImg}
                  className="absolute left-4 md:left-8 p-4 rounded-full bg-white/5 text-white hover:bg-white/10 backdrop-blur-md transition-all group"
                >
                  <ChevronLeft className="h-8 w-8 group-hover:-translate-x-1 transition-transform" />
                </button>
                <button 
                  onClick={nextImg}
                  className="absolute right-4 md:right-8 p-4 rounded-full bg-white/5 text-white hover:bg-white/10 backdrop-blur-md transition-all group"
                >
                  <ChevronRight className="h-8 w-8 group-hover:translate-x-1 transition-transform" />
                </button>
              </>
            )}
          </div>

          {/* Mini-feed Footer (Instagram Style) */}
          <div className="p-6 bg-gradient-to-t from-black to-transparent">
            <div className="max-w-4xl mx-auto flex gap-2 overflow-x-auto no-scrollbar justify-center py-2 px-4">
              {property.images.map((src, i) => (
                <button 
                  key={i} 
                  onClick={() => setActive(i)} 
                  className={`h-12 w-20 md:h-16 md:w-28 shrink-0 rounded-lg overflow-hidden border-2 transition-all ${i === active ? "border-accent scale-110" : "border-transparent opacity-40 hover:opacity-100"}`}
                >
                  <img src={src} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </Dialog>

  );
}
