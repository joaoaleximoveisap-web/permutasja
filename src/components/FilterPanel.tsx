import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { formatBRL } from "@/lib/property-utils";
import { DollarSign, Maximize2, Bed, Repeat2, SlidersHorizontal } from "lucide-react";

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
  const update = (k: keyof Filters, v: any) => setFilters({ ...filters, [k]: v });

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-2 pb-4 border-b border-border/50">
        <SlidersHorizontal className="h-5 w-5 text-primary" />
        <h3 className="font-bold text-primary tracking-tight">Filtros Avançados</h3>
      </div>

      <div className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-3.5 w-3.5 text-accent" /> Faixa de Preço
            </Label>
          </div>
          <Slider
            min={0}
            max={10_000_000}
            step={50000}
            value={filters.priceRange}
            onValueChange={(v) => update("priceRange", v as [number, number])}
            className="py-4"
          />
          <div className="flex justify-between text-[10px] font-bold text-primary">
            <span>{formatBRL(filters.priceRange[0])}</span>
            <span>{formatBRL(filters.priceRange[1])}</span>
          </div>
        </div>

        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Maximize2 className="h-3.5 w-3.5 text-accent" /> Área Útil (m²)
            </Label>
          </div>
          <Slider
            min={0}
            max={1000}
            step={10}
            value={filters.areaRange}
            onValueChange={(v) => update("areaRange", v as [number, number])}
            className="py-4"
          />
          <div className="flex justify-between text-[10px] font-bold text-primary">
            <span>{filters.areaRange[0]}m²</span>
            <span>{filters.areaRange[1]}m²</span>
          </div>
        </div>

        <div className="space-y-4 pt-2">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Bed className="h-3.5 w-3.5 text-accent" /> Mínimo de Quartos
          </Label>
          <div className="flex gap-2">
            {[0, 1, 2, 3, 4].map((n) => (
              <button
                key={n}
                onClick={() => update("minBedrooms", n)}
                className={`flex-1 h-10 rounded-xl text-xs font-bold transition-all border ${
                  filters.minBedrooms === n
                    ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/10"
                    : "bg-white text-muted-foreground border-border/50 hover:border-primary/30"
                }`}
              >
                {n === 0 ? "Todos" : `${n}+`}
              </button>
            ))}
          </div>
        </div>

        <div className="pt-6 border-t border-border/50">
          <div className="flex items-center justify-between bg-muted/30 p-4 rounded-2xl">
            <div className="space-y-0.5">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-2 cursor-pointer">
                <Repeat2 className="h-4 w-4 text-accent" /> Apenas Permuta
              </Label>
              <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-tighter">Imóveis que aceitam troca</p>
            </div>
            <Switch
              checked={filters.onlyPermuta}
              onCheckedChange={(v) => update("onlyPermuta", v)}
            />
          </div>
        </div>
      </div>

      <Button 
        variant="ghost" 
        className="w-full h-10 rounded-xl text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-destructive transition-colors mt-4"
        onClick={() => setFilters(defaultFilters)}
      >
        Limpar Filtros
      </Button>
    </div>
  );
}