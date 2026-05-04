import { useEffect, useMemo, useRef, useState } from "react";
import { useLiveEdit, ElementOverride } from "@/contexts/LiveEditContext";
import { supabase } from "@/integrations/supabase/client";
import { getStableSelector, isInsideEditorUI } from "@/lib/dom-selector";
import { getContrastColor } from "@/lib/color-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Wand2, X, Type, Palette, Image as ImageIcon, Box, Trash2,
  AlignLeft, AlignCenter, AlignRight, Bold, AlertTriangle, Sparkles
} from "lucide-react";

const FONTS = [
  "Inter", "Playfair Display", "Poppins", "Roboto", "Montserrat",
  "Lato", "Oswald", "Raleway", "Nunito", "Merriweather",
  "Source Sans Pro", "DM Sans", "Manrope", "Cormorant Garamond"
];

function loadGoogleFont(family: string) {
  const id = `gf-${family.replace(/\s+/g, "-")}`;
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@300;400;500;600;700;800;900&display=swap`;
  document.head.appendChild(link);
}

export function LiveEditor() {
  const {
    active, setActive,
    selectedSelector, setSelectedSelector,
    overrides, updateOverride, removeOverride,
  } = useLiveEdit();

  const [hoverRect, setHoverRect] = useState<DOMRect | null>(null);
  const [selectedRect, setSelectedRect] = useState<DOMRect | null>(null);
  const lastHover = useRef<Element | null>(null);

  // Pre-load all Google fonts when active
  useEffect(() => {
    if (active) FONTS.forEach(loadGoogleFont);
  }, [active]);

  // Capture clicks + hover when active
  useEffect(() => {
    // Atalho de teclado: Alt + E para ativar
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === 'e') {
        setActive(!active);
      }
    };
    window.addEventListener("keydown", onKey);

    if (!active) {
      setHoverRect(null);
      setSelectedRect(null);
      return () => window.removeEventListener("keydown", onKey);
    }

    const onMove = (e: MouseEvent) => {
      const t = e.target as Element;
      if (!t || isInsideEditorUI(t)) {
        setHoverRect(null);
        return;
      }
      lastHover.current = t;
      setHoverRect(t.getBoundingClientRect());
    };

    const onClick = (e: MouseEvent) => {
      const t = e.target as Element;
      if (!t || isInsideEditorUI(t)) return;
      e.preventDefault();
      e.stopPropagation();
      const sel = getStableSelector(t);
      setSelectedSelector(sel);
      setSelectedRect(t.getBoundingClientRect());
    };

    document.addEventListener("mousemove", onMove, true);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("mousemove", onMove, true);
      document.removeEventListener("click", onClick, true);
    };
  }, [active, setSelectedSelector, setActive]);

  // Update selectedRect on resize/scroll
  useEffect(() => {
    if (!active || !selectedSelector) return;
    const update = () => {
      const el = document.querySelector(selectedSelector);
      if (el) setSelectedRect(el.getBoundingClientRect());
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    const i = setInterval(update, 500);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
      clearInterval(i);
    };
  }, [active, selectedSelector, overrides]);

  const current: ElementOverride = useMemo(
    () => (selectedSelector ? overrides[selectedSelector] || {} : {}),
    [selectedSelector, overrides]
  );

  // Read currently visible text for editing
  const liveTextInit = useMemo(() => {
    if (!selectedSelector) return "";
    if (current.text != null) return current.text;
    const el = document.querySelector(selectedSelector);
    return el?.textContent?.trim() || "";
  }, [selectedSelector, current.text]);

  const set = (patch: ElementOverride) => {
    if (!selectedSelector) return;
    updateOverride(selectedSelector, patch);
  };

  // Floating toggle button
  if (!active) {
    return (
      <button
        data-live-editor-ui
        onClick={() => setActive(true)}
        className="fixed top-20 right-4 z-[1000005] px-4 py-2 rounded-full bg-black text-[#C5A46D] border border-[#C5A46D]/50 shadow-xl flex items-center gap-2 hover:scale-105 transition-all group"
        title="Ativar Editor (Alt+E)"
      >
        <Wand2 className="h-4 w-4" />
        <span className="text-[10px] font-black uppercase tracking-widest">Editar Site</span>
      </button>
    );
  }

  // Contrast check
  const showContrastWarn = (() => {
    if (!current.color || !current.background) return false;
    try {
      const ideal = getContrastColor(current.background.startsWith("#") ? current.background : "#FFFFFF");
      return ideal.toLowerCase() !== current.color.toLowerCase();
    } catch {
      return false;
    }
  })();

  return (
    <>
      {/* Top bar — High Contrast */}
      <div
        data-live-editor-ui
        className="fixed top-0 left-0 right-0 z-[1000001] bg-[#C5A46D] text-black px-4 py-2 flex items-center justify-between shadow-2xl border-b border-black/20"
      >
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest italic">
          <Sparkles className="h-4 w-4 text-black fill-black" />
          Live Editor Ativo — Clique em algo para editar
        </div>
        <div className="flex items-center gap-3">
          {selectedSelector && (
            <div className="bg-black/10 px-3 py-1 rounded-full text-[10px] font-bold font-mono hidden md:block border border-black/10">
              ID: {selectedSelector.split('>').pop()?.trim()}
            </div>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-black font-black hover:bg-black/10 border border-black/20 px-4"
            onClick={() => {
              setActive(false);
              setSelectedSelector(null);
            }}
          >
            <X className="h-4 w-4 mr-2" /> SAIR DO EDITOR
          </Button>
        </div>
      </div>

      {/* Hover outline — High Contrast Magenta */}
      {hoverRect && !selectedRect && (
        <div
          data-live-editor-ui
          className="fixed pointer-events-none z-[1000000] border-[3px] border-[#FF00FF] bg-[#FF00FF]/10 transition-none"
          style={{
            top: hoverRect.top, left: hoverRect.left,
            width: hoverRect.width, height: hoverRect.height,
          }}
        >
          <div className="absolute top-0 left-0 bg-[#FF00FF] text-white text-[9px] font-bold px-1 uppercase leading-none">
            Click to edit
          </div>
        </div>
      )}

      {/* Selected outline — High Contrast Yellow */}
      {selectedRect && (
        <div
          data-live-editor-ui
          className="fixed pointer-events-none z-[1000000] border-[4px] border-[#FFFF00] shadow-[0_0_20px_rgba(255,255,0,0.8)] transition-none"
          style={{
            top: selectedRect.top, left: selectedRect.left,
            width: selectedRect.width, height: selectedRect.height,
          }}
        >
          <div className="absolute -top-4 -left-1 bg-[#FFFF00] text-black text-[10px] font-black px-2 uppercase shadow-md">
            Selecionado
          </div>
          {/* Resize handles visualization */}
          <div className="absolute top-0 left-0 w-2 h-2 bg-white border border-black -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute top-0 right-0 w-2 h-2 bg-white border border-black translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 left-0 w-2 h-2 bg-white border border-black -translate-x-1/2 translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-2 h-2 bg-white border border-black translate-x-1/2 translate-y-1/2" />
        </div>
      )}

      {/* Side panel */}
      {selectedSelector && (
        <aside
          data-live-editor-ui
          className="fixed top-12 right-2 bottom-2 w-[380px] z-[1000001] bg-white text-black border-2 border-black/20 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col rounded-2xl overflow-hidden animate-in slide-in-from-right duration-300"
        >
          <div className="p-4 border-b-2 border-black/5 flex items-center justify-between bg-black text-white">
            <div className="text-[11px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#C5A46D] fill-[#C5A46D]" /> Painel de Edição
            </div>
            <div className="flex gap-2">
              <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-white/20 text-white" onClick={() => removeOverride(selectedSelector)} title="Resetar Original">
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-white/20 text-white" onClick={() => setSelectedSelector(null)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          <Tabs defaultValue="text" className="flex-1 flex flex-col bg-white">
            <TabsList className="grid grid-cols-4 p-1 m-3 bg-black/5 rounded-xl border border-black/5">
              <TabsTrigger value="text" className="data-[state=active]:bg-black data-[state=active]:text-white rounded-lg transition-all"><Type className="h-4 w-4" /></TabsTrigger>
              <TabsTrigger value="color" className="data-[state=active]:bg-black data-[state=active]:text-white rounded-lg transition-all"><Palette className="h-4 w-4" /></TabsTrigger>
              <TabsTrigger value="image" className="data-[state=active]:bg-black data-[state=active]:text-white rounded-lg transition-all"><ImageIcon className="h-4 w-4" /></TabsTrigger>
              <TabsTrigger value="box" className="data-[state=active]:bg-black data-[state=active]:text-white rounded-lg transition-all"><Box className="h-4 w-4" /></TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1 px-4 pb-6">
              {/* TEXT */}
              <TabsContent value="text" className="mt-0 space-y-5">
                <Field label="Conteúdo">
                  <Textarea
                    key={selectedSelector}
                    defaultValue={liveTextInit}
                    onChange={(e) => set({ text: e.target.value })}
                    className="min-h-[80px] text-sm"
                  />
                </Field>
                <Field label="Fonte">
                  <select
                    value={current.fontFamily || ""}
                    onChange={(e) => { loadGoogleFont(e.target.value); set({ fontFamily: e.target.value }); }}
                    className="w-full h-9 rounded-md border bg-background px-2 text-sm"
                  >
                    <option value="">Padrão</option>
                    {FONTS.map((f) => <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>)}
                  </select>
                </Field>
                <SliderField label="Tamanho" value={current.fontSize ?? 16} min={8} max={160} onChange={(v) => set({ fontSize: v })} unit="px" />
                <SliderField label="Espaçamento de letra" value={current.letterSpacing ?? 0} min={-5} max={20} step={0.1} onChange={(v) => set({ letterSpacing: v })} unit="px" />
                <SliderField label="Altura de linha" value={current.lineHeight ?? 1.4} min={0.8} max={3} step={0.05} onChange={(v) => set({ lineHeight: v })} />
                <Field label="Peso">
                  <div className="flex gap-1">
                    {["300", "400", "500", "600", "700", "800"].map((w) => (
                      <Button key={w} size="sm" variant={current.fontWeight === w ? "default" : "outline"}
                        className="flex-1 h-8 text-[11px]" onClick={() => set({ fontWeight: w })}>
                        {w}
                      </Button>
                    ))}
                  </div>
                </Field>
                <Field label="Alinhamento">
                  <div className="flex gap-1">
                    {[
                      { v: "left", I: AlignLeft },
                      { v: "center", I: AlignCenter },
                      { v: "right", I: AlignRight },
                    ].map(({ v, I }) => (
                      <Button key={v} size="sm" variant={current.textAlign === v ? "default" : "outline"}
                        className="flex-1 h-8" onClick={() => set({ textAlign: v as any })}>
                        <I className="h-3.5 w-3.5" />
                      </Button>
                    ))}
                  </div>
                </Field>
              </TabsContent>

              {/* COLOR */}
              <TabsContent value="color" className="mt-0 space-y-5">
                <ColorField label="Cor do texto" value={current.color || "#000000"} onChange={(v) => set({ color: v })} />
                <ColorField label="Cor de fundo" value={current.background || "#ffffff"} onChange={(v) => set({ background: v })} />
                {showContrastWarn && (
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 space-y-2">
                    <div className="flex items-center gap-2 text-xs text-amber-700 font-medium">
                      <AlertTriangle className="h-3.5 w-3.5" /> Contraste baixo detectado
                    </div>
                    <Button size="sm" variant="outline" className="w-full h-7 text-[11px]"
                      onClick={() => set({ color: getContrastColor(current.background!) })}>
                      Corrigir automaticamente
                    </Button>
                  </div>
                )}
                <SliderField label="Opacidade" value={current.opacity ?? 1} min={0} max={1} step={0.05} onChange={(v) => set({ opacity: v })} />
              </TabsContent>

              {/* IMAGE / VIDEO */}
              <TabsContent value="image" className="mt-0 space-y-5">
                <Field label="URL da imagem">
                  <Input
                    placeholder="https://… (jpg, png, webp)"
                    defaultValue={current.imageUrl || ""}
                    onChange={(e) => set({ imageUrl: e.target.value, videoUrl: "" })}
                  />
                </Field>
                <Field label="URL do vídeo">
                  <Input
                    placeholder="https://… (mp4, webm)"
                    defaultValue={current.videoUrl || ""}
                    onChange={(e) => set({ videoUrl: e.target.value })}
                  />
                </Field>
                <Field label="Upload de arquivo (imagem ou vídeo)">
                  <UploadButton
                    onUploaded={(url, isVideo) => {
                      if (isVideo) set({ videoUrl: url });
                      else set({ imageUrl: url, videoUrl: "" });
                    }}
                  />
                </Field>
                {current.videoUrl && (
                  <Button size="sm" variant="outline" className="w-full" onClick={() => set({ videoUrl: "" })}>
                    Remover vídeo
                  </Button>
                )}
              </TabsContent>

              {/* BOX */}
              <TabsContent value="box" className="mt-0 space-y-5">
                <SliderField label="Border radius" value={current.borderRadius ?? 0} min={0} max={80} onChange={(v) => set({ borderRadius: v })} unit="px" />
                <SliderField label="Padding" value={current.padding ?? 0} min={0} max={120} onChange={(v) => set({ padding: v })} unit="px" />
                <SliderField label="Margin" value={current.margin ?? 0} min={0} max={120} onChange={(v) => set({ margin: v })} unit="px" />
                <Field label="Sombra">
                  <div className="grid grid-cols-4 gap-1">
                    {[
                      { l: "Off", v: "" },
                      { l: "Leve", v: "0 4px 12px rgba(0,0,0,0.08)" },
                      { l: "Média", v: "0 12px 28px rgba(0,0,0,0.18)" },
                      { l: "Forte", v: "0 24px 48px rgba(0,0,0,0.32)" },
                    ].map(({ l, v }) => (
                      <Button key={l} size="sm" variant={current.boxShadow === v ? "default" : "outline"}
                        className="h-8 text-[10px]" onClick={() => set({ boxShadow: v })}>
                        {l}
                      </Button>
                    ))}
                  </div>
                </Field>
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </aside>
      )}
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function SliderField({
  label, value, min, max, step = 1, onChange, unit = "",
}: { label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; unit?: string }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</Label>
        <span className="text-[10px] font-mono">{value}{unit}</span>
      </div>
      <Slider value={[value]} min={min} max={max} step={step} onValueChange={([v]) => onChange(v)} />
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-2">
      <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</Label>
      <div className="flex gap-2">
        <input
          type="color"
          value={value.startsWith("#") ? value : "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-12 rounded border cursor-pointer"
        />
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="h-9 text-xs font-mono" />
      </div>
    </div>
  );
}

function UploadButton({ onUploaded }: { onUploaded: (url: string, isVideo: boolean) => void }) {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setBusy(true);
    setProgress("Enviando…");
    try {
      const ext = file.name.split(".").pop() || "bin";
      const path = `live/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("live-media").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      });
      if (error) throw error;
      const { data } = supabase.storage.from("live-media").getPublicUrl(path);
      onUploaded(data.publicUrl, file.type.startsWith("video/"));
      setProgress("✓ Pronto");
      setTimeout(() => setProgress(""), 1500);
    } catch (e: any) {
      setProgress("Erro: " + (e.message || "falhou"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />
      <Button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="w-full bg-black text-white hover:bg-black/80 font-bold uppercase tracking-widest text-[11px]"
      >
        {busy ? "Enviando…" : "📤 Escolher imagem ou vídeo"}
      </Button>
      {progress && <div className="text-[10px] text-muted-foreground text-center">{progress}</div>}
    </div>
  );
}
