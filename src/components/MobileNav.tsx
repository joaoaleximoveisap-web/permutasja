import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, Building2 } from "lucide-react";

const items = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/imoveis", label: "Imóveis", icon: Building2 },
];

export function MobileNav() {
  const { pathname } = useLocation();
  return (
    <nav className="md:hidden fixed bottom-3 left-3 right-3 z-40 bg-white/95 border border-border backdrop-blur-xl rounded-2xl p-2 flex justify-around shadow-lg">
      {items.map(({ to, label, icon: Icon }) => {
        const active = pathname.startsWith(to);
        return (
          <NavLink
            key={to}
            to={to}
            className={`flex-1 flex flex-col items-center gap-1 rounded-xl py-2 text-xs transition-smooth
              ${active ? "bg-gradient-primary text-primary-foreground" : "text-foreground/70"}`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        );
      })}
    </nav>
  );
}
