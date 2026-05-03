import { useBuilder } from "@/contexts/BuilderContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { X, Type, Palette, Maximize, Image as ImageIcon } from "lucide-react";

export function CanvasSidebar() {
  const { selectedElement, setSelectedElement, uiConfigs, updateConfig } = useBuilder();

  if (!selectedElement) return null;

  const currentConfig = uiConfigs[selectedElement] || {};

  const handleUpdate = (key: string, value: any) => {
    updateConfig(selectedElement, { ...currentConfig, [key]: value });
  };

  return (
    <Card className="fixed right-6 top-24 w-80 z-50 shadow-2xl animate-in slide-in-from-right-10">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
          <SettingsIcon className="h-4 w-4" /> Elemento: {selectedElement}
        </CardTitle>
        <button onClick={() => setSelectedElement(null)} className="hover:text-accent">
          <X className="h-4 w-4" />
        </button>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Type className="h-3 w-3" /> Conteúdo
          </Label>
          <Input 
            value={currentConfig.text || ""} 
            onChange={(e) => handleUpdate("text", e.target.value)}
            placeholder="Texto do elemento..."
          />
        </div>

        <div className="space-y-2">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Palette className="h-3 w-3" /> Cor do Texto
          </Label>
          <div className="flex gap-2">
            <Input 
              type="color" 
              className="w-12 h-10 p-1"
              value={currentConfig.color || "#000000"} 
              onChange={(e) => handleUpdate("color", e.target.value)}
            />
            <Input 
              value={currentConfig.color || "#000000"} 
              onChange={(e) => handleUpdate("color", e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-4">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Maximize className="h-3 w-3" /> Tamanho da Fonte ({currentConfig.fontSize || 16}px)
          </Label>
          <Slider 
            value={[currentConfig.fontSize || 16]} 
            min={8} 
            max={120} 
            step={1}
            onValueChange={([val]) => handleUpdate("fontSize", val)}
          />
        </div>

        <div className="space-y-4">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Maximize className="h-3 w-3" /> Border Radius ({currentConfig.borderRadius || 0}px)
          </Label>
          <Slider 
            value={[currentConfig.borderRadius || 0]} 
            min={0} 
            max={50} 
            step={1}
            onValueChange={([val]) => handleUpdate("borderRadius", val)}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <ImageIcon className="h-3 w-3" /> URL da Imagem / Fundo
          </Label>
          <Input 
            value={currentConfig.imageUrl || ""} 
            onChange={(e) => handleUpdate("imageUrl", e.target.value)}
            placeholder="https://..."
          />
        </div>
      </CardContent>
    </Card>
  );
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );
}
