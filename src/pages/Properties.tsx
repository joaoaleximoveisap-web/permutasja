import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ImportBar } from "@/components/ImportBar";
import { PropertyCard } from "@/components/PropertyCard";
import { PropertyDetail } from "@/components/PropertyDetail";
import { AddPropertyDialog } from "@/components/AddPropertyDialog";
import { BulkImportDialog } from "@/components/BulkImportDialog";
import { FilterPanel, defaultFilters, Filters } from "@/components/FilterPanel";
import { useProperties } from "@/contexts/PropertiesContext";
import { Property } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Search, SlidersHorizontal, Building2, Sparkles } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

export default function Properties() {
  const { properties } = useProperties();
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Property | null>(null);
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return properties.filter(p => {
      if (p.price < filters.priceRange[0] || p.price > filters.priceRange[1]) return false;
      if (p.area < filters.areaRange[0] || p.area > filters.areaRange[1]) return false;
      if (filters.minBedrooms > 0 && p.bedrooms < filters.minBedrooms) return false;
      if (filters.onlyPermuta && !p.permuta.enabled) return false;
      if (q) {
        const hay = `${p.normalized.titleLower} ${p.normalized.descriptionLower} ${p.tags.join(" ")}`;
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [properties, filters, query]);

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto space-y-5">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
          <div>
            <h1 className="text-3xl md:text-4xl font-semibold">Imóveis</h1>
            <p className="text-sm text-muted-foreground">{filtered.length} de {properties.length} na sua carteira</p>
          </div>
          <div className="flex gap-2">
            <BulkImportDialog />
            <AddPropertyDialog />
          </div>
        </div>

        <ImportBar />

        <div className="flex flex-col md:flex-row gap-4">
          <aside className="hidden lg:block w-72 shrink-0">
            <FilterPanel filters={filters} setFilters={setFilters} />
          </aside>

          <div className="flex-1 space-y-4 min-w-0">
            <div className="flex gap-2">
              <div className="glass rounded-xl flex items-center gap-2 px-3 flex-1">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar por título, bairro, tag..."
                  className="border-0 bg-transparent focus-visible:ring-0 px-0"
                />
              </div>
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" className="lg:hidden glass rounded-xl">
                    <SlidersHorizontal className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="glass-strong border-glass-border">
                  <FilterPanel filters={filters} setFilters={setFilters} />
                </SheetContent>
              </Sheet>
            </div>

            {filtered.length === 0 ? (
              <div className="glass-strong rounded-3xl p-10 text-center">
                <Building2 className="h-10 w-10 mx-auto text-muted-foreground" />
                <p className="mt-3 font-medium">Nenhum imóvel encontrado</p>
                <p className="text-sm text-muted-foreground mt-1">Ajuste os filtros ou importe um novo link acima.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filtered.map(p => (
                  <PropertyCard key={p.id} property={p} onClick={() => { setSelected(p); setOpen(true); }} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <PropertyDetail property={selected} open={open} onOpenChange={setOpen} />
    </AppShell>
  );
}
