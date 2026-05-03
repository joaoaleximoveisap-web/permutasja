import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, Building2, Sparkles, MessageSquare } from "lucide-react";

const items = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/imoveis", label: "Imóveis", icon: Building2 },
  { to: "/busca-inteligente", label: "Busca IA", icon: MessageSquare },
];

export function Sidebar() {
  const { pathname } = useLocation();
  return (
    <aside className="hidden md:flex sticky top-0 h-screen w-[240px] flex-col p-5 gap-6 border-r border-sidebar-border bg-sidebar-background backdrop-blur-xl">
      <div className="px-2 flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-accent grid place-items-center shadow-lg">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <div className="flex flex-col">
          <div className="font-bold tracking-tight text-base leading-tight">Permutas Já</div>
          <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest opacity-60">Premium Curator</div>
        </div>
      </div>

      <nav className="flex-1">
        <ul className="space-y-1.5">
          {items.map(({ to, label, icon: Icon }) => {
            const active = pathname.startsWith(to);
            return (
              <li key={to}>
                <NavLink
                  to={to}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] font-semibold transition-all duration-200
                    ${active
                      ? "bg-accent text-white shadow-md shadow-accent/20"
                      : "text-foreground/50 hover:bg-accent/5 hover:text-foreground"}`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="px-2 py-4 border-t border-sidebar-border/50">
        <p className="text-[11px] text-muted-foreground leading-relaxed font-medium opacity-50 uppercase tracking-wider">
          Intelligence & High Performance
        </p>
      </div>
    </aside>
  );
}
