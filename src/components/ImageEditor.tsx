import { useEffect, useRef, useState } from "react";
import {
  GripVertical,
  Star,
  Trash2,
  Upload,
  Image as ImageIcon,
  Maximize2,
  X,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { inspectImage, subtleSharpen, type ImageQuality } from "@/lib/image-quality";

type Props = {
  images: string[];
  coverIndex: number;
  onChange: (images: string[], coverIndex: number) => void;
};

export function ImageEditor({ images, coverIndex, onChange }: Props) {
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [quality, setQuality] = useState<Record<number, ImageQuality | null>>({});
  const [sharpenEnabled, setSharpenEnabled] = useState(false);
  const [sharpenedMap, setSharpenedMap] = useState<Record<string, string>>({});
  const [viewerIdx, setViewerIdx] = useState<number | null>(null);

  // Detect quality for each image
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const next: Record<number, ImageQuality | null> = {};
      await Promise.all(
        images.map(async (src, i) => {
          next[i] = await inspectImage(src);
        })
      );
      if (!cancelled) setQuality(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [images]);

  // Apply subtle sharpen lazily when toggle is on (Module 12 — realistic only)
  useEffect(() => {
    if (!sharpenEnabled) return;
    let cancelled = false;
    (async () => {
      const updates: Record<string, string> = {};
      for (const src of images) {
        if (sharpenedMap[src]) continue;
        const out = await subtleSharpen(src, 0.22);
        if (out) updates[src] = out;
      }
      if (!cancelled && Object.keys(updates).length) {
        setSharpenedMap((p) => ({ ...p, ...updates }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sharpenEnabled, images, sharpenedMap]);

  const displaySrc = (src: string) =>
    sharpenEnabled && sharpenedMap[src] ? sharpenedMap[src] : src;

  const filesToDataUrls = (files: FileList) =>
    Promise.all(
      Array.from(files).map(
        (f) =>
          new Promise<string>((res, rej) => {
            const r = new FileReader();
            r.onload = () => res(String(r.result));
            r.onerror = rej;
            r.readAsDataURL(f);
          })
      )
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

  const lowQualityCount = Object.values(quality).filter((q) => q?.tier === "low").length;

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/30 p-4 rounded-2xl border border-border/50">
        <div>
          <h4 className="font-semibold text-sm flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-primary" /> Galeria de Fotos
          </h4>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            {images.length} imagem(ns) — arraste para reordenar, ⭐ define a capa.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Switch id="sharpen" checked={sharpenEnabled} onCheckedChange={setSharpenEnabled} />
            <Label htmlFor="sharpen" className="text-xs cursor-pointer flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5" /> Melhorar nitidez
            </Label>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInput.current?.click()}
            className="rounded-xl"
          >
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
      </div>

      {sharpenEnabled && (
        <p className="text-[11px] text-muted-foreground -mt-1">
          Melhoria leve de qualidade sem alteração visual. Cores, luz e enquadramento são preservados.
        </p>
      )}

      {lowQualityCount > 0 && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs">
          <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
          <span>
            {lowQualityCount} imagem(ns) com baixa resolução. Considere substituir por versões em alta qualidade.
          </span>
        </div>
      )}

      {images.length === 0 ? (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            handleUpload(e.dataTransfer.files);
          }}
          onClick={() => fileInput.current?.click()}
          className="glass rounded-2xl border-2 border-dashed border-glass-border p-10 text-center cursor-pointer hover:bg-accent/30 transition-smooth"
        >
          <ImageIcon className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Arraste imagens aqui ou clique para enviar
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {images.map((src, i) => {
            // Skip non-URL values
            if (!src || !src.startsWith('http')) {
              console.warn('Invalid image URL at index', i, ':', src);
              return null;
            }

            const q = quality[i];
            const tier = q?.tier;
            return (
              <div
                key={i + src.slice(0, 30)}
                draggable
                onDragStart={() => setDragIdx(i)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (dragIdx !== null) reorder(dragIdx, i);
                  setDragIdx(null);
                }}
                className={cn(
                  "group relative aspect-video rounded-xl overflow-hidden glass border border-glass-border cursor-grab active:cursor-grabbing",
                  dragIdx === i && "opacity-50 scale-95",
                  i === coverIndex && "ring-2 ring-primary shadow-lg shadow-primary/20"
                )}
              >
                <img
                  src={src}
                  alt={`Foto ${i + 1}`}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    if (target.parentElement) {
                      target.parentElement.style.display = 'none';
                    }
                    console.warn('Image failed to load:', src);
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-smooth" />
                <div className="absolute top-1 left-1 bg-background/70 backdrop-blur rounded-md p-1 cursor-grab">
                  <GripVertical className="h-3.5 w-3.5" />
                </div>

                {tier && (
                  <span
                    className={cn(
                      "absolute top-1 right-1 text-[10px] font-medium px-1.5 py-0.5 rounded backdrop-blur",
                      tier === "high" && "bg-emerald-500/80 text-white",
                      tier === "medium" && "bg-amber-500/80 text-white",
                      tier === "low" && "bg-red-500/80 text-white"
                    )}
                    title={q ? `${q.width}×${q.height}px` : ""}
                  >
                    {tier === "high" ? "HD" : tier === "medium" ? "Média" : "Baixa"}
                  </span>
                )}

                {i === coverIndex && (
                  <span className="absolute bottom-1 right-1 bg-primary text-primary-foreground text-[10px] font-medium px-1.5 py-0.5 rounded">
                    Capa
                  </span>
                )}

                <div className="absolute bottom-1 left-1 right-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-smooth">
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    className="h-7 w-7 rounded-md"
                    onClick={() => setCover(i)}
                    title="Definir como capa"
                  >
                    <Star
                      className={cn(
                        "h-3.5 w-3.5",
                        i === coverIndex && "fill-primary text-primary"
                      )}
                    />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    className="h-7 w-7 rounded-md"
                    onClick={() => setViewerIdx(i)}
                    title="Ver em tela cheia"
                  >
                    <Maximize2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="destructive"
                    className="h-7 w-7 rounded-md ml-auto"
                    onClick={() => remove(i)}
                    title="Remover"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {images.length > 0 && images.every(img => !img || !img.startsWith('http')) && (
        <p className="text-center text-muted-foreground py-8 glass rounded-2xl border-2 border-dashed border-glass-border">
          Nenhuma imagem válida encontrada. Use o botão "Adicionar" para incluir manualmente.
        </p>
      )}

      {/* Fullscreen viewer */}
      {viewerIdx !== null && images[viewerIdx] && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-200"
          onClick={() => setViewerIdx(null)}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft" && viewerIdx > 0) setViewerIdx(viewerIdx - 1);
            if (e.key === "ArrowRight" && viewerIdx < images.length - 1) setViewerIdx(viewerIdx + 1);
            if (e.key === "Escape") setViewerIdx(null);
          }}
          tabIndex={0}
        >
          <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent pointer-events-none">
            <div className="text-white text-sm font-medium drop-shadow-md pointer-events-auto">
              {viewerIdx + 1} / {images.length}
              {quality[viewerIdx] && (
                <span className="ml-2 text-white/60">
                  • {quality[viewerIdx]!.width}×{quality[viewerIdx]!.height}px ({quality[viewerIdx]!.tier === 'high' ? 'HD' : quality[viewerIdx]!.tier === 'medium' ? 'MD' : 'SD'})
                </span>
              )}
            </div>
            <button
              className="text-white/80 hover:text-white p-2 hover:bg-white/10 rounded-full transition-colors pointer-events-auto"
              onClick={() => setViewerIdx(null)}
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="relative w-full h-full flex items-center justify-center">
            {viewerIdx > 0 && (
              <button
                className="absolute left-4 z-20 text-white/70 hover:text-white p-3 sm:p-4 hover:bg-white/10 rounded-full transition-all flex items-center justify-center bg-black/20 backdrop-blur-sm shadow-xl"
                onClick={(e) => {
                  e.stopPropagation();
                  setViewerIdx(viewerIdx - 1);
                }}
                aria-label="Foto anterior"
              >
                <ChevronLeft className="h-10 w-10 sm:h-12 sm:w-12" />
              </button>
            )}

            <div className="relative flex items-center justify-center w-full h-full p-4 sm:p-12">
              <img
                src={displaySrc(images[viewerIdx])}
                alt={`Imóvel ${viewerIdx + 1}`}
                className="max-w-full max-h-full object-contain rounded shadow-2xl transition-all duration-300 pointer-events-none"
              />
            </div>

            {viewerIdx < images.length - 1 && (
              <button
                className="absolute right-4 z-20 text-white/70 hover:text-white p-3 sm:p-4 hover:bg-white/10 rounded-full transition-all flex items-center justify-center bg-black/20 backdrop-blur-sm shadow-xl"
                onClick={(e) => {
                  e.stopPropagation();
                  setViewerIdx(viewerIdx + 1);
                }}
                aria-label="Próxima foto"
              >
                <ChevronRight className="h-10 w-10 sm:h-12 sm:w-12" />
              </button>
            )}
          </div>

          {/* Thumbnails strip for fast navigation */}
          <div 
            className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 p-2 bg-black/40 backdrop-blur rounded-2xl border border-white/10 max-w-[90vw] overflow-x-auto no-scrollbar"
            onClick={(e) => e.stopPropagation()}
          >
            {images.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setViewerIdx(idx)}
                className={cn(
                  "relative shrink-0 w-14 h-10 rounded-md overflow-hidden border-2 transition-all",
                  viewerIdx === idx ? "border-primary scale-110 shadow-lg" : "border-transparent opacity-50 hover:opacity-100"
                )}
              >
                <img src={img} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
