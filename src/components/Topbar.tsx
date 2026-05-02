import { Coins, User, Bell } from "lucide-react";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { useProperties } from "@/contexts/PropertiesContext";
import { Link, useLocation } from "react-router-dom";

export function Topbar() {
  const { credits } = useProperties();
  const { pathname } = useLocation();

  const getTitle = () => {
    if (pathname.startsWith("/dashboard")) return "Visão Geral";
    if (pathname.startsWith("/imoveis")) return "Carteira de Imóveis";
    if (pathname.startsWith("/busca-inteligente")) return "Inteligência Artificial";
    if (pathname.startsWith("/revisar")) return "Revisão de Dados";
    return "Menu Principal";
  };

  return (
    <header className="sticky top-0 z-30 pt-4 px-4 md:px-8 lg:px-12 bg-background/80 backdrop-blur-xl">
      <div className="bg-white/80 backdrop-blur-md border border-border/50 rounded-2xl px-6 py-4 flex items-center justify-between shadow-sm transition-all duration-300">
        <div className="flex flex-col">
          <Link to="/dashboard" className="lg:hidden font-bold text-lg tracking-tight mb-0.5">Permutas Já</Link>
          <h1 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">{getTitle()}</h1>
        </div>

        <div className="flex items-center gap-3 md:gap-4">
          <div className="hidden sm:flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-xl border border-border/20 text-xs font-bold">
            <Coins className="h-4 w-4 text-accent" />
            <span>{credits}</span>
            <span className="text-muted-foreground">CRÉDITOS</span>
          </div>
          
          <button className="h-10 w-10 rounded-xl hover:bg-muted flex items-center justify-center text-muted-foreground transition-colors relative">
            <Bell className="h-5 w-5" />
            <span className="absolute top-2.5 right-2.5 h-2 w-2 bg-accent rounded-full border-2 border-white shadow-sm" />
          </button>
          
          <ThemeSwitcher />
          
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold shadow-lg shadow-primary/20">
            <User className="h-5 w-5" />
          </div>
        </div>
      </div>
    </header>
  );
}
