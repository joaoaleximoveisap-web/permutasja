import { Property } from "@/lib/types";
import { formatBRL } from "@/lib/property-utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Bed, Maximize2, MapPin, Repeat2, Tag, ExternalLink, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProperties } from "@/contexts/PropertiesContext";
import { useState } from "react";

export function PropertyDetail({ property, open, onOpenChange }: { property: Property | null; open: boolean; onOpenChange: (v: boolean) => void; }) {
  const { removeProperty } = useProperties();
  const [active, setActive] = useState(0);
  if (!property) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl glass-strong border-glass-border rounded-2xl p-0 overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="grid md:grid-cols-2">
          <div className="relative bg-black">
            <img src={property.images[active]} alt={property.title} className="w-full h-72 md:h-full object-cover" />
            {property.permuta.enabled && (
              <div className="absolute top-3 left-3 glass rounded-full px-2.5 py-1 text-xs flex items-center gap-1">
                <Repeat2 className="h-3 w-3" /> Permuta
              </div>
            )}
            <div className="absolute bottom-3 left-3 right-3 flex gap-2 overflow-x-auto">
              {property.images.map((src, i) => (
                <button key={i} onClick={() => setActive(i)} className={`h-14 w-20 rounded-lg overflow-hidden ring-2 transition-smooth ${i === active ? "ring-accent" : "ring-transparent opacity-70"}`}>
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

            <div className="flex gap-2 pt-2">
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
      </DialogContent>
    </Dialog>
  );
}
