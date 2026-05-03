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
    <aside className="hidden md:flex sticky top-0 h-screen w-64 flex-col p-4 gap-4 border-r border-sidebar-border bg-sidebar-background">
      <div className="p-4 flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-primary grid place-items-center shadow-glass">
          <Sparkles className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <div className="font-bold tracking-tight text-lg leading-tight text-primary">Permutas Já</div>
          <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Premium Curator</div>
        </div>
      </div>

      <nav className="p-2 flex-1">
        <ul className="space-y-1">
          {items.map(({ to, label, icon: Icon }) => {
            const active = pathname.startsWith(to);
            return (
              <li key={to}>
                <NavLink
                  to={to}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition-all
                    ${active
                      ? "bg-accent/10 text-accent"
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

      <div className="p-4 text-xs text-muted-foreground border-t border-sidebar-border">
        <p className="leading-relaxed opacity-80">Importe imóveis de qualquer link e organize sua carteira em segundos.</p>
      </div>
    </aside>
  );
}
