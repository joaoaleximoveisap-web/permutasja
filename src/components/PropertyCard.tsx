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
        <div className="relative h-[450px] overflow-hidden">
          <img
            src={property.images[0]}
            alt={property.title}
            loading="lazy"
            className="h-full w-full object-cover transition-smooth group-hover:scale-105"
          />
          {/* Automatic Dark Overlay for Legibility - rgba(0,0,0,0.4) as requested */}
          <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors duration-500" />
          {/* Gradient Overlay for bottom text */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

          
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

          <div className="absolute bottom-6 left-6 right-6 text-white transform translate-y-4 group-hover:translate-y-0 transition-all duration-500 opacity-0 group-hover:opacity-100">
            <div className="text-3xl font-bold tracking-tighter mb-1">{formatBRL(property.price)}</div>
            <div className="text-sm font-medium line-clamp-1 opacity-80 mb-3">{property.title}</div>
            <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-accent">
              <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{property.neighborhood}</span>
              <span>•</span>
              <span>{property.bedrooms} beds</span>
              <span>•</span>
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
          className="absolute top-3 right-3 p-2 rounded-xl bg-destructive/80 text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}