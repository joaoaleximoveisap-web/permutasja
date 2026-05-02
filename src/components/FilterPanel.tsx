import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { formatBRL } from "@/lib/property-utils";

export type Filters = {
  priceRange: [number, number];
  minBedrooms: number;
  areaRange: [number, number];
  onlyPermuta: boolean;
};

export const defaultFilters: Filters = {
  priceRange: [0, 10_000_000],
  minBedrooms: 0,
  areaRange: [0, 1000],
  onlyPermuta: false,
};

export function FilterPanel({ filters, setFilters }: { filters: Filters; setFilters: (f: Filters) => void }) {
  return (
    <div className="glass-strong rounded-2xl p-4 space-y-5">
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Preço</Label>
          <span className="text-xs text-muted-foreground">{formatBRL(filters.priceRange[0])} – {formatBRL(filters.priceRange[1])}</span>
        </div>
        <Slider
          min={0} max={10_000_000} step={50000}
          value={filters.priceRange}
          onValueChange={(v) => setFilters({ ...filters, priceRange: [v[0], v[1]] as [number, number] })}
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Área (m²)</Label>
          <span className="text-xs text-muted-foreground">{filters.areaRange[0]} – {filters.areaRange[1]} m²</span>
        </div>
        <Slider
          min={0} max={1000} step={10}
          value={filters.areaRange}
          onValueChange={(v) => setFilters({ ...filters, areaRange: [v[0], v[1]] as [number, number] })}
        />
      </div>

      <div>
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Quartos mínimos</Label>
        <div className="mt-2 flex gap-2">
          {[0, 1, 2, 3, 4].map(n => (
            <button
              key={n}
              onClick={() => setFilters({ ...filters, minBedrooms: n })}
              className={`flex-1 rounded-xl px-2 py-2 text-sm transition-smooth glass
                ${filters.minBedrooms === n ? "bg-gradient-primary text-primary-foreground" : "hover:bg-sidebar-accent"}`}
            >
              {n === 0 ? "Todos" : `${n}+`}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between glass rounded-xl px-3 py-2">
        <Label className="cursor-pointer">Apenas com permuta</Label>
        <Switch checked={filters.onlyPermuta} onCheckedChange={(v) => setFilters({ ...filters, onlyPermuta: v })} />
      </div>
    </div>
  );
}