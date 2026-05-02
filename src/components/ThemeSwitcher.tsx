import { useTheme } from "@/contexts/ThemeContext";
import { THEMES } from "@/lib/themes";
import { Check, Palette } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="glass rounded-full" aria-label="Trocar tema">
          <Palette className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="glass-strong w-72 p-3 rounded-2xl border-glass-border">
        <p className="px-2 pb-2 text-xs uppercase tracking-widest text-muted-foreground">Temas</p>
        <div className="grid gap-1">
          {THEMES.map((t) => {
            const active = t.id === theme;
            return (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={`group flex items-center gap-3 rounded-xl px-2 py-2 text-left transition-smooth hover:bg-sidebar-accent ${active ? "bg-sidebar-accent" : ""}`}
              >
                <div className="flex h-8 w-12 overflow-hidden rounded-lg ring-1 ring-border">
                  {t.swatch.map((c, i) => (
                    <div key={i} style={{ background: c }} className="flex-1" />
                  ))}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{t.name}</div>
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
