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
          <div className="font-semibold tracking-tight">Permutas Já</div>
          <div className="text-xs text-muted-foreground font-medium">para corretores</div>
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
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-smooth
                    ${active
                      ? "bg-gradient-primary text-primary-foreground shadow-glass"
                      : "text-foreground/80 hover:bg-sidebar-accent hover:text-foreground"}`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="glass rounded-2xl p-4 text-xs text-muted-foreground">
        <p className="leading-relaxed">Importe imóveis de qualquer link e organize sua carteira em segundos.</p>
      </div>
    </aside>
  );
}
