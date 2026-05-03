import { useState } from "react";
import { useBuilder } from "@/contexts/BuilderContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Layers, 
  Settings2, 
  Monitor, 
  Tablet, 
  Smartphone,
  Undo2,
  Redo2,
  Save,
  Type,
  Palette,
  Box,
  Layout as LayoutIcon,
  ChevronRight,
  ChevronDown,
  Eye,
  EyeOff,
  Type as FontIcon,
  Maximize,
  Grid
} from "lucide-react";
import { getContrastColor } from "@/lib/color-utils";

export function VisualBuilder() {
  const { config, selectElement, updateElementStyle, undo, redo } = useBuilder();
  const [viewport, setViewport] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const selectedElement = config.selectedElementId ? config.elements[config.selectedElementId] : null;

  return (
    <div className="flex h-screen bg-background overflow-hidden border-t">
      {/* 1. SIDEBAR ESQUERDA - NAVEGAÇÃO / ELEMENTOS */}
      <aside className="w-64 border-r flex flex-col bg-card/50 backdrop-blur-xl z-20">
        <div className="p-4 border-b flex items-center justify-between bg-muted/30">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] flex items-center gap-2 text-muted-foreground">
            <Layers className="h-3 w-3" /> Navegador
          </h2>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2">
            <ElementTreeItem 
              id={config.rootElementId} 
              depth={0} 
            />
          </div>
        </ScrollArea>
      </aside>

      {/* 2. ÁREA CENTRAL - CANVAS */}
      <main className="flex-1 bg-muted/10 flex flex-col relative overflow-hidden">
        {/* Toolbar Superior */}
        <div className="h-14 border-b bg-background/80 backdrop-blur-md flex items-center justify-between px-6 z-10">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={undo} className="h-8 w-8"><Undo2 className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" onClick={redo} className="h-8 w-8"><Redo2 className="h-4 w-4" /></Button>
          </div>

          <div className="flex items-center bg-muted/50 rounded-lg p-1">
            <Button 
              variant={viewport === "desktop" ? "secondary" : "ghost"} 
              size="sm" 
              onClick={() => setViewport("desktop")}
              className="h-8 px-3"
            >
              <Monitor className="h-4 w-4" />
            </Button>
            <Button 
              variant={viewport === "tablet" ? "secondary" : "ghost"} 
              size="sm" 
              onClick={() => setViewport("tablet")}
              className="h-8 px-3"
            >
              <Tablet className="h-4 w-4" />
            </Button>
            <Button 
              variant={viewport === "mobile" ? "secondary" : "ghost"} 
              size="sm" 
              onClick={() => setViewport("mobile")}
              className="h-8 px-3"
            >
              <Smartphone className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button className="h-8 bg-accent hover:bg-accent/90 text-[10px] font-bold uppercase tracking-widest px-4">
              <Save className="h-3 w-3 mr-2" /> Publicar
            </Button>
          </div>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 overflow-auto p-12 flex justify-center items-start bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px]">
          <div className={cn(
            "bg-white shadow-2xl transition-all duration-500 rounded-sm overflow-hidden border ring-1 ring-black/5",
            viewport === "desktop" && "w-full max-w-[1200px] min-h-[800px]",
            viewport === "tablet" && "w-[768px] min-h-[1024px]",
            viewport === "mobile" && "w-[375px] min-h-[667px]"
          )}>
            <CanvasRenderer elementId={config.rootElementId} />
          </div>
        </div>
      </main>

      {/* 3. SIDEBAR DIREITA - PAINEL DE PROPRIEDADES */}
      <aside className="w-80 border-l flex flex-col bg-card/50 backdrop-blur-xl z-20">
        <div className="p-4 border-b bg-muted/30">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
            <Settings2 className="h-3 w-3" /> Propriedades
          </h2>
          {selectedElement && (
            <div className="mt-2 text-xs font-bold text-foreground">
              {selectedElement.name} <span className="text-[10px] text-muted-foreground font-normal opacity-60">#{selectedElement.type}</span>
            </div>
          )}
        </div>

        {selectedElement ? (
          <Tabs defaultValue="style" className="flex-1 flex flex-col">
            <TabsList className="grid grid-cols-3 rounded-none border-b bg-transparent h-12">
              <TabsTrigger value="style" className="text-[10px] uppercase font-bold tracking-widest data-[state=active]:bg-muted/50">Estilo</TabsTrigger>
              <TabsTrigger value="layout" className="text-[10px] uppercase font-bold tracking-widest data-[state=active]:bg-muted/50">Layout</TabsTrigger>
              <TabsTrigger value="config" className="text-[10px] uppercase font-bold tracking-widest data-[state=active]:bg-muted/50">Config</TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1">
              <div className="p-6 space-y-8">
                {/* ABA ESTILO */}
                <TabsContent value="style" className="mt-0 space-y-6">
                  {/* Tipografia */}
                  <div className="space-y-4">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                      <FontIcon className="h-3 w-3" /> Tipografia
                    </Label>
                    <div className="grid gap-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] text-muted-foreground">Tamanho</Label>
                        <div className="flex gap-4 items-center">
                          <Slider 
                            value={[selectedElement.styles.fontSize || 16]} 
                            min={8} max={120} step={1}
                            onValueChange={([v]) => updateElementStyle(selectedElement.id, { fontSize: v })}
                            className="flex-1"
                          />
                          <span className="text-xs font-mono w-8 text-right">{selectedElement.styles.fontSize || 16}</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] text-muted-foreground">Cor do Texto</Label>
                        <div className="flex gap-2">
                          <Input 
                            type="color" 
                            value={selectedElement.styles.color || "#000000"} 
                            onChange={(e) => updateElementStyle(selectedElement.id, { color: e.target.value })}
                            className="w-10 h-10 p-1 rounded-md"
                          />
                          <Input 
                            value={selectedElement.styles.color || "#000000"} 
                            onChange={(e) => updateElementStyle(selectedElement.id, { color: e.target.value })}
                            className="flex-1 text-xs font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Fundo */}
                  <div className="space-y-4 pt-4 border-t">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                      <Palette className="h-3 w-3" /> Aparência
                    </Label>
                    <div className="space-y-3">
                      <Label className="text-[10px] text-muted-foreground">Cor de Fundo</Label>
                      <div className="flex gap-2">
                        <Input 
                          type="color" 
                          value={selectedElement.styles.backgroundColor || "#ffffff"} 
                          onChange={(e) => updateElementStyle(selectedElement.id, { backgroundColor: e.target.value })}
                          className="w-10 h-10 p-1 rounded-md"
                        />
                        <Input 
                          value={selectedElement.styles.backgroundColor || "#ffffff"} 
                          onChange={(e) => updateElementStyle(selectedElement.id, { backgroundColor: e.target.value })}
                          className="flex-1 text-xs font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Bordas */}
                  <div className="space-y-4 pt-4 border-t">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                      <Box className="h-3 w-3" /> Bordas
                    </Label>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <Label className="text-[10px] text-muted-foreground">Raio (Radius)</Label>
                        <span className="text-xs font-mono">{selectedElement.styles.borderRadius || 0}px</span>
                      </div>
                      <Slider 
                        value={[selectedElement.styles.borderRadius || 0]} 
                        min={0} max={100} step={1}
                        onValueChange={([v]) => updateElementStyle(selectedElement.id, { borderRadius: v })}
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* ABA LAYOUT */}
                <TabsContent value="layout" className="mt-0 space-y-6">
                  <div className="space-y-4">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                      <LayoutIcon className="h-3 w-3" /> Espaçamento
                    </Label>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] text-muted-foreground">Padding Superior</Label>
                        <Input 
                          type="number" 
                          value={selectedElement.styles.paddingTop || 0} 
                          onChange={(e) => updateElementStyle(selectedElement.id, { paddingTop: parseInt(e.target.value) })}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] text-muted-foreground">Padding Inferior</Label>
                        <Input 
                          type="number" 
                          value={selectedElement.styles.paddingBottom || 0} 
                          onChange={(e) => updateElementStyle(selectedElement.id, { paddingBottom: parseInt(e.target.value) })}
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                      <Grid className="h-3 w-3" /> Flex / Grid
                    </Label>
                    <div className="space-y-3">
                      <Label className="text-[10px] text-muted-foreground">Display</Label>
                      <select 
                        className="w-full h-8 bg-background border rounded-md px-2 text-xs"
                        value={selectedElement.styles.display || "block"}
                        onChange={(e) => updateElementStyle(selectedElement.id, { display: e.target.value as any })}
                      >
                        <option value="block">Block</option>
                        <option value="flex">Flex</option>
                        <option value="grid">Grid</option>
                      </select>
                    </div>
                  </div>
                </TabsContent>
              </div>
            </ScrollArea>
          </Tabs>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4 opacity-40">
            <Maximize className="h-12 w-12 text-muted-foreground stroke-1" />
            <p className="text-xs font-medium">Selecione um elemento no canvas para editar suas propriedades.</p>
          </div>
        )}
      </aside>
    </div>
  );
}

