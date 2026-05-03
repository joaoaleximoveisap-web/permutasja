import { useMemo, useState, useCallback } from "react";
import { AppShell } from "@/components/AppShell";
import { ImportBar } from "@/components/ImportBar";
import { PropertyCard } from "@/components/PropertyCard";
import { PropertyDetail } from "@/components/PropertyDetail";
import { AddPropertyDialog } from "@/components/AddPropertyDialog";
import { BulkImportModal } from "@/components/BulkImport/BulkImportModal";
import { FilterPanel, defaultFilters, Filters } from "@/components/FilterPanel";
import { useProperties } from "@/contexts/PropertiesContext";
import { Property } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Search, SlidersHorizontal, Building2, Trash2, CheckSquare, Square, X } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function Properties() {
  const { properties, removeProperty } = useProperties();
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Property | null>(null);
  const [open, setOpen] = useState(false);
  
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds(cur => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(p => p.id)));
    }
  }, [filtered, selectedIds]);

  const deleteSelected = useCallback(() => {
    if (selectedIds.size === 0) return;
    
    if (window.confirm(`Deseja realmente excluir ${selectedIds.size} imóveis?`)) {
      selectedIds.forEach(id => removeProperty(id));
      toast.success(`${selectedIds.size} imóveis removidos com sucesso.`);
      setSelectedIds(new Set());
      setSelectionMode(false);
    }
  }, [selectedIds, removeProperty]);

  const handleDeleteSingle = useCallback((id: string) => {
    if (window.confirm("Deseja realmente excluir este imóvel?")) {
      removeProperty(id);
      toast.success("Imóvel removido com sucesso.");
    }
  }, [removeProperty]);

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto space-y-5">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
          <div>
            <h1 className="text-3xl md:text-4xl font-semibold">Imóveis</h1>
            <p className="text-sm text-muted-foreground">{filtered.length} de {properties.length} na sua carteira</p>
          </div>
          <div className="flex gap-2">
            {!selectionMode ? (
              <>
                <Button 
                  variant="outline" 
                  className="bg-white border border-border rounded-xl gap-2 shadow-sm"
                  onClick={() => setSelectionMode(true)}
                >
                  <CheckSquare className="h-4 w-4" /> Selecionar
                </Button>
                <BulkImportModal />
                <AddPropertyDialog />
              </>
            ) : (
              <>
                <Button 
                  variant="outline" 
                  className="glass rounded-xl gap-2"
                  onClick={selectAll}
                >
                  {selectedIds.size === filtered.length ? <Square className="h-4 w-4" /> : <CheckSquare className="h-4 w-4" />}
                  {selectedIds.size === filtered.length ? "Desmarcar todos" : "Selecionar todos"}
                </Button>
                <Button 
                  variant="destructive" 
                  className="rounded-xl gap-2"
                  onClick={deleteSelected}
                  disabled={selectedIds.size === 0}
                >
                  <Trash2 className="h-4 w-4" /> Excluir ({selectedIds.size})
                </Button>
                <Button 
                  variant="ghost" 
                  className="rounded-xl"
                  onClick={() => {
                    setSelectionMode(false);
                    setSelectedIds(new Set());
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>

        <ImportBar />

        <div className="flex flex-col md:flex-row gap-4">
          <aside className="hidden lg:block w-72 shrink-0">
            <FilterPanel filters={filters} setFilters={setFilters} />
          </aside>

          <div className="flex-1 space-y-4 min-w-0">
            <div className="flex gap-2">
              <div className="bg-white border border-border rounded-xl flex items-center gap-2 px-3 flex-1 shadow-sm">
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
                  <Button variant="outline" className="lg:hidden bg-white border border-border rounded-xl">
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
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filtered.map(p => (
                  <PropertyCard 
                    key={p.id} 
                    property={p} 
                    onClick={() => { setSelected(p); setOpen(true); }} 
                    onDelete={handleDeleteSingle}
                    selected={selectedIds.has(p.id)}
                    onSelect={toggleSelection}
                    selectionMode={selectionMode}
                  />
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