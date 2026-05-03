import { AppShell } from "@/components/AppShell";
import { ImportBar } from "@/components/ImportBar";
import { useProperties } from "@/contexts/PropertiesContext";
import { Building2, Coins, Repeat2, TrendingUp, ArrowRight, Sparkles, Bed } from "lucide-react";
import { Link } from "react-router-dom";
import { formatBRL } from "@/lib/property-utils";

export default function Dashboard() {
  const { properties, credits, creditSystemEnabled } = useProperties();
  const totalValue = properties.reduce((s, p) => s + p.price, 0);
  const permutas = properties.filter(p => p.permuta.enabled).length;

  const stats = [
    { label: "Imóveis na carteira", value: properties.length, icon: Building2 },
    { label: "Valor total", value: formatBRL(totalValue), icon: TrendingUp },
    { label: "Aceitam permuta", value: permutas, icon: Repeat2 },
    ...(creditSystemEnabled ? [{ label: "Créditos restantes", value: credits, icon: Coins }] : []),
  ];

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto space-y-10">
        <section className="relative h-[90vh] min-h-[700px] flex items-center justify-center overflow-hidden rounded-[3rem] shadow-2xl mx-2 md:mx-0 mt-4 md:mt-0">
          {/* Dynamic Immersive Background */}
          <div 
            className="absolute inset-0 bg-cover bg-center transition-all duration-1000 transform hover:scale-[1.03]"
            style={{ 
              backgroundImage: `url(${properties[0]?.images[0] || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1920'})`,
            }}
          />
          
          {/* Deep Cinematic Overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/30 to-black/90" />
          
          <div className="relative z-10 w-full max-w-5xl px-8 text-center space-y-10">
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-12 duration-1000">
              <div className="inline-block bg-accent/20 backdrop-blur-md border border-accent/40 rounded-full px-8 py-2.5 text-accent font-bold uppercase tracking-[0.5em] text-[9px] shadow-sm">
                Luxury Real Estate Technology
              </div>
              <h1 className="text-6xl md:text-9xl font-bold text-white leading-[0.95] tracking-tighter drop-shadow-2xl">
                The New <br /> <span className="text-accent italic font-serif">Standard</span>.
              </h1>
              <p className="text-xl md:text-2xl text-white/60 max-w-3xl mx-auto font-medium leading-relaxed tracking-tight">
                A plataforma definitiva para extração, gestão e permuta de ativos exclusivos. <br className="hidden md:block" /> Inteligência de mercado com design internacional.
              </p>
            </div>
            
            <div className="max-w-2xl mx-auto pt-6 animate-in fade-in slide-in-from-bottom-16 duration-1000 delay-500">
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
            <div className="flex items-end justify-between border-b border-border pb-6 mb-8">
              <div className="space-y-1">
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Curadoria Exclusiva</h2>
                <p className="text-muted-foreground font-medium">Os ativos mais recentes da sua carteira inteligente.</p>
              </div>
              <Link to="/imoveis" className="text-sm font-bold text-accent hover:underline flex items-center gap-2 uppercase tracking-widest bg-accent/5 px-4 py-2 rounded-xl transition-all">
                Ver Portfólio <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {properties.slice(0, 2).map(p => (
                <Link 
                  key={p.id} 
                  to="/imoveis" 
                  className="group relative h-[450px] overflow-hidden rounded-[2rem] transition-all duration-500 hover:scale-[1.01] hover:shadow-2xl"
                >
                  <img 
                    src={p.images[0]} 
                    alt={p.title} 
                    className="h-full w-full object-cover transition-all duration-700 group-hover:scale-110" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                  
                  <div className="absolute bottom-8 left-8 right-8 text-white space-y-2">
                    <div className="flex gap-2">
                      {p.isExclusive && <span className="bg-accent text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">Exclusivo</span>}
                      <span className="bg-white/10 backdrop-blur-md border border-white/20 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">Alto Padrão</span>
                    </div>
                    <div className="text-3xl font-bold tracking-tight">{formatBRL(p.price)}</div>
                    <p className="text-white/80 font-medium line-clamp-1">{p.title}</p>
                    <div className="flex items-center gap-4 pt-4 text-xs font-bold uppercase tracking-wider text-white/60">
                      <span>{p.bedrooms} Quartos</span>
                      <span>•</span>
                      <span>{p.area}m²</span>
                      <span>•</span>
                      <span>{p.neighborhood}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            
            {properties.length > 2 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                {properties.slice(2, 6).map(p => (
                  <Link key={p.id} to="/imoveis" className="bg-card border border-border rounded-2xl overflow-hidden block group transition-smooth hover:scale-[1.02] shadow-sm">
                    <div className="aspect-video overflow-hidden">
                      <img src={p.images[0]} alt={p.title} className="h-full w-full object-cover transition-smooth group-hover:scale-110" />
                    </div>
                    <div className="p-3">
                      <div className="text-sm font-semibold truncate">{formatBRL(p.price)}</div>
                      <div className="text-xs text-muted-foreground truncate">{p.title}</div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </AppShell>
  );
}
