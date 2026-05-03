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
    <aside className="hidden md:flex sticky top-0 h-screen w-[240px] flex-col p-5 gap-8 border-r border-sidebar-border bg-sidebar-background text-sidebar-foreground transition-all duration-300">
      <div className="px-2 py-4 flex items-center gap-3">
        <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center border border-primary/20">
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
        <div className="flex flex-col">
          <div className="font-bold tracking-tight text-sm uppercase text-primary">Permutas Já</div>
          <div className="text-[9px] opacity-40 font-bold uppercase tracking-[0.2em]">Curator</div>
        </div>
      </div>

      <nav className="flex-1">
        <ul className="space-y-2">
          {items.map(({ to, label, icon: Icon }) => {
            const active = pathname.startsWith(to);
            return (
              <li key={to}>
                <NavLink
                  to={to}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all duration-300
                    ${active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                      : "opacity-40 hover:bg-sidebar-accent/5 hover:opacity-100 hover:text-sidebar-foreground"}`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="px-2 py-6 border-t border-sidebar-border">
        <div className="flex items-center gap-2 opacity-30 grayscale hover:grayscale-0 hover:opacity-100 transition-all cursor-default">
           <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
           <p className="text-[10px] font-bold uppercase tracking-widest">
            High Performance
          </p>
        </div>
      </div>
    </aside>
  );
}
