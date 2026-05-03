import { Coins, User } from "lucide-react";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { useProperties } from "@/contexts/PropertiesContext";
import { Link } from "react-router-dom";

export function Topbar() {
  const { credits, creditSystemEnabled } = useProperties();
  return (
    <header className="sticky top-0 z-30 mt-4 mx-4 md:mx-0 md:mt-4 md:mr-4">
      <div className="bg-white/80 backdrop-blur-md border border-border rounded-2xl px-4 py-3 flex items-center justify-between shadow-sm">
        <Link to="/dashboard" className="md:hidden font-bold tracking-tight text-primary">Permutas Já</Link>
        <div className="hidden md:block text-sm text-muted-foreground font-medium italic">Bem-vindo de volta 👋</div>

        <div className="flex items-center gap-2">
          {creditSystemEnabled && (
            <div className="bg-white border border-border rounded-full px-3 py-1.5 flex items-center gap-2 text-sm shadow-sm">
              <Coins className="h-4 w-4 text-accent" />
              <span className="font-bold">{credits}</span>
              <span className="text-muted-foreground hidden sm:inline font-medium uppercase tracking-tighter text-[10px]">créditos</span>
            </div>
          )}
          <ThemeSwitcher />
          <div className="bg-white border border-border rounded-full h-9 w-9 grid place-items-center shadow-sm" aria-label="Usuário">
            <User className="h-4 w-4" />
          </div>
        </div>
      </div>
    </header>
  );
}
