import { AppShell } from "@/components/AppShell";
import { ImportBar } from "@/components/ImportBar";
import { useProperties } from "@/contexts/PropertiesContext";
import { Building2, Coins, Repeat2, TrendingUp, ArrowRight, Sparkles, Bed } from "lucide-react";
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
      <div className="max-w-6xl mx-auto space-y-6">
        <section className="glass-strong rounded-3xl p-6 md:p-10 relative overflow-hidden">
          <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-gradient-primary opacity-20 blur-3xl animate-float" />
          <div className="relative">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Permutas Já</p>
            <h1 className="text-3xl md:text-5xl font-semibold mt-2 leading-tight">
              Importe um imóvel <span className="text-gradient">em segundos</span>.
            </h1>
            <p className="mt-3 text-muted-foreground max-w-xl">
              Cole o link de qualquer portal. Extraímos título, fotos, preço, área e tudo mais — pronto para a sua carteira.
            </p>
            <div className="mt-6 max-w-2xl">
              <ImportBar />
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {stats.map(({ label, value, icon: Icon }) => (
            <div key={label} className="glass rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{label}</span>
                <Icon className="h-4 w-4 text-accent" />
              </div>
              <div className="mt-2 text-2xl font-semibold">{value}</div>
            </div>
          ))}
        </section>

        {properties.length === 0 ? (
          <section className="glass-strong rounded-3xl p-10 text-center space-y-3">
            <div className="h-14 w-14 rounded-2xl bg-gradient-primary mx-auto grid place-items-center">
              <Building2 className="h-7 w-7 text-primary-foreground" />
            </div>
            <h3 className="text-xl font-semibold">Sua carteira está vazia</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Comece importando um link acima ou adicione um imóvel manualmente na aba Imóveis.
            </p>
            <Link to="/imoveis" className="inline-flex items-center gap-1 text-sm text-accent hover:underline">
              Ir para Imóveis <ArrowRight className="h-4 w-4" />
            </Link>
          </section>
        ) : (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Adicionados recentemente</h2>
              <Link to="/imoveis" className="text-sm text-accent hover:underline flex items-center gap-1">
                Ver todos <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {properties.slice(0, 4).map(p => (
                <Link key={p.id} to="/imoveis" className="glass rounded-2xl overflow-hidden block group transition-smooth hover:scale-[1.02]">
                  <div className="aspect-[4/3] overflow-hidden">
                    <img src={p.images[0]} alt={p.title} className="h-full w-full object-cover transition-smooth group-hover:scale-110" />
                  </div>
                  <div className="p-3">
                    <div className="text-sm font-semibold truncate">{formatBRL(p.price)}</div>
                    <div className="text-xs text-muted-foreground truncate">{p.title}</div>
                    <div className="flex items-center gap-3 pt-2 text-[10px] text-muted-foreground/80 border-t border-glass-border/50">
                      <span className="flex items-center gap-1"><Bed className="h-3 w-3" />{p.bedrooms}</span>
                      <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3" />{p.area}m²</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}
