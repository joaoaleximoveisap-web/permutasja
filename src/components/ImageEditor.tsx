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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {images.length} imagem(ns) — arraste para reordenar, ⭐ define a capa.
        </p>
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
                  src={displaySrc(src)}
                  alt={`Imóvel ${i + 1}`}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
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

      {/* Fullscreen viewer */}
      {viewerIdx !== null && images[viewerIdx] && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center animate-in fade-in"
          onClick={() => setViewerIdx(null)}
        >
          <button
            className="absolute top-4 right-4 text-white/80 hover:text-white p-2"
            onClick={(e) => {
              e.stopPropagation();
              setViewerIdx(null);
            }}
            aria-label="Fechar"
          >
            <X className="h-6 w-6" />
          </button>
          {viewerIdx > 0 && (
            <button
              className="absolute left-4 text-white/80 hover:text-white p-2"
              onClick={(e) => {
                e.stopPropagation();
                setViewerIdx((v) => (v! > 0 ? v! - 1 : v));
              }}
              aria-label="Anterior"
            >
              <ChevronLeft className="h-8 w-8" />
            </button>
          )}
          {viewerIdx < images.length - 1 && (
            <button
              className="absolute right-4 text-white/80 hover:text-white p-2"
              onClick={(e) => {
                e.stopPropagation();
                setViewerIdx((v) => (v! < images.length - 1 ? v! + 1 : v));
              }}
              aria-label="Próxima"
            >
              <ChevronRight className="h-8 w-8" />
            </button>
          )}
          <img
            src={images[viewerIdx]}
            alt={`Imóvel ${viewerIdx + 1}`}
            className="max-w-[92vw] max-h-[92vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <span className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/70 text-sm">
            {viewerIdx + 1} / {images.length}
            {quality[viewerIdx] && ` • ${quality[viewerIdx]!.width}×${quality[viewerIdx]!.height}px`}
          </span>
        </div>
      )}
    </div>
  );
}
