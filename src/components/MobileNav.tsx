import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, Building2, Network, MessageSquare } from "lucide-react";

// Bottom bar mobile com 4 itens principais. Cada touch target ≥ 44x44px (min-h-[44px]).
// Safe-area-inset-bottom respeita notches em iOS. Backdrop-blur + glass mantém estética premium.
const items = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/imoveis", label: "Imóveis", icon: Building2 },
  { to: "/demandas", label: "Demandas", icon: Network },
  { to: "/busca-inteligente", label: "Busca IA", icon: MessageSquare },
];

export function MobileNav() {
  const { pathname } = useLocation();
  return (
    <nav
      className="md:hidden fixed left-3 right-3 z-40 bg-white/95 border border-border backdrop-blur-xl rounded-2xl p-2 flex justify-around shadow-lg"
      style={{ bottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))" }}
    >
      {items.map(({ to, label, icon: Icon }) => {
        const active = pathname.startsWith(to);
        return (
          <NavLink
            key={to}
            to={to}
            className={`flex-1 min-h-[44px] flex flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 px-1 text-[10px] font-medium transition-smooth
              ${active ? "bg-gradient-primary text-primary-foreground" : "text-foreground/70 active:bg-foreground/5"}`}
          >
            <Icon className="h-[18px] w-[18px] shrink-0" />
            <span className="truncate w-full text-center leading-tight">{label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
