import { useRef, useState } from "react";
import { GripVertical, Star, Trash2, Upload, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  images: string[];
  coverIndex: number;
  onChange: (images: string[], coverIndex: number) => void;
};

export function ImageEditor({ images, coverIndex, onChange }: Props) {
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const filesToDataUrls = (files: FileList) => Promise.all(
    Array.from(files).map((f) => new Promise<string>((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(String(r.result));
      r.onerror = rej;
      r.readAsDataURL(f);
    }))
  );

  const handleUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    const urls = await filesToDataUrls(files);
    onChange([...images, ...urls], coverIndex);
  };

  const remove = (i: number) => {
    const next = images.filter((_, idx) => idx !== i);
    let cover = coverIndex;
    if (i === cover) cover = 0;
    else if (i < cover) cover = Math.max(0, cover - 1);
    onChange(next, cover);
  };

  const setCover = (i: number) => onChange(images, i);

  const reorder = (from: number, to: number) => {
    if (from === to) return;
    const next = [...images];
    const [m] = next.splice(from, 1);
    next.splice(to, 0, m);
    let cover = coverIndex;
    if (coverIndex === from) cover = to;
    else if (from < coverIndex && to >= coverIndex) cover = coverIndex - 1;
    else if (from > coverIndex && to <= coverIndex) cover = coverIndex + 1;
    onChange(next, cover);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{images.length} imagem(ns) — arraste para reordenar, clique na ⭐ para definir capa.</p>
        <Button type="button" variant="outline" size="sm" onClick={() => fileInput.current?.click()} className="rounded-xl">
          <Upload className="h-4 w-4" /> Adicionar
        </Button>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleUpload(e.target.files)}
        />
      </div>

      {images.length === 0 ? (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); handleUpload(e.dataTransfer.files); }}
          onClick={() => fileInput.current?.click()}
          className="glass rounded-2xl border-2 border-dashed border-glass-border p-10 text-center cursor-pointer hover:bg-accent/30 transition-smooth"
        >
          <ImageIcon className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Arraste imagens aqui ou clique para enviar</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {images.map((src, i) => (
            <div
              key={i + src.slice(0, 30)}
              draggable
              onDragStart={() => setDragIdx(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => { if (dragIdx !== null) reorder(dragIdx, i); setDragIdx(null); }}
              className={cn(
                "group relative aspect-square rounded-xl overflow-hidden glass border border-glass-border",
                dragIdx === i && "opacity-50",
                i === coverIndex && "ring-2 ring-primary"
              )}
            >
              <img src={src} alt={`Imóvel ${i + 1}`} className="w-full h-full object-cover" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-smooth" />
              <div className="absolute top-1 left-1 bg-background/70 backdrop-blur rounded-md p-1 cursor-grab">
                <GripVertical className="h-3.5 w-3.5" />
              </div>
              <div className="absolute bottom-1 left-1 right-1 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-smooth">
                <Button type="button" size="icon" variant="secondary" className="h-7 w-7 rounded-md" onClick={() => setCover(i)} title="Definir como capa">
                  <Star className={cn("h-3.5 w-3.5", i === coverIndex && "fill-primary text-primary")} />
                </Button>
                <Button type="button" size="icon" variant="destructive" className="h-7 w-7 rounded-md" onClick={() => remove(i)} title="Remover">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              {i === coverIndex && (
                <span className="absolute top-1 right-1 bg-primary text-primary-foreground text-[10px] font-medium px-1.5 py-0.5 rounded">Capa</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
