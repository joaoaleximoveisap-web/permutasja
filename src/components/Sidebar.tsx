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
    <aside className="hidden md:flex sticky top-0 h-screen w-[240px] flex-col p-5 gap-8 border-r border-white/5 bg-[#0B0B0B] text-white">
      <div className="px-2 py-4 flex items-center gap-3">
        <div className="h-8 w-8 rounded bg-[#C6A87D]/10 flex items-center justify-center border border-[#C6A87D]/20">
          <Sparkles className="h-4 w-4 text-[#C6A87D]" />
        </div>
        <div className="flex flex-col">
          <div className="font-bold tracking-tight text-sm uppercase text-[#C6A87D]">Permutas Já</div>
          <div className="text-[9px] text-white/40 font-bold uppercase tracking-[0.2em]">Curator</div>
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
                      ? "bg-[#C6A87D]/15 text-[#C6A87D]"
                      : "text-white/40 hover:bg-white/5 hover:text-white"}`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="px-2 py-6 border-t border-white/5">
        <div className="flex items-center gap-2 opacity-30 grayscale hover:grayscale-0 hover:opacity-100 transition-all cursor-default">
           <div className="h-1.5 w-1.5 rounded-full bg-[#C6A87D] animate-pulse" />
           <p className="text-[10px] text-white/60 font-bold uppercase tracking-widest">
            High Performance
          </p>
        </div>
      </div>
    </aside>
  );
}
