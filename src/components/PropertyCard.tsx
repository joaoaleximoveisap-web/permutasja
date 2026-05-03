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
        <div className="relative aspect-[4/3] overflow-hidden">
          <img
            src={property.images[0]}
            alt={property.title}
            loading="lazy"
            className="h-full w-full object-cover transition-smooth group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
          
          {selectionMode && (
            <div className={cn(
              "absolute top-3 right-3 h-6 w-6 rounded-full border-2 border-white/50 flex items-center justify-center transition-colors",
              selected ? "bg-accent border-accent" : "bg-black/20"
            )}>
              {selected && <Check className="h-4 w-4 text-white" />}
            </div>
          )}

          {property.permuta.enabled && (
            <div className="absolute top-3 left-3 glass rounded-full px-2.5 py-1 text-xs flex items-center gap-1 text-foreground">
              <Repeat2 className="h-3 w-3" /> Aceita permuta
            </div>
          )}
          <div className="absolute bottom-3 left-3 right-3 text-white">
            <div className="text-lg font-semibold drop-shadow">{formatBRL(property.price)}</div>
            <div className="text-xs opacity-90 line-clamp-1">{property.title}</div>
          </div>
        </div>
        <div className="p-3 flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{property.neighborhood ?? "—"}</span>
          <span className="flex items-center gap-1"><Bed className="h-3 w-3" />{property.bedrooms}</span>
          <span className="flex items-center gap-1"><Maximize2 className="h-3 w-3" />{property.area}m²</span>
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