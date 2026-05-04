import { Property } from "@/lib/types";
import { formatBRL } from "@/lib/property-utils";
import { Bed, Maximize2, MapPin, Repeat2, Trash2, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function PropertyCard({ 
  property, 
  onClick, 
  onDelete,
  selected = false,
  onSelect,
  selectionMode = false
}: { 
  property: Property; 
  onClick: () => void;
  onDelete?: (id: string) => void;
  selected?: boolean;
  onSelect?: (id: string) => void;
  selectionMode?: boolean;
}) {
  return (
    <div className="group relative">
      <button
        onClick={selectionMode && onSelect ? () => onSelect(property.id) : onClick}
        className={cn(
          "w-full text-left relative overflow-hidden rounded-2xl bg-card transition-smooth hover:scale-[1.02] hover:shadow-elevated focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          selected && "ring-2 ring-accent"
        )}
      >
        {/* aspect-ratio fixa proporção sem CLS; em mobile o card respira (4/5), em md+ vira widescreen elegante (16/10). */}
        <div className="relative w-full aspect-[4/5] sm:aspect-[16/10] overflow-hidden">
          <img
            src={property.images[0]}
            alt={property.title}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition-smooth group-hover:scale-105"
          />
          {/* Overlay escuro para legibilidade — mais forte no mobile (sem hover) */}
          <div className="absolute inset-0 bg-black/40 md:group-hover:bg-black/20 transition-colors duration-500" />
          {/* Gradiente fixo no mobile (info sempre visível); só aparece no hover em desktop */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-500" />

          
          {selectionMode && (
            <div className={cn(
              "absolute top-5 right-5 h-7 w-7 rounded-full border-2 border-white/50 flex items-center justify-center transition-colors z-20",
              selected ? "bg-accent border-accent" : "bg-black/40 backdrop-blur-md"
            )}>
              {selected && <Check className="h-5 w-5 text-white" />}
            </div>
          )}

          <div className="absolute top-5 left-5 flex flex-wrap gap-2 z-10">
            {property.isExclusive && (
              <div className="bg-accent text-white rounded-lg px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.2em] shadow-lg">
                Exclusive
              </div>
            )}
            {property.permuta.enabled && (
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.2em] text-white">
                Permuta
              </div>
            )}
          </div>

          {/* Info sempre visível em mobile (touch não tem hover); animada apenas em desktop. Tipografia fluida via clamp(). */}
          <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 text-white md:transform md:translate-y-4 md:group-hover:translate-y-0 transition-all duration-500 md:opacity-0 md:group-hover:opacity-100">
            <div
              className="font-bold tracking-tighter mb-1 leading-tight"
              style={{ fontSize: "clamp(1.25rem, 4.5vw, 1.875rem)" }}
            >
              {formatBRL(property.price)}
            </div>
            <div className="text-xs sm:text-sm font-medium line-clamp-1 opacity-80 mb-2 sm:mb-3">{property.title}</div>
            <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-[10px] font-bold uppercase tracking-widest text-accent">
              <span className="flex items-center gap-1 min-w-0"><MapPin className="h-3 w-3 shrink-0" /><span className="truncate">{property.neighborhood}</span></span>
              <span className="opacity-60">•</span>
              <span>{property.bedrooms} beds</span>
              <span className="opacity-60">•</span>
              <span>{property.area}m²</span>
            </div>
          </div>
        </div>
      </button>

      {!selectionMode && onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(property.id);
          }}
          aria-label="Excluir imóvel"
          className="absolute top-3 right-3 min-h-[44px] min-w-[44px] grid place-items-center rounded-xl bg-destructive/80 text-destructive-foreground md:opacity-0 md:group-hover:opacity-100 transition-opacity hover:bg-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}