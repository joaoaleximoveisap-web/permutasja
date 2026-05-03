import { useEffect, useMemo, useRef, useState } from "react";
import { useLiveEdit, ElementOverride } from "@/contexts/LiveEditContext";
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
        onClick={() => {
          console.log("Live Editor: Ativado via botão");
          setActive(true);
        }}
        className="fixed bottom-10 right-10 z-[1000000] h-16 w-16 rounded-full bg-accent text-white shadow-[0_0_50px_rgba(198,168,125,0.5)] grid place-items-center hover:scale-110 transition-all border-4 border-white animate-bounce"
        title="Modo Editor Visual"
      >
        <Wand2 className="h-8 w-8" />
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
      {/* Top bar */}
      <div
        data-live-editor-ui
        className="fixed top-0 left-0 right-0 z-[9999] bg-black text-white px-4 py-2 flex items-center justify-between shadow-2xl"
      >
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
          <Sparkles className="h-4 w-4 text-accent" />
          Live Editor — clique em qualquer elemento
        </div>
        <div className="flex items-center gap-2">
          {selectedSelector && (
            <span className="text-[10px] opacity-60 max-w-[280px] truncate font-mono hidden md:inline">
              {selectedSelector}
            </span>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-white hover:bg-white/10"
            onClick={() => {
              setActive(false);
              setSelectedSelector(null);
            }}
          >
            <X className="h-4 w-4 mr-1" /> Sair
          </Button>
        </div>
      </div>

      {/* Hover outline */}
      {hoverRect && !selectedRect && (
        <div
          data-live-editor-ui
          className="fixed pointer-events-none z-[9998] border-2 border-blue-400/70 bg-blue-400/10 transition-all"
          style={{
            top: hoverRect.top, left: hoverRect.left,
            width: hoverRect.width, height: hoverRect.height,
          }}
        />
      )}

      {/* Selected outline */}
      {selectedRect && (
        <div
          data-live-editor-ui
          className="fixed pointer-events-none z-[9998] border-2 border-accent shadow-[0_0_0_3px_rgba(198,168,125,0.25)] transition-all"
          style={{
            top: selectedRect.top, left: selectedRect.left,
            width: selectedRect.width, height: selectedRect.height,
          }}
        />
      )}

      {/* Side panel */}
      {selectedSelector && (
        <aside
          data-live-editor-ui
          className="fixed top-10 right-0 bottom-0 w-[360px] z-[9999] bg-background border-l shadow-2xl flex flex-col animate-in slide-in-from-right duration-200"
        >
          <div className="p-3 border-b flex items-center justify-between bg-muted/40">
            <div className="text-xs font-bold uppercase tracking-widest">Editar elemento</div>
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeOverride(selectedSelector)} title="Resetar">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setSelectedSelector(null)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <Tabs defaultValue="text" className="flex-1 flex flex-col">
            <TabsList className="grid grid-cols-4 m-2">
              <TabsTrigger value="text"><Type className="h-3.5 w-3.5" /></TabsTrigger>
              <TabsTrigger value="color"><Palette className="h-3.5 w-3.5" /></TabsTrigger>
              <TabsTrigger value="image"><ImageIcon className="h-3.5 w-3.5" /></TabsTrigger>
              <TabsTrigger value="box"><Box className="h-3.5 w-3.5" /></TabsTrigger>
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

              {/* IMAGE */}
              <TabsContent value="image" className="mt-0 space-y-5">
                <Field label="URL da imagem">
                  <Input
                    placeholder="https://…"
                    defaultValue={current.imageUrl || ""}
                    onChange={(e) => set({ imageUrl: e.target.value })}
                  />
                </Field>
                <Field label="Upload">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => set({ imageUrl: reader.result as string });
                      reader.readAsDataURL(file);
                    }}
                  />
                </Field>
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
