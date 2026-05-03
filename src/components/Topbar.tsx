import { Coins, User } from "lucide-react";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { useProperties } from "@/contexts/PropertiesContext";
import { Link } from "react-router-dom";

export function Topbar() {
  const { credits, creditSystemEnabled } = useProperties();
  return (
    <header className="sticky top-0 z-30 mt-4 mx-4 md:mx-0 md:mt-4 md:mr-4">
      <div className="glass rounded-2xl px-4 py-3 flex items-center justify-between">
        <Link to="/dashboard" className="md:hidden font-semibold tracking-tight">Permutas Já</Link>
        <div className="hidden md:block text-sm text-muted-foreground">Bem-vindo de volta 👋</div>

        <div className="flex items-center gap-2">
          <div className="glass rounded-full px-3 py-1.5 flex items-center gap-2 text-sm">
            <Coins className="h-4 w-4 text-accent" />
            <span className="font-medium">{credits}</span>
            <span className="text-muted-foreground hidden sm:inline">créditos</span>
          </div>
          <ThemeSwitcher />
          <div className="glass rounded-full h-9 w-9 grid place-items-center" aria-label="Usuário">
            <User className="h-4 w-4" />
          </div>
        </div>
      </div>
    </header>
  );
}
