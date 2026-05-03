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
          "w-full text-left relative overflow-hidden rounded-2xl glass-strong transition-smooth hover:scale-[1.02] hover:shadow-elevated focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          selected && "ring-2 ring-accent"
        )}
      >
        <div className="relative aspect-[16/9] overflow-hidden">
          <img
            src={property.images[0]}
            alt={property.title}
            loading="lazy"
            className="h-full w-full object-cover transition-smooth group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
          
          {selectionMode && (
            <div className={cn(
              "absolute top-3 right-3 h-6 w-6 rounded-full border-2 border-white/50 flex items-center justify-center transition-colors z-20",
              selected ? "bg-accent border-accent" : "bg-black/40 backdrop-blur-md"
            )}>
              {selected && <Check className="h-4 w-4 text-white" />}
            </div>
          )}

          <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 z-10">
            {property.permuta.enabled && (
              <div className="glass-strong bg-black/40 backdrop-blur-md border-white/10 rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 text-white">
                <Repeat2 className="h-3 w-3" /> Permuta
              </div>
            )}
            {property.price > 1500000 && (
              <div className="bg-accent/80 backdrop-blur-md rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                Exclusivo
              </div>
            )}
          </div>

          <div className="absolute bottom-4 left-4 right-4 text-white space-y-0.5">
            <div className="text-2xl font-bold tracking-tight">{formatBRL(property.price)}</div>
            <div className="text-sm font-medium line-clamp-1 opacity-95 group-hover:opacity-100 transition-opacity">
              {property.title}
            </div>
            <div className="flex items-center gap-3 pt-2 text-xs font-medium opacity-80 group-hover:opacity-100 transition-opacity">
              <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-accent" />{property.neighborhood ?? "—"}</span>
              <span className="flex items-center gap-1"><Bed className="h-3.5 w-3.5 text-accent" />{property.bedrooms} qtos</span>
              <span className="flex items-center gap-1"><Maximize2 className="h-3.5 w-3.5 text-accent" />{property.area}m²</span>
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
          className="absolute top-3 right-3 p-2 rounded-xl bg-destructive/80 text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}