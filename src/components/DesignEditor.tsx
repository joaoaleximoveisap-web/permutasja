import { useState } from "react";
import { useThemeEditor } from "@/contexts/ThemeEditorContext";
import { getContrastColor } from "@/lib/color-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Palette, 
  Type, 
  Image as ImageIcon, 
  Box, 
  Layout, 
  RefreshCw, 
  AlertTriangle,
  CheckCircle2,
  Undo2,
  Redo2,
  Save,
  Monitor,
  Tablet,
  Smartphone
} from "lucide-react";

export function DesignEditor() {
  const { config, updateColors, updateTypography, updateLayout, resetTheme } = useThemeEditor();
  const [viewport, setViewport] = useState<"desktop" | "tablet" | "mobile">("desktop");

  const contrastWarning = (bg: string, fg: string) => {
    const ideal = getContrastColor(bg);
    return ideal !== fg.toUpperCase();
  };

  const fixContrast = (bgKey: keyof typeof config.colors, fgKey: keyof typeof config.colors) => {
    const ideal = getContrastColor(config.colors[bgKey]);
    updateColors({ [fgKey]: ideal });
  };

  return (
    <div className="flex h-screen bg-background border-t">
      {/* 1. PAINEL DE CONTROLE */}
      <aside className="w-[380px] border-r flex flex-col glass-strong z-20">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-bold text-sm uppercase tracking-widest flex items-center gap-2">
            <Palette className="h-4 w-4 text-accent" /> Design Editor
          </h2>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8"><Undo2 className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8"><Redo2 className="h-4 w-4" /></Button>
          </div>
        </div>

        <Tabs defaultValue="colors" className="flex-1 flex flex-col">
          <TabsList className="grid grid-cols-5 p-1 bg-muted/50 rounded-none border-b">
            <TabsTrigger value="colors" title="Cores"><Palette className="h-4 w-4" /></TabsTrigger>
            <TabsTrigger value="typo" title="Tipografia"><Type className="h-4 w-4" /></TabsTrigger>
            <TabsTrigger value="images" title="Imagens"><ImageIcon className="h-4 w-4" /></TabsTrigger>
            <TabsTrigger value="components" title="Componentes"><Box className="h-4 w-4" /></TabsTrigger>
            <TabsTrigger value="layout" title="Layout"><Layout className="h-4 w-4" /></TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1">
            <div className="p-6 space-y-8 pb-20">
              
              {/* SEÇÃO CORES */}
              <TabsContent value="colors" className="mt-0 space-y-6">
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Superfícies</h3>
                  <div className="space-y-3">
                    <ColorField label="Background Primário" value={config.colors.background} onChange={(v) => updateColors({ background: v })} />
                    <ColorField label="Card Background" value={config.colors.card} onChange={(v) => updateColors({ card: v })} />
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t">
                  <h3 className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Conteúdo</h3>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <ColorField label="Texto Principal" value={config.colors.foreground} onChange={(v) => updateColors({ foreground: v })} />
                      {contrastWarning(config.colors.background, config.colors.foreground) && (
                        <div className="flex items-center justify-between p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                          <span className="text-[10px] text-amber-600 font-medium flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" /> Baixo contraste detectado
                          </span>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 text-[10px] hover:bg-amber-500/20"
                            onClick={() => fixContrast("background", "foreground")}
                          >
                            Corrigir
                          </Button>
                        </div>
                      )}
                    </div>
                    <ColorField label="Cor de Destaque (Accent)" value={config.colors.accent} onChange={(v) => updateColors({ accent: v })} />
                  </div>
                </div>
              </TabsContent>

              {/* SEÇÃO TIPOGRAFIA */}
              <TabsContent value="typo" className="mt-0 space-y-6">
                <div className="space-y-4">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Fonte Principal</Label>
                  <Input 
                    value={config.typography.fontFamily} 
                    onChange={(e) => updateTypography({ fontFamily: e.target.value })}
                    placeholder="Ex: Inter, Playfair Display..."
                  />
                </div>
                
                <div className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <Label className="text-xs font-bold uppercase text-muted-foreground">Tamanho Base</Label>
                      <span className="text-xs font-mono">{config.typography.baseSize}px</span>
                    </div>
                    <Slider 
                      value={[config.typography.baseSize]} 
                      min={12} max={24} step={1} 
                      onValueChange={([v]) => updateTypography({ baseSize: v })}
                    />
                  </div>
                </div>
              </TabsContent>

              {/* OUTRAS SEÇÕES (Layout, Componentes...) */}
              <TabsContent value="layout" className="mt-0 space-y-6">
                <div className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <Label className="text-xs font-bold uppercase text-muted-foreground">Arredondamento (Radius)</Label>
                      <span className="text-xs font-mono">{config.layout.radius}rem</span>
                    </div>
                    <Slider 
                      value={[config.layout.radius]} 
                      min={0} max={2} step={0.1} 
                      onValueChange={([v]) => updateLayout({ radius: v })}
                    />
                  </div>
                </div>
              </TabsContent>

            </div>
          </ScrollArea>
        </Tabs>

        <div className="p-4 border-t bg-muted/30 flex gap-2">
          <Button variant="outline" className="flex-1 text-xs font-bold gap-2" onClick={resetTheme}>
            <RefreshCw className="h-3 w-3" /> RESET
          </Button>
          <Button className="flex-1 text-xs font-bold gap-2 bg-accent hover:bg-accent/90">
            <Save className="h-3 w-3" /> SALVAR
          </Button>
        </div>
      </aside>

      {/* 2. PREVIEW EM TEMPO REAL */}
      <main className="flex-1 bg-muted/20 relative overflow-hidden flex flex-col items-center">
        <div className="w-full p-4 flex justify-center gap-4 border-b bg-background/50 backdrop-blur-sm z-10">
          <Button 
            variant={viewport === "desktop" ? "default" : "ghost"} 
            size="icon" 
            onClick={() => setViewport("desktop")}
            className="h-9 w-9"
          >
            <Monitor className="h-4 w-4" />
          </Button>
          <Button 
            variant={viewport === "tablet" ? "default" : "ghost"} 
            size="icon" 
            onClick={() => setViewport("tablet")}
            className="h-9 w-9"
          >
            <Tablet className="h-4 w-4" />
          </Button>
          <Button 
            variant={viewport === "mobile" ? "default" : "ghost"} 
            size="icon" 
            onClick={() => setViewport("mobile")}
            className="h-9 w-9"
          >
            <Smartphone className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 w-full overflow-auto p-8 flex justify-center">
          <div className={cn(
            "bg-background shadow-2xl transition-all duration-500 rounded-lg overflow-hidden border",
            viewport === "desktop" && "w-full max-w-[1200px] aspect-video",
            viewport === "tablet" && "w-[768px] h-[1024px]",
            viewport === "mobile" && "w-[375px] h-[812px]"
          )}>
            <iframe 
              src="/" 
              className="w-full h-full border-none pointer-events-none"
              title="Preview"
            />
          </div>
        </div>
      </main>
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string, value: string, onChange: (v: string) => void }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <Label className="text-[11px] font-medium text-muted-foreground">{label}</Label>
        <span className="text-[10px] font-mono uppercase text-muted-foreground">{value}</span>
      </div>
      <div className="flex gap-2">
        <div 
          className="w-10 h-10 rounded-lg border shadow-sm shrink-0 cursor-pointer"
          style={{ background: value }}
        />
        <Input 
          type="text" 
          value={value} 
          onChange={(e) => onChange(e.target.value)}
          className="h-10 text-xs font-mono"
        />
      </div>
    </div>
  );
}
