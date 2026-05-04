import { Coins, User, Wand2 } from "lucide-react";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { useProperties } from "@/contexts/PropertiesContext";
import { Link } from "react-router-dom";
import { useLiveEdit } from "@/contexts/LiveEditContext";

export function Topbar() {
  const { credits, creditSystemEnabled } = useProperties();
  return (
    <header className="sticky top-0 z-30 pt-4 px-6 md:px-10">
      <div className="bg-sidebar-background/80 backdrop-blur-xl border border-sidebar-border rounded-2xl px-6 py-2.5 flex items-center justify-between shadow-2xl transition-all duration-300">
        <Link to="/dashboard" className="md:hidden font-bold tracking-tight text-primary">Permutas Já</Link>
        <div className="hidden md:block text-[11px] text-sidebar-foreground/40 font-bold uppercase tracking-[0.2em]">Curadoria de Ativos Premium</div>

        <div className="flex items-center gap-4">
          {creditSystemEnabled && (
            <div className="bg-sidebar-foreground/5 border border-sidebar-border rounded-full px-4 py-1.5 flex items-center gap-2 text-sidebar-foreground shadow-sm">
              <Coins className="h-3.5 w-3.5 text-primary" />
              <span className="font-bold text-xs">{credits}</span>
              <span className="text-sidebar-foreground/40 hidden sm:inline font-bold uppercase tracking-tighter text-[9px]">créditos</span>
            </div>
          )}
          <ThemeSwitcher />
          <div className="bg-sidebar-foreground/5 border border-sidebar-border rounded-full h-9 w-9 grid place-items-center shadow-sm cursor-pointer hover:bg-sidebar-foreground/10 transition-colors" aria-label="Usuário">
            <User className="h-4 w-4 text-sidebar-foreground" />
          </div>
        </div>
      </div>
    </header>
  );
}
