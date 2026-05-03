import { AppShell } from "@/components/AppShell";
import { ImportBar } from "@/components/ImportBar";
import { useProperties } from "@/contexts/PropertiesContext";
import { Building2, Coins, Repeat2, TrendingUp, ArrowRight, Sparkles, Database, Settings } from "lucide-react";
import { PropertyCard } from "@/components/PropertyCard";
import { Link } from "react-router-dom";
import { formatBRL } from "@/lib/property-utils";
import ScraperManager from "@/components/ScraperManager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
      <div className="max-w-7xl mx-auto px-4 md:px-0">
        <Tabs defaultValue="overview" className="space-y-8">
          <div className="flex items-center justify-between border-b pb-4">
            <TabsList className="bg-transparent gap-8">
              <TabsTrigger 
                value="overview" 
                className="text-xs uppercase font-bold tracking-widest data-[state=active]:text-accent data-[state=active]:border-b-2 data-[state=active]:border-accent rounded-none bg-transparent"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger 
                value="scraper" 
                className="text-xs uppercase font-bold tracking-widest data-[state=active]:text-accent data-[state=active]:border-b-2 data-[state=active]:border-accent rounded-none bg-transparent"
              >
                Motor de Extração
              </TabsTrigger>
            </TabsList>
            <div className="hidden md:flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              <Settings className="h-3 w-3" /> System Status: <span className="text-green-500">Live</span>
            </div>
          </div>

          <TabsContent value="overview" className="space-y-12 animate-in fade-in duration-500">
            {/* HERO SECTION */}
            <section className="relative h-[80vh] min-h-[600px] flex items-center justify-center overflow-hidden rounded-[3rem] shadow-2xl group">
              <div 
                className="absolute inset-0 bg-cover bg-center transition-all duration-1000 transform group-hover:scale-[1.03]"
                style={{ 
                  backgroundImage: `url(${properties[0]?.images[0] || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1920'})`,
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/30 to-black/90" />
              
              <div className="relative z-10 w-full max-w-5xl px-8 text-center space-y-10">
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-12 duration-1000">
                  <div className="inline-block bg-accent/20 backdrop-blur-md border border-accent/40 rounded-full px-8 py-2.5 text-accent font-bold uppercase tracking-[0.5em] text-[9px] shadow-sm">
                    International Luxury Portfolios
                  </div>
                  <h1 className="text-6xl md:text-9xl font-bold text-white leading-[0.95] tracking-tighter drop-shadow-2xl">
                    The New <br /> <span className="text-accent italic font-serif">Standard</span>.
                  </h1>
                </div>
                
                <div className="max-w-2xl mx-auto pt-6 animate-in fade-in slide-in-from-bottom-16 duration-1000 delay-500">
                  <ImportBar />
                </div>
              </div>
            </section>
          </TabsContent>

          <TabsContent value="scraper" className="animate-in fade-in duration-500">
            <ScraperManager />
          </TabsContent>
        </Tabs>


        {/* CURATED PROPERTIES SECTION */}
        <section className="py-24 space-y-16">
          <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-border pb-12 gap-8">
            <div className="space-y-3">
              <h2 className="text-4xl md:text-7xl font-bold tracking-tighter">Curated <span className="italic font-serif text-accent">Assets</span>.</h2>
              <p className="text-xl text-muted-foreground font-medium max-w-2xl leading-relaxed">Uma seleção rigorosa dos ativos imobiliários mais exclusivos da sua carteira inteligente.</p>
            </div>
            <Link to="/imoveis" className="inline-flex items-center justify-center bg-accent text-white font-bold uppercase tracking-[0.2em] text-[10px] px-12 py-6 rounded-2xl shadow-2xl shadow-accent/30 hover:scale-105 transition-all">
              Explore All <ArrowRight className="ml-3 h-4 w-4" />
            </Link>
          </div>

          {properties.length === 0 ? (
            <div className="bg-white border border-border/50 rounded-[4rem] p-32 text-center space-y-6 shadow-sm">
              <div className="h-24 w-24 bg-accent/5 rounded-full mx-auto grid place-items-center">
                <Building2 className="h-12 w-12 text-accent" />
              </div>
              <h3 className="text-3xl font-bold tracking-tight">Portfólio em Branco</h3>
              <p className="text-muted-foreground max-w-md mx-auto text-xl italic font-serif">A sofisticação começa com a primeira extração de dados.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
              {properties.slice(0, 4).map(p => (
                <div key={p.id} className="space-y-6">
                  <PropertyCard property={p} onClick={() => {}} />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* EXPERIENCE SECTION (LIFESTYLE) */}
        <section className="relative h-[60vh] flex items-center justify-center overflow-hidden rounded-[3rem] mx-2 md:mx-0 shadow-xl group">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1920')] bg-cover bg-center group-hover:scale-105 transition-transform duration-1000" />
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />
          <div className="relative z-10 text-center space-y-6 max-w-3xl px-8">
            <Sparkles className="h-12 w-12 text-accent mx-auto" />
            <h2 className="text-4xl md:text-6xl font-bold text-white tracking-tighter leading-tight">
              Mais do que Imóveis. <br /> <span className="text-accent italic font-serif">Experiências de Vida</span>.
            </h2>
            <p className="text-lg md:text-xl text-white/70 font-medium">
              Elevamos o padrão da intermediação imobiliária através de tecnologia e sofisticação visual.
            </p>
          </div>
        </section>

        {/* TRUST / STATS SECTION */}
        <section className="py-24 grid grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map(({ label, value, icon: Icon }) => (
            <div key={label} className="text-center space-y-3 group">
              <div className="h-16 w-16 bg-white border border-border rounded-2xl mx-auto grid place-items-center shadow-sm group-hover:shadow-lg transition-all group-hover:-translate-y-1">
                <Icon className="h-6 w-6 text-accent" />
              </div>
              <div>
                <div className="text-3xl font-bold tracking-tighter">{value}</div>
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mt-1">{label}</div>
              </div>
            </div>
          ))}
        </section>

        {/* FINAL CTA SECTION */}
        <section className="bg-primary text-primary-foreground rounded-[3rem] p-12 md:p-24 text-center space-y-10 mb-12 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-accent/20 rounded-full -mr-32 -mt-32 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/10 rounded-full -ml-32 -mb-32 blur-3xl" />
          
          <div className="relative z-10 max-w-2xl mx-auto space-y-6">
            <h2 className="text-4xl md:text-6xl font-bold tracking-tighter leading-tight">
              Encontre o Ativo Ideal <br /> para sua Carteira.
            </h2>
            <p className="text-lg opacity-80 font-medium">
              Fale com um especialista agora e descubra como o Permutas Já pode transformar sua forma de negociar.
            </p>
            <div className="pt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
              <a 
                href="https://wa.me/55000000000" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-full sm:w-auto bg-accent text-white font-bold uppercase tracking-widest text-xs px-10 py-5 rounded-2xl shadow-xl shadow-black/20 hover:scale-105 transition-all"
              >
                Falar no WhatsApp
              </a>
              <Link 
                to="/imoveis" 
                className="w-full sm:w-auto bg-white/10 backdrop-blur-md border border-white/20 text-white font-bold uppercase tracking-widest text-xs px-10 py-5 rounded-2xl hover:bg-white/20 transition-all"
              >
                Ver Portfólio
              </Link>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

