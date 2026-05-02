import { Property } from "@/lib/types";
import { formatBRL } from "@/lib/property-utils";
import { Bed, Maximize2, MapPin, Repeat2 } from "lucide-react";

export function PropertyCard({ property, onClick }: { property: Property; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group text-left relative overflow-hidden rounded-2xl glass-strong transition-smooth hover:scale-[1.02] hover:shadow-elevated focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={property.images[0]}
          alt={property.title}
          loading="lazy"
          className="h-full w-full object-cover transition-smooth group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
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
  );
}
