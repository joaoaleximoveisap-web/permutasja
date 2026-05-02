import { Property } from "@/lib/types";
import { formatBRL } from "@/lib/property-utils";
import { Bed, Maximize2, MapPin, Repeat2 } from "lucide-react";

export function PropertyCard({ property, onClick }: { property: Property; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group text-left relative flex flex-col w-full overflow-hidden rounded-3xl bg-white border border-border/50 hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-sm"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden">
        <img
          src={property.images[0]}
          alt={property.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-transparent to-transparent opacity-60" />
        
        {property.permuta.enabled && (
          <div className="absolute top-4 left-4 bg-accent/90 backdrop-blur-md text-white px-3 py-1 rounded-full text-[10px] font-bold shadow-lg flex items-center gap-1.5 uppercase tracking-wider">
            <Repeat2 className="h-3 w-3" /> Permuta
          </div>
        )}
        
        <div className="absolute bottom-4 left-4 right-4 text-white">
          <div className="text-2xl font-bold tracking-tight drop-shadow-sm">{formatBRL(property.price)}</div>
        </div>
      </div>
      
      <div className="p-5 space-y-3 w-full">
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-primary line-clamp-1 group-hover:text-accent transition-colors">
            {property.title}
          </h4>
          <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            <MapPin className="h-3 w-3 text-accent" />
            {property.neighborhood ? `${property.neighborhood}, ${property.city}` : property.city || "Localização não informada"}
          </div>
        </div>
        
        <div className="flex items-center justify-between pt-3 border-t border-border/50">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="p-1 rounded bg-muted">
                <Bed className="h-3 w-3 text-primary" />
              </div>
              <span className="text-xs font-bold">{property.bedrooms}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="p-1 rounded bg-muted">
                <Maximize2 className="h-3 w-3 text-primary" />
              </div>
              <span className="text-xs font-bold">{property.area}m²</span>
            </div>
          </div>
          <span className="text-[10px] font-bold text-muted-foreground/60 uppercase">{property.type}</span>
        </div>
      </div>
    </button>
  );
}
