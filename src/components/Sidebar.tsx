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
    <aside className="hidden lg:flex sticky top-0 h-screen w-72 flex-col p-6 gap-8 bg-white border-r border-border">
      <div className="flex items-center gap-4 px-2">
        <div className="h-12 w-12 rounded-2xl bg-primary grid place-items-center shadow-xl shadow-primary/20">
          <Sparkles className="h-6 w-6 text-primary-foreground" />
        </div>
        <div>
          <div className="font-bold text-lg tracking-tight">Permutas Já</div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Real Estate Intelligence</div>
        </div>
      </div>

      <nav className="flex-1">
        <ul className="space-y-1">
          {items.map(({ to, label, icon: Icon }) => {
            const active = pathname.startsWith(to);
            return (
              <li key={to}>
                <NavLink
                  to={to}
                  className={`flex items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-bold transition-all duration-300
                    ${active
                      ? "bg-primary text-primary-foreground shadow-xl shadow-primary/20 scale-[1.02]"
                      : "text-muted-foreground hover:bg-muted hover:text-primary"}`}
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
