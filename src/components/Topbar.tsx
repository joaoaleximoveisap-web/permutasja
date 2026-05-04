import { Coins, User, Wand2 } from "lucide-react";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { useProperties } from "@/contexts/PropertiesContext";
import { Link } from "react-router-dom";
import { useLiveEdit } from "@/contexts/LiveEditContext";

export function Topbar() {
  const { credits, creditSystemEnabled } = useProperties();
  const { setActive, active } = useLiveEdit();
  
  return (
    // Topbar fluida: padding e gap escalam via clamp(); flex-wrap evita overflow em telas estreitas;
    // ações com min-h 40px no mobile (área tocável). Texto secundário desktop oculto em <md.
    <header
      className="sticky top-0 z-30"
      style={{
        paddingTop: "clamp(0.5rem, 2vw, 1rem)",
        paddingLeft: "clamp(0.75rem, 3vw, 2.5rem)",
        paddingRight: "clamp(0.75rem, 3vw, 2.5rem)",
      }}
    >
      <div
        className="bg-sidebar-background/80 backdrop-blur-xl border border-sidebar-border rounded-2xl flex items-center justify-between gap-2 shadow-2xl transition-all duration-300"
        style={{
          paddingInline: "clamp(0.75rem, 2vw, 1.5rem)",
          paddingBlock: "clamp(0.5rem, 1.2vw, 0.75rem)",
        }}
      >
        <Link to="/dashboard" className="md:hidden font-bold tracking-tight text-primary text-sm truncate">Permutas Já</Link>
        <div className="hidden md:block text-[11px] text-sidebar-foreground/40 font-bold uppercase tracking-[0.2em] truncate">Curadoria de Ativos Premium</div>

        <div className="flex items-center gap-2 sm:gap-3 md:gap-4 shrink-0">
          {!active && (
            <button
              onClick={() => setActive(true)}
              className="hidden sm:flex bg-sidebar-foreground/5 border border-sidebar-border rounded-full px-3 sm:px-4 min-h-[36px] items-center gap-2 text-[#C5A46D] shadow-sm hover:bg-sidebar-foreground/10 transition-colors"
            >
              <Wand2 className="h-3.5 w-3.5" />
              <span className="font-bold uppercase tracking-tighter text-[9px]">Editar Site</span>
            </button>
          )}
          {creditSystemEnabled && (
            <div className="bg-sidebar-foreground/5 border border-sidebar-border rounded-full px-3 sm:px-4 min-h-[36px] flex items-center gap-1.5 text-sidebar-foreground shadow-sm">
              <Coins className="h-3.5 w-3.5 text-primary" />
              <span className="font-bold text-xs">{credits}</span>
              <span className="text-sidebar-foreground/40 hidden md:inline font-bold uppercase tracking-tighter text-[9px]">créditos</span>
            </div>
          )}
          <ThemeSwitcher />
          <div className="bg-sidebar-foreground/5 border border-sidebar-border rounded-full h-10 w-10 min-h-[40px] min-w-[40px] grid place-items-center shadow-sm cursor-pointer hover:bg-sidebar-foreground/10 transition-colors" aria-label="Usuário">
            <User className="h-4 w-4 text-sidebar-foreground" />
          </div>
        </div>
      </div>
    </header>
  );
}
