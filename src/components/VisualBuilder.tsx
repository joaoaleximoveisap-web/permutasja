import { useState, useRef, useEffect } from "react";
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
  Type as FontIcon,
  Maximize,
  Grid,
  Image as ImageIcon,
  MousePointer2
} from "lucide-react";

export function VisualBuilder() {
  const { config, selectElement, updateElementStyle, undo, redo, updateElementProps } = useBuilder();
  const [viewport, setViewport] = useState<"desktop" | "tablet" | "mobile">("desktop");
  
  const selectedIds = config.selectedElementIds;
  const isMultiSelect = selectedIds.length > 1;
  const primarySelectedId = selectedIds[0] || null;
  const selectedElement = primarySelectedId ? config.elements[primarySelectedId] : null;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") selectElement(null);
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault();
        e.shiftKey ? redo() : undo();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo, selectElement]);

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
      <main className="flex-1 bg-muted/10 flex flex-col relative overflow-hidden" onClick={() => selectElement(null)}>
        {/* Toolbar Superior */}
        <div className="h-14 border-b bg-background/80 backdrop-blur-md flex items-center justify-between px-6 z-10" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={undo} className="h-8 w-8"><Undo2 className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" onClick={redo} className="h-8 w-8"><Redo2 className="h-4 w-4" /></Button>
            <div className="h-4 w-px bg-border mx-2" />
            <span className="text-[10px] font-mono text-muted-foreground">
              {selectedIds.length} selecionado{selectedIds.length !== 1 ? 's' : ''}
            </span>
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
            "bg-white shadow-2xl transition-all duration-500 rounded-sm overflow-hidden border ring-1 ring-black/5 relative",
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
              {isMultiSelect ? `${selectedIds.length} Elementos` : selectedElement.name} 
              {!isMultiSelect && <span className="text-[10px] text-muted-foreground font-normal opacity-60 ml-2">#{selectedElement.type}</span>}
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
                  {/* Tipografia - Only for text types */}
                  {(isMultiSelect || selectedElement.type === "text" || selectedElement.type === "button") && (
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
                              onValueChange={([v]) => {
                                selectedIds.forEach(id => updateElementStyle(id, { fontSize: v }));
                              }}
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
                              onChange={(e) => {
                                selectedIds.forEach(id => updateElementStyle(id, { color: e.target.value }));
                              }}
                              className="w-10 h-10 p-1 rounded-md"
                            />
                            <Input 
                              value={selectedElement.styles.color || "#000000"} 
                              onChange={(e) => {
                                selectedIds.forEach(id => updateElementStyle(id, { color: e.target.value }));
                              }}
                              className="flex-1 text-xs font-mono"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Aparência */}
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
                          onChange={(e) => {
                            selectedIds.forEach(id => updateElementStyle(id, { backgroundColor: e.target.value }));
                          }}
                          className="w-10 h-10 p-1 rounded-md"
                        />
                        <Input 
                          value={selectedElement.styles.backgroundColor || "#ffffff"} 
                          onChange={(e) => {
                            selectedIds.forEach(id => updateElementStyle(id, { backgroundColor: e.target.value }));
                          }}
                          className="flex-1 text-xs font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Image specific props */}
                  {selectedElement.type === "image" && !isMultiSelect && (
                    <div className="space-y-4 pt-4 border-t">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <ImageIcon className="h-3 w-3" /> Imagem
                      </Label>
                      <div className="space-y-3">
                        <Label className="text-[10px] text-muted-foreground">URL da Imagem</Label>
                        <Input 
                          value={selectedElement.props.src || ""} 
                          onChange={(e) => updateElementProps(selectedElement.id, { src: e.target.value })}
                          placeholder="https://exemplo.com/imagem.jpg"
                          className="text-xs"
                        />
                      </div>
                    </div>
                  )}

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
                        onValueChange={([v]) => {
                          selectedIds.forEach(id => updateElementStyle(id, { borderRadius: v }));
                        }}
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
                          onChange={(e) => {
                            const v = parseInt(e.target.value);
                            selectedIds.forEach(id => updateElementStyle(id, { paddingTop: v }));
                          }}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] text-muted-foreground">Padding Inferior</Label>
                        <Input 
                          type="number" 
                          value={selectedElement.styles.paddingBottom || 0} 
                          onChange={(e) => {
                            const v = parseInt(e.target.value);
                            selectedIds.forEach(id => updateElementStyle(id, { paddingBottom: v }));
                          }}
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </div>
            </ScrollArea>
          </Tabs>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4 opacity-40">
            <MousePointer2 className="h-12 w-12 text-muted-foreground stroke-1" />
            <p className="text-xs font-medium">Selecione um ou mais elementos no canvas para editar.</p>
            <p className="text-[10px] text-muted-foreground">Dica: Segure CTRL para selecionar múltiplos.</p>
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
  const isSelected = config.selectedElementIds.includes(id);

  if (!element) return null;

  return (
    <div className="space-y-1">
      <button 
        onClick={(e) => {
          e.stopPropagation();
          selectElement(id, e.metaKey || e.ctrlKey);
        }}
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
  const { config, selectElement, updateElementProps } = useBuilder();
  const element = config.elements[elementId];
  const isSelected = config.selectedElementIds.includes(elementId);
  const textRef = useRef<HTMLDivElement>(null);

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
    display: element.styles.display || "block",
    flexDirection: element.styles.flexDirection as any,
    alignItems: element.styles.alignItems as any,
    justifyContent: element.styles.justifyContent as any,
    gap: element.styles.gap ? `${element.styles.gap}px` : undefined,
    width: element.styles.width || "auto",
    height: element.styles.height || "auto",
    cursor: "pointer"
  };


  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    selectElement(elementId, e.metaKey || e.ctrlKey);
  };

  const handleBlur = () => {
    if (textRef.current && element.type === "text") {
      updateElementProps(elementId, { text: textRef.current.innerText });
    }
  };

  const renderContent = () => {
    if (element.type === "text") {
      return (
        <div 
          ref={textRef}
          contentEditable 
          suppressContentEditableWarning
          onBlur={handleBlur}
          className="outline-none"
        >
          {element.props.text || "Edite este texto"}
        </div>
      );
    }
    if (element.type === "image") {
      return <img src={element.props.src || "https://images.unsplash.com/photo-1518005020451-eba3af208960?auto=format&fit=crop&w=400"} className="w-full h-auto" />;
    }
    return element.children.map(childId => <CanvasRenderer key={childId} elementId={childId} />);
  };

  return (
    <div 
      style={style} 
      onClick={handleClick}
      className={cn(
        "relative transition-all duration-200 group/canvas",
        isSelected && "outline outline-2 outline-accent outline-offset-[-2px] z-10",
        !isSelected && "hover:outline hover:outline-1 hover:outline-accent/40 hover:outline-offset-[-1px]"
      )}
    >
      {isSelected && (
        <div className="absolute -top-6 left-0 bg-accent text-white text-[9px] font-bold px-2 py-0.5 rounded-t-sm uppercase tracking-widest z-50 pointer-events-none">
          {element.name}
        </div>
      )}
      {renderContent()}
    </div>
  );
}
