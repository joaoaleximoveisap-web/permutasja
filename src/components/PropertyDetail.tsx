import { Property } from "@/lib/types";
import { formatBRL } from "@/lib/property-utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Bed, Maximize2, MapPin, Repeat2, Tag, ExternalLink, Trash2, ChevronLeft, ChevronRight, Pencil, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProperties } from "@/contexts/PropertiesContext";
import { useState } from "react";
import { EditPropertyDialog } from "./EditPropertyDialog";

export function PropertyDetail({ property, open, onOpenChange }: { property: Property | null; open: boolean; onOpenChange: (v: boolean) => void; }) {
  const { removeProperty } = useProperties();
  const [active, setActive] = useState(0);
  const [editOpen, setEditOpen] = useState(false);
  if (!property) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => {
      if (!editOpen) onOpenChange(v);
    }}>
      <DialogContent className="max-w-7xl glass-strong border-white/5 rounded-[2.5rem] p-0 overflow-hidden max-h-[96vh] overflow-y-auto z-50 shadow-2xl">
        <div className="flex flex-col">
          {/* Hero Section Style Netflix - Full Immersion */}
          <div className="relative w-full aspect-video md:aspect-[21/9] bg-black overflow-hidden group">
            <div className="absolute inset-0 transition-transform duration-[10000ms] ease-out group-hover:scale-110">
              <img 
                src={property.images[active]} 
                alt={property.title} 
                className="w-full h-full object-cover" 
              />
            </div>
            
            {/* Ultra Dark Cinematic Gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-90" />
            
            {/* Hero Content - Bottom-Left Positioned */}
            <div className="absolute bottom-0 left-0 right-0 p-8 md:p-16 flex flex-col items-start gap-4">
              <div className="flex flex-wrap gap-2 animate-fade-in">
                {property.permuta.enabled && (
                  <div className="bg-accent text-white rounded-md px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] shadow-xl">
                    Permuta
                  </div>
                )}
                {property.price > 1500000 && (
                  <div className="bg-white/10 backdrop-blur-md text-white border border-white/20 rounded-md px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em]">
                    Premium
                  </div>
                )}
              </div>
              
              <div className="max-w-3xl space-y-2 animate-slide-up">
                <DialogTitle className="text-4xl md:text-6xl font-black text-white tracking-tighter leading-[0.95] drop-shadow-2xl">
                  {property.title.split(',')[0]}
                </DialogTitle>
                
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-white/80 font-bold text-sm md:text-lg">
                  <span className="text-accent text-2xl md:text-3xl font-black tracking-tight">{formatBRL(property.price)}</span>
                  <span className="opacity-40">•</span>
                  <span className="flex items-center gap-1.5"><Bed className="h-5 w-5 opacity-60" />{property.bedrooms} suítes</span>
                  <span className="opacity-40">•</span>
                  <span className="flex items-center gap-1.5"><Maximize2 className="h-5 w-5 opacity-60" />{property.area} m²</span>
                  <span className="opacity-40">•</span>
                  <span className="flex items-center gap-1.5"><MapPin className="h-5 w-5 opacity-60" />{property.neighborhood}</span>
                </div>
              </div>

              <div className="flex gap-4 pt-4 animate-fade-in" style={{ animationDelay: '200ms' }}>
                <Button className="bg-white text-black hover:bg-white/90 rounded-xl px-8 h-14 font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-2xl">
                  Agendar Visita
                </Button>
                <Button variant="outline" className="glass bg-white/5 border-white/10 text-white rounded-xl px-8 h-14 font-black uppercase tracking-widest hover:bg-white/10 transition-all hover:scale-105 active:scale-95">
                  <Repeat2 className="h-5 w-5 mr-2" /> Avaliar Permuta
                </Button>
              </div>
            </div>

            {/* Navigation Arrows - Only visible on hover */}
            {property.images.length > 1 && (
              <>
                <button 
                  onClick={() => setActive(prev => (prev > 0 ? prev - 1 : property.images.length - 1))}
                  className="absolute left-6 top-1/2 -translate-y-1/2 p-4 rounded-full bg-black/20 text-white hover:bg-black/60 backdrop-blur-xl opacity-0 group-hover:opacity-100 transition-all duration-500 hover:scale-110 z-30"
                >
                  <ChevronLeft className="h-10 w-10" />
                </button>
                <button 
                  onClick={() => setActive(prev => (prev < property.images.length - 1 ? prev + 1 : 0))}
                  className="absolute right-6 top-1/2 -translate-y-1/2 p-4 rounded-full bg-black/20 text-white hover:bg-black/60 backdrop-blur-xl opacity-0 group-hover:opacity-100 transition-all duration-500 hover:scale-110 z-30"
                >
                  <ChevronRight className="h-10 w-10" />
                </button>
              </>
            )}
            
            {/* Gallery Counter - Discrete and blurred */}
            <div className="absolute top-8 right-8 bg-black/40 text-white text-[10px] font-black tracking-[0.2em] px-4 py-2 rounded-full backdrop-blur-2xl border border-white/10 opacity-60 group-hover:opacity-100 transition-opacity uppercase">
              Galeria {active + 1} / {property.images.length}
            </div>
          </div>

          <div className="p-8 md:p-16 grid lg:grid-cols-3 gap-16 bg-[#0a0a0a] text-white">
            <div className="lg:col-span-2 space-y-12">
              <section className="animate-fade-in">
                <h3 className="text-xs font-black uppercase tracking-[0.3em] text-accent mb-6 flex items-center gap-3">
                  <div className="h-px w-8 bg-accent" /> Sobre a Residência
                </h3>
                <p className="text-xl md:text-2xl leading-[1.6] text-white/70 font-medium tracking-tight">
                  {property.description}
                </p>
              </section>

              {property.tags.length > 0 && (
                <section className="animate-fade-in" style={{ animationDelay: '300ms' }}>
                  <h3 className="text-xs font-black uppercase tracking-[0.3em] text-white/40 mb-6">Destaques</h3>
                  <div className="flex flex-wrap gap-3">
                    {property.tags.map(t => (
                      <span key={t} className="bg-white/5 border border-white/10 rounded-2xl px-6 py-3 text-sm font-bold flex items-center gap-2 hover:bg-white/10 transition-colors cursor-default">
                        <Sparkles className="h-4 w-4 text-accent" />{t}
                      </span>
                    ))}
                  </div>
                </section>
              )}
            </div>

            <div className="space-y-8 animate-fade-in" style={{ animationDelay: '500ms' }}>
              <div className="glass-strong bg-white/5 rounded-[2rem] p-8 border border-white/5 space-y-6">
                <h3 className="font-black text-xs uppercase tracking-[0.3em] text-white/40">Gerenciamento</h3>
                <div className="grid gap-3">
                  <Button 
                    onClick={() => setEditOpen(true)}
                    className="w-full rounded-2xl h-14 bg-white/5 hover:bg-white/10 border-white/10 text-white font-black uppercase tracking-widest text-xs"
                    variant="outline"
                  >
                    <Pencil className="h-4 w-4 mr-3 text-accent" /> Editar
                  </Button>

                  {property.sourceUrl && (
                    <Button asChild variant="outline" className="w-full rounded-2xl h-14 bg-white/5 hover:bg-white/10 border-white/10 text-white font-black uppercase tracking-widest text-xs">
                      <a href={property.sourceUrl} target="_blank" rel="noreferrer">
                        <ExternalLink className="h-4 w-4 mr-3 text-accent" /> Link de Origem
                      </a>
                    </Button>
                  )}
                  
                  <Button
                    variant="ghost"
                    className="w-full rounded-2xl h-14 text-white/40 hover:text-destructive hover:bg-destructive/10 font-black uppercase tracking-widest text-xs mt-4"
                    onClick={() => { removeProperty(property.id); onOpenChange(false); }}
                  >
                    <Trash2 className="h-4 w-4 mr-3" /> Remover
                  </Button>
                </div>
              </div>

              {/* Gallery Preview - Netflix Style Horizontal or Grid */}
              <div className="space-y-4">
                <h3 className="font-black text-xs uppercase tracking-[0.3em] text-white/40">Galeria Completa</h3>
                <div className="grid grid-cols-2 gap-4">
                  {property.images.slice(0, 4).map((src, i) => (
                    <button 
                      key={i} 
                      onClick={() => setActive(i)} 
                      className={`aspect-video rounded-2xl overflow-hidden ring-2 transition-all duration-500 ${i === active ? "ring-accent scale-95 shadow-[0_0_30px_rgba(234,179,8,0.3)]" : "ring-transparent opacity-40 hover:opacity-100 hover:scale-105"}`}
                    >
                      <img src={src} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                  {property.images.length > 4 && (
                    <button className="aspect-video rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center font-black text-xs uppercase tracking-widest text-white/60 hover:bg-white/10 transition-all">
                      +{property.images.length - 4} Fotos
                    </button>
                  )}
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
    </Dialog>
  );
}
