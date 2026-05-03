import { Coins, User } from "lucide-react";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { useProperties } from "@/contexts/PropertiesContext";
import { Link } from "react-router-dom";

export function Topbar() {
  const { credits, creditSystemEnabled } = useProperties();
  return (
    <header className="sticky top-0 z-30 pt-4 px-6 md:px-10">
      <div className="bg-[#0B0B0B]/80 backdrop-blur-xl border border-white/5 rounded-2xl px-6 py-2.5 flex items-center justify-between shadow-2xl">
        <Link to="/dashboard" className="md:hidden font-bold tracking-tight text-[#C6A87D]">Permutas Já</Link>
        <div className="hidden md:block text-[11px] text-white/40 font-bold uppercase tracking-[0.2em]">Curadoria de Ativos Premium</div>

        <div className="flex items-center gap-4">
          {creditSystemEnabled && (
            <div className="bg-white/5 border border-white/10 rounded-full px-4 py-1.5 flex items-center gap-2 text-white shadow-sm">
              <Coins className="h-3.5 w-3.5 text-[#C6A87D]" />
              <span className="font-bold text-xs">{credits}</span>
              <span className="text-white/40 hidden sm:inline font-bold uppercase tracking-tighter text-[9px]">créditos</span>
            </div>
          )}
          <ThemeSwitcher />
          <div className="bg-white/5 border border-white/10 rounded-full h-9 w-9 grid place-items-center shadow-sm cursor-pointer hover:bg-white/10 transition-colors" aria-label="Usuário">
            <User className="h-4 w-4 text-white" />
          </div>
        </div>
      </div>
    </header>
  );
}
