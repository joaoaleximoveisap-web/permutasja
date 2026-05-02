import { AppShell } from "@/components/AppShell";
import { ImportBar } from "@/components/ImportBar";
import { useProperties } from "@/contexts/PropertiesContext";
import { Building2, Coins, Repeat2, TrendingUp, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { formatBRL } from "@/lib/property-utils";

export default function Dashboard() {
  const { properties, credits } = useProperties();
  const totalValue = properties.reduce((s, p) => s + p.price, 0);
  const permutas = properties.filter(p => p.permuta.enabled).length;

  const stats = [
    { label: "Imóveis na carteira", value: properties.length, icon: Building2 },
    { label: "Valor total", value: formatBRL(totalValue), icon: TrendingUp },
    { label: "Aceitam permuta", value: permutas, icon: Repeat2 },
    { label: "Créditos restantes", value: credits, icon: Coins },
  ];

  return (
    <AppShell>
      <div className="max-w-[1200px] mx-auto space-y-8 md:space-y-12">
        {/* Welcome Section */}
        <section className="relative overflow-hidden rounded-[2rem] bg-primary text-primary-foreground p-8 md:p-16">
          <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-accent/20 to-transparent pointer-events-none" />
          <div className="relative z-10 max-w-2xl space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-medium tracking-wider uppercase">
              <Sparkles className="h-3 w-3" /> Inteligência Imobiliária
            </div>
            <h1 className="text-4xl md:text-6xl font-bold leading-[1.1] tracking-tight">
              A nova era da <span className="text-accent">permuta</span> começa aqui.
            </h1>
            <p className="text-lg text-white/70 font-medium">
              Transforme links em oportunidades. Nossa IA extrai cada detalhe para você focar no que importa: o fechamento.
            </p>
            <div className="pt-4">
              <ImportBar />
            </div>
          </div>
        </section>

        {/* Stats Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {stats.map(({ label, value, icon: Icon }) => (
            <div key={label} className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 rounded-xl bg-muted">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</span>
              </div>
              <div className="text-3xl font-bold tracking-tight">{value}</div>
            </div>
          ))}
        </section>

        {/* Content Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold tracking-tight">Portfólio Recente</h2>
            <Link 
              to="/imoveis" 
              className="group flex items-center gap-2 text-sm font-semibold text-primary hover:text-accent transition-colors"
            >
              Ver todos <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          {properties.length === 0 ? (
            <div className="bg-muted/30 rounded-[2rem] border-2 border-dashed border-border p-12 md:p-20 text-center space-y-6">
              <div className="h-16 w-16 rounded-2xl bg-white shadow-xl mx-auto flex items-center justify-center">
                <Building2 className="h-8 w-8 text-primary" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold">Nenhum imóvel catalogado</h3>
                <p className="text-muted-foreground max-w-xs mx-auto text-sm font-medium">
                  Seu inventário está vazio. Importe seu primeiro imóvel usando a barra acima.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {properties.slice(0, 4).map(p => (
                <Link 
                  key={p.id} 
                  to="/imoveis" 
                  className="group bg-card rounded-2xl overflow-hidden border border-border/50 hover:shadow-2xl hover:-translate-y-1 transition-all duration-500"
                >
                  <div className="aspect-[4/3] overflow-hidden relative">
                    <img 
                      src={p.images[0]} 
                      alt={p.title} 
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" 
                    />
                    <div className="absolute top-4 left-4">
                      <span className="px-3 py-1 rounded-full bg-white/90 backdrop-blur-sm text-[10px] font-bold shadow-sm">
                        {p.type}
                      </span>
                    </div>
                  </div>
                  <div className="p-5 space-y-2">
                    <div className="text-xl font-bold tracking-tight text-primary">{formatBRL(p.price)}</div>
                    <div className="text-sm text-muted-foreground font-medium line-clamp-1">{p.title}</div>
                    <div className="flex items-center gap-3 pt-2 text-[11px] text-muted-foreground/80 border-t border-border/50">
                      <span className="flex items-center gap-1"><Bed className="h-3 w-3" />{p.bedrooms}</span>
                      <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3" />{p.area}m²</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
