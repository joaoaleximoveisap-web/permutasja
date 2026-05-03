import { useTheme } from "@/contexts/ThemeContext";
import { THEMES } from "@/lib/themes";
import { Check, Palette, Settings2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="bg-white/80 border border-border backdrop-blur-md rounded-full" aria-label="Trocar tema">
          <Palette className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="bg-black/95 backdrop-blur-2xl w-72 p-3 rounded-2xl border-white/10 shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-2 pb-2">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Temas</p>
          <Button asChild variant="ghost" size="sm" className="h-7 text-[10px] text-accent hover:text-accent hover:bg-white/10 uppercase tracking-tighter">
            <Link to="/editor" className="flex items-center gap-1">
              <Settings2 className="h-3 w-3" /> Customizar
            </Link>
          </Button>
        </div>
        <div className="grid gap-1">
          {THEMES.map((t) => {
            const active = t.id === theme;
            return (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={`group flex items-center gap-3 rounded-xl px-2 py-2 text-left transition-smooth hover:bg-white/10 ${active ? "bg-white/15 ring-1 ring-white/20" : ""}`}
              >
                <div className="flex h-8 w-12 overflow-hidden rounded-lg ring-1 ring-border">
                  {t.swatch.map((c, i) => (
                    <div key={i} style={{ background: c }} className="flex-1" />
                  ))}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white truncate">{t.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{t.description}</div>
                </div>
                {active && <Check className="h-4 w-4 text-accent" />}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

