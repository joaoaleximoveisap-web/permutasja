import { Property } from "@/lib/types";
import { formatBRL } from "@/lib/property-utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Bed, Maximize2, MapPin, Repeat2, Tag, ExternalLink, Trash2, ChevronLeft, ChevronRight, Pencil } from "lucide-react";
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
      <DialogContent className="max-w-4xl glass-strong border-glass-border rounded-2xl p-0 overflow-hidden max-h-[90vh] overflow-y-auto z-50">
        <div className="grid md:grid-cols-2">
          <div className="relative bg-black h-72 md:h-auto flex items-center justify-center group">
            <img src={property.images[active]} alt={property.title} className="w-full h-full object-contain md:object-cover" />
            
            {/* Navegação por setas */}
            {property.images.length > 1 && (
              <>
                <button 
                  onClick={() => setActive(prev => (prev > 0 ? prev - 1 : property.images.length - 1))}
                  className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 text-white hover:bg-black/60 backdrop-blur-sm transition-all z-10 sm:opacity-0 sm:group-hover:opacity-100"
                  aria-label="Imagem anterior"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button 
                  onClick={() => setActive(prev => (prev < property.images.length - 1 ? prev + 1 : 0))}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 text-white hover:bg-black/60 backdrop-blur-sm transition-all z-10 sm:opacity-0 sm:group-hover:opacity-100"
                  aria-label="Próxima imagem"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}

            {property.permuta.enabled && (
              <div className="absolute top-3 left-3 glass rounded-full px-2.5 py-1 text-xs flex items-center gap-1 z-10">
                <Repeat2 className="h-3 w-3" /> Permuta
              </div>
            )}
            
            {/* Contador de imagens */}
            <div className="absolute top-3 right-3 bg-black/50 text-white text-[10px] px-2 py-0.5 rounded-full backdrop-blur-sm z-10">
              {active + 1} / {property.images.length}
            </div>

            {/* Miniaturas */}
            <div className="absolute bottom-3 left-3 right-3 flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {property.images.map((src, i) => (
                <button 
                  key={i} 
                  onClick={() => setActive(i)} 
                  className={`h-12 w-16 shrink-0 rounded-lg overflow-hidden ring-2 transition-smooth ${i === active ? "ring-accent" : "ring-transparent opacity-60 hover:opacity-100"}`}
                >
                  <img src={src} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          <div className="p-6 space-y-4">
            <DialogHeader>
              <DialogTitle className="text-2xl leading-tight">{property.title}</DialogTitle>
            </DialogHeader>
            <div className="text-3xl font-semibold text-gradient">{formatBRL(property.price)}</div>
            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{property.neighborhood}, {property.city}</span>
              <span className="flex items-center gap-1"><Bed className="h-4 w-4" />{property.bedrooms} quartos</span>
              <span className="flex items-center gap-1"><Maximize2 className="h-4 w-4" />{property.area} m²</span>
            </div>
            <p className="text-sm leading-relaxed text-foreground/85">{property.description}</p>

            {property.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {property.tags.map(t => (
                  <span key={t} className="glass rounded-full px-2.5 py-1 text-xs flex items-center gap-1">
                    <Tag className="h-3 w-3" />{t}
                  </span>
                ))}
              </div>
            )}

            {property.permuta.enabled && (
              <div className="glass rounded-xl p-3 text-sm">
                <div className="font-medium mb-1 flex items-center gap-1"><Repeat2 className="h-4 w-4" />Permuta</div>
                <p className="text-muted-foreground">{property.permuta.details || "Aceita permuta — entre em contato para detalhes."}</p>
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-2">
              <Button 
                onClick={() => setEditOpen(true)}
                className="rounded-xl glass border-primary/20 hover:bg-primary/10 text-primary"
                variant="outline"
              >
                <Pencil className="h-4 w-4" /> Editar informações
              </Button>

              {property.sourceUrl && (
                <Button asChild variant="outline" className="rounded-xl">
                  <a href={property.sourceUrl} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-4 w-4" /> Ver origem
                  </a>
                </Button>
              )}
              <Button
                variant="ghost"
                className="rounded-xl text-destructive hover:text-destructive"
                onClick={() => { removeProperty(property.id); onOpenChange(false); }}
              >
                <Trash2 className="h-4 w-4" /> Remover
              </Button>
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
