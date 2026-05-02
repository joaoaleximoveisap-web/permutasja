import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ImportBar } from "@/components/ImportBar";
import { PropertyCard } from "@/components/PropertyCard";
import { PropertyDetail } from "@/components/PropertyDetail";
import { AddPropertyDialog } from "@/components/AddPropertyDialog";
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
      <div className="max-w-[1400px] mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-4xl font-bold tracking-tight">Carteira de Imóveis</h1>
            <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
              {filtered.length} imóveis filtrados de {properties.length} totais
            </p>
          </div>
          <div className="flex items-center gap-3">
            <AddPropertyDialog />
          </div>
        </div>

        <div className="bg-primary rounded-[2rem] p-6 md:p-8 shadow-2xl shadow-primary/10">
          <div className="max-w-3xl">
            <h2 className="text-white text-lg font-bold mb-4 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-accent" /> Importação Rápida via Link
            </h2>
            <ImportBar />
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          <aside className="hidden lg:block w-72 shrink-0">
            <div className="sticky top-28 bg-white border border-border/50 rounded-3xl p-6 shadow-sm">
              <FilterPanel filters={filters} setFilters={setFilters} />
            </div>
          </aside>

          <div className="flex-1 space-y-6 min-w-0">
            <div className="flex gap-3">
              <div className="bg-white border border-border/50 rounded-2xl flex items-center gap-3 px-4 flex-1 shadow-sm focus-within:ring-2 focus-within:ring-primary/10 transition-all">
                <Search className="h-5 w-5 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Busque por código, bairro, tipo ou palavras-chave..."
                  className="border-0 bg-transparent focus-visible:ring-0 px-0 h-12 text-sm font-medium"
                />
              </div>
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" className="lg:hidden h-12 w-12 rounded-2xl border-border/50 bg-white shadow-sm">
                    <SlidersHorizontal className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[320px] sm:w-[400px]">
                  <div className="py-6">
                    <FilterPanel filters={filters} setFilters={setFilters} />
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            {filtered.length === 0 ? (
              <div className="bg-muted/30 rounded-[2rem] border-2 border-dashed border-border p-20 text-center">
                <div className="h-16 w-16 rounded-2xl bg-white shadow-xl mx-auto flex items-center justify-center mb-6">
                  <Building2 className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-bold mb-2">Sem resultados para os filtros atuais</h3>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto font-medium">
                  Tente remover alguns filtros ou busque por um termo diferente.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
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