function ElementTreeItem({ id, depth }: { id: string, depth: number }) {
  const { config, selectElement } = useBuilder();
  const element = config.elements[id];
  const [isOpen, setIsOpen] = useState(true);
  const isSelected = config.selectedElementId === id;

  if (!element) return null;

  return (
    <div className="space-y-1">
      <button 
        onClick={() => selectElement(id)}
        className={cn(
          "w-full flex items-center gap-2 px-2 py-1.5 rounded-md transition-all text-left group",
          isSelected ? "bg-accent/10 text-accent font-bold" : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
        )}
        style={{ paddingLeft: `${(depth * 12) + 8}px` }}
      >
        {element.children.length > 0 ? (
          <div onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }} className="p-0.5 hover:bg-muted rounded">
            {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </div>
        ) : (
          <div className="w-3 h-3" />
        )}
        <span className="text-[11px] truncate">{element.name}</span>
        <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Eye className="h-3 w-3 text-muted-foreground hover:text-foreground cursor-pointer" />
        </div>
      </button>
      
      {isOpen && element.children.length > 0 && (
        <div className="space-y-1">
          {element.children.map(childId => (
            <ElementTreeItem key={childId} id={childId} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function CanvasRenderer({ elementId }: { elementId: string }) {
  const { config, selectElement } = useBuilder();
  const element = config.elements[elementId];
  const isSelected = config.selectedElementId === elementId;

  if (!element) return null;

  const style: React.CSSProperties = {
    backgroundColor: element.styles.backgroundColor,
    color: element.styles.color,
    fontSize: element.styles.fontSize ? `${element.styles.fontSize}px` : undefined,
    fontWeight: element.styles.fontWeight,
    lineHeight: element.styles.lineHeight,
    letterSpacing: element.styles.letterSpacing,
    paddingTop: element.styles.paddingTop ? `${element.styles.paddingTop}px` : undefined,
    paddingBottom: element.styles.paddingBottom ? `${element.styles.paddingBottom}px` : undefined,
    paddingLeft: element.styles.paddingLeft ? `${element.styles.paddingLeft}px` : undefined,
    paddingRight: element.styles.paddingRight ? `${element.styles.paddingRight}px` : undefined,
    borderRadius: element.styles.borderRadius ? `${element.styles.borderRadius}px` : undefined,
    display: element.styles.display,
    flexDirection: element.styles.flexDirection,
    gap: element.styles.gap ? `${element.styles.gap}px` : undefined,
    width: element.styles.width,
    height: element.styles.height,
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    selectElement(elementId);
  };

  const renderContent = () => {
    if (element.type === "text") {
      return element.props.text || "Edite este texto";
    }
    return element.children.map(childId => <CanvasRenderer key={childId} elementId={childId} />);
  };

  const Tag = element.type === "text" ? "div" : "div";

  return (
    <Tag 
      style={style} 
      onClick={handleClick}
      className={cn(
        "relative transition-all duration-200",
        isSelected && "ring-2 ring-accent ring-inset outline-none",
        !isSelected && "hover:ring-1 hover:ring-accent/40 hover:ring-inset"
      )}
    >
      {isSelected && (
        <div className="absolute -top-6 left-0 bg-accent text-white text-[9px] font-bold px-2 py-0.5 rounded-t-sm uppercase tracking-widest z-50">
          {element.name}
        </div>
      )}
      {renderContent()}
    </Tag>
  );
}
