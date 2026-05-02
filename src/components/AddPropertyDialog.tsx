import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus, X, Upload } from "lucide-react";
import { useProperties } from "@/contexts/PropertiesContext";
import { buildNormalized, uid } from "@/lib/property-utils";
import { toast } from "sonner";

export function AddPropertyDialog() {
  const { addProperty } = useProperties();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "", price: "", area: "", bedrooms: "", description: "",
    city: "", neighborhood: "", type: "Apartamento",
    permutaEnabled: false, permutaDetails: "",
  });
  const [images, setImages] = useState<string[]>([]);

  const update = (k: keyof typeof form, v: any) => setForm(s => ({ ...s, [k]: v }));

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach(f => {
      const reader = new FileReader();
      reader.onload = () => setImages(cur => [...cur, reader.result as string]);
      reader.readAsDataURL(f);
    });
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.price) { toast.error("Título e preço são obrigatórios"); return; }
    const tags = [form.type.toLowerCase(), `${form.bedrooms || 0} quartos`].filter(Boolean);
    if (form.neighborhood) tags.push(form.neighborhood.toLowerCase());
    const base = {
      title: form.title,
      price: Number(form.price) || 0,
      area: Number(form.area) || 0,
      bedrooms: Number(form.bedrooms) || 0,
      description: form.description,
      images: images.length ? images : ["https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=1280"],
      city: form.city, neighborhood: form.neighborhood, type: form.type,
      tags,
      permuta: { enabled: form.permutaEnabled, details: form.permutaDetails },
    };
    addProperty({
      id: uid(),
      ...base,
      normalized: buildNormalized(base as any),
      createdAt: Date.now(),
      origin: "manual",
      status: "published",
    });
    toast.success("Imóvel adicionado!");
    setOpen(false);
    setForm({ title: "", price: "", area: "", bedrooms: "", description: "", city: "", neighborhood: "", type: "Apartamento", permutaEnabled: false, permutaDetails: "" });
    setImages([]);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="glass rounded-xl">
          <Plus className="h-4 w-4" /> Adicionar manualmente
        </Button>
      </DialogTrigger>
      <DialogContent className="glass-strong border-glass-border rounded-2xl max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo imóvel</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <Label>Título</Label>
              <Input value={form.title} onChange={e => update("title", e.target.value)} required />
            </div>
            <div>
              <Label>Preço (R$)</Label>
              <Input type="number" value={form.price} onChange={e => update("price", e.target.value)} required />
            </div>
            <div>
              <Label>Área (m²)</Label>
              <Input type="number" value={form.area} onChange={e => update("area", e.target.value)} />
            </div>
            <div>
              <Label>Quartos</Label>
              <Input type="number" value={form.bedrooms} onChange={e => update("bedrooms", e.target.value)} />
            </div>
            <div>
              <Label>Tipo</Label>
              <Input value={form.type} onChange={e => update("type", e.target.value)} />
            </div>
            <div>
              <Label>Cidade</Label>
              <Input value={form.city} onChange={e => update("city", e.target.value)} />
            </div>
            <div>
              <Label>Bairro</Label>
              <Input value={form.neighborhood} onChange={e => update("neighborhood", e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Label>Descrição</Label>
              <Textarea rows={4} value={form.description} onChange={e => update("description", e.target.value)} />
            </div>

            <div className="sm:col-span-2 glass rounded-xl p-3">
              <div className="flex items-center justify-between">
                <Label className="cursor-pointer">Aceita permuta?</Label>
                <Switch checked={form.permutaEnabled} onCheckedChange={(v) => update("permutaEnabled", v)} />
              </div>
              {form.permutaEnabled && (
                <Textarea
                  className="mt-2"
                  rows={2}
                  placeholder="Detalhes da permuta (ex: aceita carro, imóvel de menor valor...)"
                  value={form.permutaDetails}
                  onChange={e => update("permutaDetails", e.target.value)}
                />
              )}
            </div>

            <div className="sm:col-span-2">
              <Label>Imagens</Label>
              <label className="mt-1 flex items-center gap-2 glass rounded-xl px-3 py-3 cursor-pointer hover:bg-sidebar-accent transition-smooth">
                <Upload className="h-4 w-4" />
                <span className="text-sm text-muted-foreground">Clique para enviar fotos</span>
                <input type="file" accept="image/*" multiple className="hidden" onChange={e => handleFiles(e.target.files)} />
              </label>
              {images.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {images.map((src, i) => (
                    <div key={i} className="relative h-16 w-20 rounded-lg overflow-hidden">
                      <img src={src} alt="" className="h-full w-full object-cover" />
                      <button type="button" onClick={() => setImages(c => c.filter((_, k) => k !== i))} className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full p-0.5">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" className="bg-gradient-primary text-primary-foreground rounded-xl">Salvar imóvel</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
